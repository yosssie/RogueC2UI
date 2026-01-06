// ===========================
// ゲームメイン
// ===========================

import { Display } from './display.js';
import { InputManager } from './input.js';
import { Level } from './level.js';
import { DebugLevel } from './debug-level.js';
import { Player } from './player.js';
import { Monster } from './monster.js';
import { SpecialHit } from './spechit.js';
import { Item } from './item.js';
import { SaveManager } from './save.js';
import { ScoreManager } from './score.js';
import { TrapManager } from './trap.js';
import { RingManager } from './ring.js';
import { WandManager } from './wand.js';

// デバッグモードはタイトル画面で選択

class Game {
    constructor() {
        this.state = 'title'; // title, playing, menu, config, gameover
        this.display = new Display();
        this.input = new InputManager(this);
        this.saveManager = new SaveManager();
        this.scoreManager = new ScoreManager(this); // スコア管理
        this.trapManager = new TrapManager(this); // 罠管理
        this.ringManager = new RingManager(this); // 指輪管理
        this.wandManager = new WandManager(this); // 杖管理

        this.level = null;
        this.player = null;
        this.monsters = [];
        this.items = [];

        this.currentFloor = 1;
        this.turnCount = 0;
        this.debugMode = false; // デバッグモードフラグ

        this.init();
    }

    init() {
        console.log('🎮 Rogue Game Initialized');
        this.display.showScreen('title');
        this.input.init();

        // タイトル画面でEnterキー待ち
        this.waitForStart();
    }

    waitForStart() {
        console.log('⏳ Waiting for Enter or D key... (state:', this.state, ')');
        const handleStart = (e) => {
            console.log('🔑 Key pressed:', e.key, 'State:', this.state);
            if (this.state === 'title') {
                if (e.key === 'Enter') {
                    console.log('✅ Starting normal game!');
                    document.removeEventListener('keydown', handleStart);
                    this.debugMode = false;
                    this.startNewGame();
                } else if (e.key === 'd' || e.key === 'D') {
                    console.log('🔧 Starting debug game!');
                    document.removeEventListener('keydown', handleStart);
                    this.debugMode = true;
                    this.startNewGame();
                }
            }
        };
        document.addEventListener('keydown', handleStart);
    }

    startNewGame() {
        console.log('🚀 Starting new game...');
        this.state = 'playing';

        // ゲーム状態をリセット
        this.currentFloor = 1;
        this.turnCount = 0;
        this.monsters = [];
        this.items = [];
        this.WANDER_TIME = 120; // モンスター発生間隔

        // プレイヤー作成 (Rogue初期値: HP12, Str16)
        this.player = new Player('勇者', 12, 16);

        // 指輪効果をリセット (プレイヤー作成後に実行)
        this.ringManager.ringStats(false);

        // 初期装備 (init.c player_init 準拠)
        // 食料
        const food = new Item(':', 0, 0, 'food');
        this.player.addItem(food);

        // リングメイル (AC 3 -> +2 modifier in js definition? No, value is base AC reduction)
        // Rogue: RingMail(AC7) + 1 -> AC6.
        // My Item.js: RingMail value=3. If +1, value=4.
        // Item.js does not support enchantments yet. Using base items for now.
        const armor = new Item(']', 0, 0, 'ring_mail');
        // 簡易エンチャント表現（名前だけ変更とか）は未実装
        this.player.addItem(armor);
        this.player.equip(armor);

        // メイス
        const weapon = new Item(')', 0, 0, 'mace');
        this.player.addItem(weapon);
        this.player.equip(weapon);

        // 弓
        const bow = new Item(')', 0, 0, 'bow');
        this.player.addItem(bow);

        // 矢 (個数概念がまだないため、とりあえず1スタックとして追加)
        const arrow = new Item(')', 0, 0, 'arrow');
        // TODO: arrow.count = 25;
        this.player.addItem(arrow);


        // 最初のフロア生成
        this.generateFloor();

        // ゲーム画面表示
        this.display.showScreen('game');
        this.display.showMessage('ようこそ、運命の洞窟へ。イェンダーの魔除けを探し出せ!');
        this.updateDisplay();

        // ゲームループ開始
        this.gameLoop();
    }

    generateFloor() {
        console.log(`📍 Generating floor ${this.currentFloor}...`);

        if (this.debugMode) {
            console.log('🔧 DEBUG MODE: Using fixed dungeon layout');
            this.level = new DebugLevel(90, 30);
        } else {
            this.level = new Level(80, 22, this.currentFloor);
        }

        this.level.generate();

        // プレイヤーを配置
        // プレイヤーを配置
        // 有効な部屋を探す
        let validRooms = this.level.rooms.filter(r => r.is_room & 1); // R_ROOM = 1
        if (validRooms.length === 0) {
            // 万が一部屋がない場合は強制的に中央付近に通路を作るなどが必要だが、
            // 生成ロジック上必ず1つはあるはず。
            console.error('No valid rooms found!');
            // デバッグモード互換
            if (this.debugMode) validRooms = this.level.rooms;
        }

        const startRoom = validRooms[0]; // ランダムにするなら Math.random()
        this.player.x = startRoom.x + Math.floor(startRoom.w / 2); // 部屋の中央
        this.player.y = startRoom.y + Math.floor(startRoom.h / 2);

        // 初期視界を設定
        this.level.updateVisibility(this.player.x, this.player.y);


        // モンスター配置
        this.spawnMonsters();

        // アイテム配置
        this.spawnItems();

        // 罠配置 (trap.c add_traps())
        if (this.debugMode) {
            // デバッグモード - storage部屋の下段(y+3)に罠を配置
            const storage = this.level.rooms.find(r => r.id === 'storage');
            if (storage) {
                // 全6種類の罠を配置（見える状態）
                const py = storage.y + 3;
                for (let i = 0; i < 6; i++) {
                    const px = storage.x + 1 + i * 2; // 少し間隔を空けて配置
                    const trap = { trapType: i, row: py, col: px, hidden: false };
                    this.trapManager.traps.push(trap);
                }
            }
        } else {
            this.trapManager.addTraps(this.level, this.currentFloor);
        }
    }

    spawnMonsters() {
        this.monsters = [];

        if (this.debugMode) {
            // デバッグモード: 全種別モンスターを個室に配置
            this.level.rooms.forEach(room => {
                if (room.id && room.id.startsWith('monster_')) {
                    const type = room.id.split('_')[1];
                    // 部屋の中央に配置
                    const monster = new Monster(type, room.x + 2, room.y + 2);
                    // 最初は必ず寝かせる（部屋に入るまで起きないようにする）
                    monster.flags |= Monster.FLAGS.ASLEEP;
                    this.monsters.push(monster);
                }
            });
        } else {
            // 通常モード: ランダム配置 (階層レベル依存)
            // object.c put_mons: n = get_rand(4, 6)
            const numMonsters = 4 + Math.floor(Math.random() * 3);

            // この階層に出現可能なモンスター候補を作成
            const candidates = [];
            for (const [key, def] of Object.entries(Monster.definitions)) {
                if (this.currentFloor >= def.minLevel && this.currentFloor <= def.maxLevel) {
                    candidates.push(key);
                }
            }

            // 候補がなければ（深い階層とか未定義とか）、適当に強いやつを混ぜるか、強制的にコウモリ
            if (candidates.length === 0) candidates.push('B');

            const validRooms = this.level.rooms.filter(r => r.is_room & 1);

            for (let i = 0; i < numMonsters; i++) {
                if (validRooms.length === 0) break;
                const room = validRooms[Math.floor(Math.random() * validRooms.length)];
                const x = room.x + Math.floor(Math.random() * room.w);
                const y = room.y + Math.floor(Math.random() * room.h);

                if (this.level.isWalkable(x, y) && !this.isPositionOccupied(x, y)) {
                    const type = candidates[Math.floor(Math.random() * candidates.length)];
                    this.monsters.push(new Monster(type, x, y));
                }
            }
        }
    }

    spawnItems() {
        this.items = [];

        if (this.debugMode) {
            const storage = this.level.rooms.find(r => r.id === 'storage');
            if (storage) {
                let px = storage.x + 1;
                let py = storage.y + 1;

                // 全アイテム定義をフラットなリストにする
                // 定義順序: 武器, 防具, 薬, 巻物, 食料, 金貨, 杖, 指輪
                const symbols = [')', ']', '!', '?', ':', '*', '/', '='];

                symbols.forEach(symbol => {
                    const defs = Item.definitions[symbol];
                    if (defs) {
                        defs.forEach(def => {
                            // ID指定で作成し、識別済みにする
                            const item = new Item(symbol, px, py, def.id);
                            item.identified = true;
                            this.items.push(item);

                            px++;
                            // 折り返し (部屋の右端まで行ったら次の行へ)
                            if (px >= storage.x + storage.w - 1) {
                                px = storage.x + 1;
                                py++;
                            }
                        });
                    }
                });
            }
        } else {
            // 通常モード
            const itemCount = 5 + Math.floor(Math.random() * 3); // put_objects: 3-5 or so
            const validRooms = this.level.rooms.filter(r => r.is_room & 1);

            for (let i = 0; i < itemCount; i++) {
                if (validRooms.length === 0) break;
                const room = validRooms[Math.floor(Math.random() * validRooms.length)];
                const x = room.x + Math.floor(Math.random() * room.w);
                const y = room.y + Math.floor(Math.random() * room.h);

                if (this.level.isWalkable(x, y) && !this.isPositionOccupied(x, y)) {
                    // object.c gr_what_is: scroll 30%, potion 30%, wand 4%, weapon 10%, armor 9%, food 5%, ring 3%, gold 9%
                    const rand = Math.random() * 100;
                    let type = '*';
                    if (rand < 30) type = '?';          // 巻物 30%
                    else if (rand < 60) type = '!';     // 薬 30%
                    else if (rand < 70) type = ')';     // 武器 10%
                    else if (rand < 79) type = ']';     // 防具 9%
                    else if (rand < 84) type = ':';     // 食料 5%
                    else if (rand < 87) type = '=';     // 指輪 3%
                    // else 金貨 13%

                    this.items.push(new Item(type, x, y));
                }
            }
        }
    }

    isPositionOccupied(x, y) {
        if (this.player && this.player.x === x && this.player.y === y) return true;
        if (this.monsters.some(m => m.x === x && m.y === y)) return true;
        if (this.items.some(i => i.x === x && i.y === y)) return true;
        return false;
    }

    gameLoop() {
        // このゲームはターン制なので、常時ループではなく入力待ち
        // 入力処理はInputManagerで行う
    }

    handlePlayerAction(action) {
        if (this.state !== 'playing') return;

        let actionTaken = false;

        switch (action.type) {
            case 'move':
                actionTaken = this.movePlayer(action.dx, action.dy);
                break;
            case 'rest':
                // 休憩 (move.c rest()) - その場で待機してHP回復
                actionTaken = true;
                break;
            case 'rest_and_search':
                // 休憩 + 探索 (Aボタン用統合アクション)
                this.trapManager.search(1, false);
                return; // search内でprocessTurnを呼ぶ
            case 'search':
                // 探索 (trap.c search()) - 隠し扉・罠を探す
                this.trapManager.search(1, false);
                return; // search内でprocessTurnを呼ぶ
            case 'dash':
                // ダッシュ: 連続移動 (move.c multiple_move_rogue())
                if (action.dx !== undefined && action.dy !== undefined) {
                    this.dashPlayer(action.dx, action.dy);
                    return; // dashPlayer内でprocessTurnを呼ぶ
                }
                break;
            case 'use':
                actionTaken = this.useItem(action.index);
                break;
            case 'menu':
                this.openInventory();
                return;
            case 'menu':
                this.openMenu();
                return;
            case 'inventory':
                this.showInventory();
                return;
            case 'debug':
                this.display.toggleDebugMode();
                this.updateDisplay();
                return;
        }

        if (actionTaken) {
            this.processTurn();
        }
    }

    // move.c one_move_rogue
    movePlayer(dx, dy) {
        // 睡眠・凍結チェック
        if (this.player.status.sleep > 0) {
            this.display.showMessage('動けない！');
            return true; // ターン経過させる（麻痺中も時間は進む）
        }

        // 混乱チェック (move.c rndmove)
        if (this.player.status.confused > 0) {
            // ランダム移動
            const dirs = [
                { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
                { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
            ];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            dx = dir.x;
            dy = dir.y;
            // this.display.showMessage('足元がおぼつかない！'); // うるさいので省略可
        }

        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        // 1. 移動判定 (can_move) (壁、斜め制限)
        if (!this.level.isInBounds(newX, newY) ||
            !this.level.canMove(this.player.x, this.player.y, newX, newY)) {
            return false;
        }

        // 2. 状態異常チェック (held, bear_trap)
        // モンスターがいる場合は「攻撃」のみ可能
        const monster = this.monsters.find(m => m.x === newX && m.y === newY);
        if (this.player.held || this.trapManager.bearTrapTurns > 0) {
            if (!monster) {
                // 熊の罠チェック (isBearTrapped内でターン経過処理あり)
                if (this.trapManager.isBearTrapped()) {
                    return true; // ターン消費
                }
                if (this.player.held) {
                    this.display.showMessage('締め上げられていて動けない！');
                    return true; // ターン消費
                }
            }
        }

        // 3. モンスター攻撃
        if (monster) {
            this.resolveAttack(this.player, monster);
            return true; // ターン消費
        }

        // 4. 移動実行
        const oldX = this.player.x; // for tunnel check if needed
        const oldY = this.player.y;

        this.player.x = newX;
        this.player.y = newY;

        // 5. アイテム処理 (pick_up)
        const item = this.items.find(i => i.x === newX && i.y === newY);
        if (item) {
            // 浮遊チェックがあればここでスキップ
            if (this.player.addItem(item)) {
                this.items = this.items.filter(i => i !== item);
                this.display.showMessage(`${item.getDisplayName()}を拾った。`);
                // Rogue仕様: アイテムを拾ったらダッシュ停止 (STOPPED_ON_SOMETHING)
                // これはdashPlayerのnextToSomethingで検知される
            } else {
                this.display.showMessage('持ちものがいっぱいだ。');
            }
        }

        // 6. 罠判定 (trap_player)
        // 罠があれば発動。隠し罠なら表示される。
        this.trapManager.trapPlayer(newY, newX);

        return true; // ターン消費 (MOVED or STOPPED_ON_SOMETHING)
    }

    // ダッシュ (move.c multiple_move_rogue() 移植)
    async dashPlayer(dx, dy) {
        const maxSteps = 100;

        for (let i = 0; i < maxSteps; i++) {
            // 1. 移動を試みる (one_move_rogue)
            let moved = this.movePlayer(dx, dy);

            // 2. 移動失敗時: 通路の曲がり角チェック (bent_passage logic)
            // #if !defined( ORIGINAL ) int multiple_move_rogue(...)
            if (!moved) {
                const currentTile = this.level.getTile(this.player.x, this.player.y);
                // 通路(#)で、かつ斜め移動でない場合
                if (currentTile === '#' && dx * dy === 0) {
                    const newDir = this.findTurnDirection(dx, dy);
                    if (newDir) {
                        dx = newDir.x;
                        dy = newDir.y;
                        moved = this.movePlayer(dx, dy); // 新しい方向へ移動
                    }
                }
            }

            // 3. それでも動けなかったら終了
            if (!moved) break;

            // 4. ターン処理と画面更新
            this.processTurn();
            this.updateDisplay();

            // 死亡チェック
            if (this.player.hp <= 0) break;

            // アニメーションウェイト
            await new Promise(r => setTimeout(r, 5));

            // 5. 停止条件チェック (next_to_something)
            // 移動後の位置で周囲をチェック
            // 分岐点、モンスター、アイテム、階段、ドア等があれば停止
            if (this.nextToSomething(dx, dy)) {
                break;
            }
        }
    }

    // move.c bent_passage logic
    findTurnDirection(currentDx, currentDy) {
        // hjkl (Left, Down, Up, Right)
        const dirs = [
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
            { x: 1, y: 0 }
        ];

        let validDirs = [];
        const px = this.player.x;
        const py = this.player.y;

        for (let i = 0; i < 4; i++) {
            const d = dirs[i];

            // 逆方向（来た道）は除外
            // move.c: dirch != dir[3 - i] (opposite check)
            if (currentDx === -d.x && currentDy === -d.y) continue;

            const nx = px + d.x;
            const ny = py + d.y;

            // 通行可能かチェック (is_passable + diagonal logic check)
            if (this.level.canMove(px, py, nx, ny)) {
                validDirs.push(d);
            }
        }

        // 行ける方向が唯一(n=1)の場合のみ、その方向を返す
        if (validDirs.length === 1) {
            return validDirs[0];
        }

        return null;
    }

    nextToSomething(dx, dy) {
        const px = this.player.x;
        const py = this.player.y;

        // 1. 進行方向に何かあるか？（移動前にチェックすべきだが、ループ構造上ここでチェック）
        // movePlayer呼ぶ前にチェックすべきだったが、dashPlayerのループ順序を調整する。
        // -> dashPlayer内で movePlayer を呼ぶ前に nextToCheck を呼ぶ形が良いが、
        // 最初の1歩は無条件（Rogue仕様）なので、2歩目以降の movePlayer 前に呼ぶのが正しい。
        // 上記 dashPlayer は movePlayer -> check -> movePlayer... となっているので、
        // check は「次の移動のためのチェック」として機能する。

        // 進行方向のチェック
        const nx = px + dx;
        const ny = py + dy;
        if (this.isPositionOccupied(nx, ny) || !this.level.isWalkable(nx, ny)) {
            // 進行方向が塞がっている（敵、壁）なら止まる
            // ただし壁は movePlayer が false を返すのでそちらに任せてもよいが、
            // 敵の場合は攻撃してしまうのでここで止める必要がある。
            if (this.monsters.some(m => m.x === nx && m.y === ny)) return true;
        }

        // 周囲8マスチェック
        for (let y = -1; y <= 1; y++) {
            for (let x = -1; x <= 1; x++) {
                if (x === 0 && y === 0) continue;

                const cx = px + x;
                const cy = py + y;

                // 範囲外スキップ
                if (!this.level.isInBounds(cx, cy)) continue;

                // レンダリング上見えてないものは無視すべきだが、内部データで判定

                const tile = this.level.getTile(cx, cy);
                const hasMonster = this.monsters.some(m => m.x === cx && m.y === cy);
                const hasItem = this.items.some(i => i.x === cx && i.y === cy);
                const isStairs = (tile === '%');
                const isDoor = (tile === '+');
                const isTrap = false; // TODO

                // 進行方向の逆（来た道）にある「通路」は無視するが、アイテムやモンスターは無視しない
                const isReverse = (x === -dx && y === -dy);

                // モンスター・アイテム・階段・罠
                // 進行方向以外にある場合、止まる
                // 進行方向にある場合は上の個別チェックで止まるが、ここでも検出される
                // 来た道にあるアイテム等は無視しないと、アイテム上を通過した後にまた止まってしまう？
                // Rogueは「アイテムに乗ったら」止まる。
                if (hasMonster) {
                    // 来た道でもモンスターいたら止まる（追われてるかも）
                    return true;
                }

                if ((hasItem || isStairs || isTrap) && !isReverse) {
                    // 進行方向にある、または横にあるなら止まる
                    return true;
                }

                // ドア: 隣接したら止まる (ただし来た道は無視)
                if (isDoor && !isReverse) return true;
            }
        }

        // 通路の分岐チェック（通路にいる場合のみ）
        const currentTile = this.level.getTile(px, py);
        if (currentTile === '#') {
            // 直進可能か？
            const canGoStraight = this.level.isWalkable(px + dx, py + dy);

            // 左右（進行方向に対して90度）に通路があるか？
            let sidePassages = 0;
            if (dx !== 0 && dy === 0) { // 横移動中
                if (this.isPassage(px, py - 1)) sidePassages++;
                if (this.isPassage(px, py + 1)) sidePassages++;
            }
            if (dx === 0 && dy !== 0) { // 縦移動中
                if (this.isPassage(px - 1, py)) sidePassages++;
                if (this.isPassage(px + 1, py)) sidePassages++;
            }

            // 分岐点ロジック:
            // 1. 直進できて、かつ横道がある -> 分岐なので止まる
            // 2. 直進できなくて、横道が2つ（T字路） -> 分岐なので止まる
            // 3. 直進できなくて、横道が1つ -> 角なので止まらない（dashPlayerで曲がる）

            if (canGoStraight && sidePassages > 0) return true;
            if (!canGoStraight && sidePassages > 1) return true;

        } else if (currentTile === '.') {
            // 部屋の中：
            // 入り口（ドア）に入ったら止まる -> 上の isDoor チェックでカバー
            // 基本的に部屋の中ではダッシュは壁まで止まらない（Rogue仕様）
            // ただし、暗い部屋の仕様などによる。
        }

        return false;
    }

    isPassage(x, y) {
        const t = this.level.getTile(x, y);
        return t === '#' || t === '+';
    }
    processTurn() {
        this.turnCount++;

        // モンスターの行動
        for (const monster of this.monsters) {
            // ステータス持続時間処理
            if (monster.sleepTurns > 0) {
                monster.sleepTurns--;
                if (monster.sleepTurns <= 0) {
                    monster.removeFlag(Monster.FLAGS.ASLEEP);
                    // this.display.showMessage(`${monster.name}は目を覚ました！`); // うるさいので省略可
                }
            }
            if (monster.confusedTurns > 0) {
                monster.confusedTurns--;
                if (monster.confusedTurns <= 0) {
                    monster.removeFlag(Monster.FLAGS.CONFUSED);
                    this.display.showMessage(`${monster.name}の混乱は解けた。`);
                }
            }

            // プレイヤーが死んでいたらモンスターの行動を中止
            if (this.player.hp <= 0) break;

            // プレイヤーに隣接しているかチェック
            const dx = Math.abs(monster.x - this.player.x);
            const dy = Math.abs(monster.y - this.player.y);
            const isAdjacent = (dx <= 1 && dy <= 1);

            // 視界チェック (簡易)
            const canSee = this.level.isLineOfSight(monster.x, monster.y, this.player.x, this.player.y);

            // 睡眠判定 (ASLEEP)
            if (monster.hasFlag(Monster.FLAGS.ASLEEP)) {
                // 部屋に入ったら起きる (room check)
                // 隣接したら起きる (dx<=1 && dy<=1)
                // 攻撃を受けたら起きる (resolveAttack内で処理すべきだが、ここでは自然覚醒のみ)

                const mRoom = this.level.getRoomAt(monster.x, monster.y);
                const pRoom = this.level.getRoomAt(this.player.x, this.player.y);

                const sameRoom = (mRoom && pRoom && mRoom === pRoom);
                const adjacent = (dx <= 1 && dy <= 1);

                if (sameRoom || adjacent) {
                    // 起きる
                    monster.flags &= ~Monster.FLAGS.ASLEEP;
                    // 初回のみメッセージでもいいが、うるさいので省略するか、部屋に入った時だけ出すか
                    // Rogueでは "The <monster> wakes up."
                    // this.display.showMessage(`${monster.name}が目を覚ました！`); 
                } else {
                    // 寝ているのでこのターンは行動しない
                    continue;
                }
            }

            // 斜め攻撃もありなら <= 1 で判定 (dx<=1 && dy<=1 && !(dx=0,dy=0))
            if (dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0)) {
                // 攻撃
                this.resolveAttack(monster, this.player);
            } else {
                // 移動 (他のモンスターとの衝突判定を渡す)
                monster.act(this.player, this.level, this.monsters);
            }
        }

        // プレイヤーが生きている場合のみ空腹度処理
        if (this.player.hp > 0) {
            const hungerAmount = 1 + this.ringManager.getHungerModifier();
            const hungerMsg = this.player.updateHunger(Math.max(0, hungerAmount));
            if (hungerMsg) {
                this.display.showMessage(hungerMsg);
            }

            // HP自動回復 (move.c heal())
            this.player.regenerateHP();

            // 餓死チェック
            if (this.player.hp <= 0) {
                this.gameOver(null, this.scoreManager.DEATH_CAUSES.STARVATION);
                return;
            }

            // ステータス更新
            this.updatePlayerStatus();

            // 指輪効果処理 (ring.c ring_stats())
            this.ringManager.processTurnEffects();

            // 時間経過によるモンスター発生 (wanderer) (120ターン毎)
            // Rogue: roll(1, 100) < 70
            if (this.turnCount % this.WANDER_TIME === 0) {
                // 最大数制限(20くらい)
                if (this.monsters.length < 20 && Math.random() < 0.7) {
                    this.spawnWanderingMonster();
                }
            }
        }

        // 画面更新
        this.updateDisplay();
    }

    spawnWanderingMonster() {
        // 現在の階層に適したモンスターを取得
        const MonsterClass = Monster; // Import参照
        const type = MonsterClass.getRandomMonster(this.currentFloor);
        if (!type) return;

        // 出現位置を探す
        // Rogue仕様: プレイヤーと同じ部屋には出ない。通路か、別の部屋。
        let attempts = 0;
        let x, y;
        while (attempts < 50) {
            // ランダムな部屋
            const room = this.level.rooms[Math.floor(Math.random() * this.level.rooms.length)];

            // プレイヤーがいる部屋は避ける（簡易判定：プレイヤーも部屋にいる場合）
            const playerRoom = this.level.getRoomAt(this.player.x, this.player.y);
            if (playerRoom && playerRoom === room) {
                attempts++;
                continue;
            }

            x = room.x + Math.floor(Math.random() * room.w);
            y = room.y + Math.floor(Math.random() * room.h);

            if (this.level.isWalkable(x, y) && !this.isPositionOccupied(x, y)) {
                // 生成成功
                const monster = new MonsterClass(type, x, y);
                // WANDERERフラグなどがあればここで設定するが、デフォルトでOK
                // Rogueでは湧いたモンスターは WANDERS フラグを持つことが多い
                monster.addFlag(MonsterClass.FLAGS.WANDERS);
                this.monsters.push(monster);
                // this.display.showMessage('気配を感じる...'); // デバッグ用
                break;
            }
            attempts++;
        }
    }

    updatePlayerStatus() {
        // 指輪の筋力ボーナス反映
        const strBonus = this.ringManager.getStrengthBonus();
        this.player.updateStrength(strBonus);

        const status = this.player.status;

        // 混乱
        if (status.confused > 0) {
            status.confused--;
            if (status.confused <= 0) {
                this.display.showMessage("気がしっかりした。");
            }
        }

        // 盲目
        if (status.blind > 0) {
            status.blind--;
            if (status.blind <= 0) {
                this.display.showMessage("目が見えるようになった。");
            }
        }

        // 幻覚
        if (status.hallucinating > 0) {
            status.hallucinating--;
            if (status.hallucinating <= 0) {
                this.display.showMessage("周りのものがはっきり見えるようになった。");
            }
        }

        // 睡眠/凍結 (行動不能)
        if (status.sleep > 0) {
            status.sleep--;
            if (status.sleep <= 0) {
                this.display.showMessage("動けるようになった。");
            }
        }

        // 浮遊
        if (status.levitate > 0) {
            status.levitate--;
            if (status.levitate <= 0) {
                this.display.showMessage("地面に降り立った。");
            }
        }

        // 加速
        if (status.fast > 0) {
            status.fast--;
            if (status.fast <= 0) {
                this.display.showMessage("動きが普通に戻った。");
            }
        }

        // 透明視認 (ポーション)
        if (typeof status.seeInvisible === 'number' && status.seeInvisible > 0) {
            status.seeInvisible--;
        }

        // モンスター感知 (ポーション) - メッセージは出さないが効果切れ
        if (typeof status.detectMonster === 'number' && status.detectMonster > 0) {
            status.detectMonster--;
        }
    }

    // combatメソッドは廃止(resolveAttackに統合)

    pickupItem() {
        const item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
        if (item) {
            this.player.addItem(item);
            this.items = this.items.filter(i => i !== item);
            this.display.showMessage(`${item.getDisplayName()}を拾った。`);
            return true;
        } else {
            this.display.showMessage('ここには何もない。');
            return false;
        }
    }

    updateDisplay() {
        this.level.updateVisibility(this.player.x, this.player.y);

        let targetInfo = null;
        if (this.state === 'targeting' && this.targetDirection) {
            targetInfo = {
                x: this.player.x + this.targetDirection.x,
                y: this.player.y + this.targetDirection.y
            };
        }

        this.display.renderDungeon(this.level, this.player, this.monsters, this.items, targetInfo, this.trapManager);
        this.display.updateStatus(this.player, this.currentFloor);
        this.display.updateInventory(this.player.inventory, this.player);

        // インベントリ画面ならカーソルを再適用
        if (this.state === 'inventory') {
            this.display.updateInventoryCursor(this.inventoryIndex);
        }

        this.display.updateDebugInfo(this); // デバッグ情報更新
    }

    // ===========================
    // メニュー・インベントリ操作
    // ===========================

    openInventory() {
        if (this.player.inventory.length === 0) {
            this.display.showMessage('持ち物がない。');
            return;
        }
        this.state = 'inventory';
        this.inventoryIndex = 0;
        this.display.updateInventoryCursor(this.inventoryIndex);
        this.display.showMessage('持ち物を選択中... (A:決定, B:戻る)');
    }

    closeInventory() {
        this.state = 'playing';
        this.display.updateInventoryCursor(-1); // カーソル消去
        this.display.showMessage('');
    }

    moveInventoryCursor(delta) {
        const len = this.player.inventory.length;
        if (len === 0) return;
        this.inventoryIndex = (this.inventoryIndex + delta + len) % len;
        this.display.updateInventoryCursor(this.inventoryIndex);
    }

    selectInventoryItem() {
        if (this.player.inventory.length === 0) return;
        this.openSubMenu();
    }

    sortInventory() {
        if (this.player.inventory.length === 0) return;

        this.player.inventory.sort((a, b) => {
            return a.getSortOrder() - b.getSortOrder();
        });

        // 描画更新
        if (this.state === 'inventory') {
            this.display.updateInventory(this.player.inventory, this.player);
            this.display.updateInventoryCursor(this.inventoryIndex);
        }
        this.display.showMessage('持ち物を整頓しました。');
    }

    // ===========================
    // サブメニュー操作
    // ===========================

    openSubMenu() {
        this.state = 'submenu';
        this.subMenuIndex = 0;
        const item = this.player.inventory[this.inventoryIndex];

        // アイテム種別に応じたアクション定義
        this.subMenuOptions = [];

        // 装備品 (武器・防具)
        if (item.type === 'weapon' || item.type === 'armor') {
            const isEquipped = (this.player.weapon === item || this.player.equippedArmor === item);
            if (isEquipped) {
                this.subMenuOptions.push({ label: '外す', action: 'unequip' });
            } else {
                this.subMenuOptions.push({ label: '装備', action: 'equip' });
            }
        }
        // 指輪
        else if (item.type === 'ring') {
            const isEquipped = (this.player.leftRing === item || this.player.rightRing === item);
            if (isEquipped) {
                this.subMenuOptions.push({ label: '外す', action: 'unequip_ring' });
            } else {
                // 両手空いている場合は選択
                if (!this.player.leftRing && !this.player.rightRing) {
                    this.subMenuOptions.push({ label: '装備（左手）', action: 'equip_ring_left' });
                    this.subMenuOptions.push({ label: '装備（右手）', action: 'equip_ring_right' });
                } else if (!this.player.leftRing) {
                    this.subMenuOptions.push({ label: '装備（左手）', action: 'equip_ring_left' });
                } else if (!this.player.rightRing) {
                    this.subMenuOptions.push({ label: '装備（右手）', action: 'equip_ring_right' });
                } else {
                    // 両手埋まっている
                    this.subMenuOptions.push({ label: '装備（両手埋まっている）', action: 'none' });
                }
            }
        }
        // 薬
        else if (item.type === 'potion') {
            this.subMenuOptions.push({ label: '飲む', action: 'use' });
        }
        // 巻物
        else if (item.type === 'scroll') {
            this.subMenuOptions.push({ label: '読む', action: 'use' });
        }
        // 杖
        else if (item.type === 'wand') {
            this.subMenuOptions.push({ label: '振る', action: 'zap' });
        }
        // 食料
        else if (item.type === 'food') {
            this.subMenuOptions.push({ label: '食べる', action: 'use' });
        }
        // その他
        else {
            this.subMenuOptions.push({ label: '使う', action: 'use' });
        }

        // 共通アクション
        this.subMenuOptions.push({ label: '置く', action: 'drop' });
        this.subMenuOptions.push({ label: '投げる', action: 'throw' });
        this.subMenuOptions.push({ label: 'やめる', action: 'cancel' });

        // 表示位置計算 (選択中アイテムの高さに合わせる)
        // display.js からDOM要素位置を取得するのは面倒なので、簡易的に固定位置か
        // displayクラスに任せる
        // ここでは display.showSubMenu に任せる。位置は display クラス側でリスト要素から計算する手もあるが
        // 簡略化のため、画面中央あるいは右パネルの左側に出す
        // 右パネルは width: 250px くらい。画面幅 72rem (約1152px)。
        // 右端から 300px, 上から 適当な位置
        const x = 800; // display.jsで無視される
        const y = 100 + (this.inventoryIndex * 24); // 簡易計算

        this.display.showSubMenu(x, y, this.subMenuOptions, this.subMenuIndex);
    }

    closeSubMenu() {
        this.state = 'inventory';
        this.display.hideSubMenu();
    }

    moveSubMenuCursor(delta) {
        const len = this.subMenuOptions.length;
        this.subMenuIndex = (this.subMenuIndex + delta + len) % len;
        // 再描画
        const x = 800;
        const y = 100 + (this.inventoryIndex * 24);
        this.display.showSubMenu(x, y, this.subMenuOptions, this.subMenuIndex);
    }

    selectSubMenuOption() {
        const option = this.subMenuOptions[this.subMenuIndex];
        const item = this.player.inventory[this.inventoryIndex];

        switch (option.action) {
            case 'use':
                this.closeSubMenu(); // サブメニュー閉じる
                // アイテム使用処理
                const success = this.useItem(this.inventoryIndex);
                if (success) {
                    this.closeInventory();
                    this.processTurn();
                }
                break;
            case 'equip':
                this.closeSubMenu();
                this.player.equip(item);
                this.display.showMessage(`${item.getDisplayName()}を装備した。`);
                // 装備状態が変わったので再描画
                this.display.updateInventory(this.player.inventory, this.player);
                this.processTurn();
                break;
            case 'unequip':
                this.closeSubMenu();
                this.player.unequip(item);
                this.display.showMessage(`${item.getDisplayName()}を外した。`);
                this.display.updateInventory(this.player.inventory, this.player);
                this.processTurn();
                break;
            case 'equip_ring_left':
                this.closeSubMenu();
                if (this.ringManager.putOnRing(item, 'left')) {
                    this.display.updateInventory(this.player.inventory, this.player);
                    this.processTurn();
                }
                break;
            case 'equip_ring_right':
                this.closeSubMenu();
                if (this.ringManager.putOnRing(item, 'right')) {
                    this.display.updateInventory(this.player.inventory, this.player);
                    this.processTurn();
                }
                break;
            case 'unequip_ring':
                this.closeSubMenu();
                const hand = (this.player.leftRing === item) ? 'left' : 'right';
                if (this.ringManager.removeRing(hand)) {
                    this.display.updateInventory(this.player.inventory, this.player);
                    this.processTurn();
                }
                break;
            case 'drop':
                this.closeSubMenu();
                if (this.dropItem(this.inventoryIndex)) {
                    this.closeInventory();
                    this.processTurn();
                }
                break;
                break;
            case 'throw':
                this.closeSubMenu();
                this.pendingAction = 'throw'; // アクションタイプを記録
                this.startTargeting(this.inventoryIndex);
                break;
            case 'zap':
                this.closeSubMenu();
                this.pendingAction = 'zap'; // アクションタイプを記録
                this.startTargeting(this.inventoryIndex);
                break;
            case 'cancel':
            case 'none':
                this.closeSubMenu();
                break;
        }
    }

    openMenu() {
        this.state = 'menu';
        // メニューオプションの定義
        this.menuOptions = ['items', 'ground', 'suspend'];
        this.menuIndex = 0;
        this.display.showScreen('menu');
        this.display.updateMenuCursor(this.menuIndex);
    }

    closeMenu() {
        this.state = 'playing';
        this.display.showScreen('game');
    }

    moveMenuCursor(delta) {
        this.menuIndex = (this.menuIndex + delta + this.menuOptions.length) % this.menuOptions.length;
        this.display.updateMenuCursor(this.menuIndex);
    }

    selectMenuOption() {
        const action = this.menuOptions[this.menuIndex];

        // とりあえずメニューを閉じてからアクション実行
        // 将来的にはサブメニューを開くかもしれない

        switch (action) {
            case 'items':
                this.closeMenu();
                this.showInventory();
                break;
            case 'ground':
                this.closeMenu();
                // 足元チェック
                const item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
                const tile = this.level.getTile(this.player.x, this.player.y);
                if (item) {
                    this.display.showMessage(`${item.getDisplayName()} (足元)`);
                } else if (tile === '%') {
                    this.display.showMessage(`階段がある。(>キーで降りる)`);
                } else {
                    this.display.showMessage(`足元には何もない。`);
                }
                break;
            case 'suspend':
                this.closeMenu();
                this.display.showMessage('中断機能は未実装です。');
                break;
        }
    }

    showInventory() {
        if (this.player.inventory.length === 0) {
            this.display.showMessage('インベントリは空です。');
        } else {
            const items = this.player.inventory.map((item, index) =>
                `${index + 1}:${item.getDisplayName()}`
            ).join(', ');
            this.display.showMessage(`インベントリ: ${items} (数字キーで使用)`);
        }
    }

    useItem(index) {
        if (index < 0 || index >= this.player.inventory.length) {
            this.display.showMessage('そのアイテムは持っていない。');
            return false;
        }

        const item = this.player.inventory[index];
        // item.useに game (this) を渡して、マップ更新などを可能にする
        const message = item.use(this.player, this);
        this.display.showMessage(message);

        // 使い捨てアイテムは消費
        // 新しいItemクラスでは category ではなく type を使用
        if (['potion', 'scroll', 'food'].includes(item.type)) {
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                this.player.inventory.splice(index, 1);
            }
        }

        return true;
    }

    dropItem(index) {
        if (index < 0 || index >= this.player.inventory.length) return false;

        // 足元チェック
        const existingItem = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
        if (existingItem) {
            this.display.showMessage('足元には既にアイテムがある。');
            return false;
        }

        const item = this.player.inventory[index];

        // 装備中なら外す
        this.player.unequip(item);

        let droppedItem = item;

        // スタック処理:
        // オリジナルRogue (pack.c drop) では、武器(矢含む)は一括ドロップ、それ以外は1個ずつドロップ
        if (item.quantity > 1 && item.type !== 'weapon') {
            item.quantity--;
            droppedItem = item.clone();
        } else {
            // インベントリから削除（一括ドロップ）
            this.player.inventory.splice(index, 1);
        }

        // 足元に配置
        droppedItem.x = this.player.x;
        droppedItem.y = this.player.y;
        this.items.push(droppedItem);

        this.display.showMessage(`${droppedItem.getDisplayName()}を置いた。`);
        return true;
    }

    // ===========================
    // 投げる・ターゲット処理
    // ===========================

    startTargeting(itemIndex) {
        this.state = 'targeting';
        this.targetingItemIndex = itemIndex;
        // 初期ターゲットは下方向
        this.targetDirection = { x: 0, y: 1 };
        this.display.showMessage('方角は？');
        this.updateDisplay();
    }

    updateTarget(dx, dy) {
        if (dx === 0 && dy === 0) return;
        this.targetDirection = { x: dx, y: dy };
        this.updateDisplay();
    }

    confirmThrow() {
        const index = this.targetingItemIndex;
        if (index < 0 || index >= this.player.inventory.length) {
            this.cancelTargeting();
            return;
        }

        this.state = 'playing'; // 先に戻す(processTurnでの再描画時にカーソルを消すため)

        if (this.pendingAction === 'zap') {
            this.zapWand(index);
        } else {
            this.throwItem(index); // pendingAction === 'throw' or undefined
        }

        this.pendingAction = null; // リセット
    }

    zapWand(index) {
        const item = this.player.inventory[index];
        const dx = this.targetDirection.x;
        const dy = this.targetDirection.y;

        // 方向ベクトルをRogue方向(0-7)に変換
        // [-1, 0] 上(0), [-1, 1] 右上(1), [0, 1] 右(2), ...
        let dir = -1;
        if (dy === -1 && dx === 0) dir = 0;
        else if (dy === -1 && dx === 1) dir = 1;
        else if (dy === 0 && dx === 1) dir = 2;
        else if (dy === 1 && dx === 1) dir = 3;
        else if (dy === 1 && dx === 0) dir = 4;
        else if (dy === 1 && dx === -1) dir = 5;
        else if (dy === 0 && dx === -1) dir = 6;
        else if (dy === -1 && dx === -1) dir = 7;

        if (dir !== -1) {
            if (this.wandManager.zap(item, dir)) {
                this.processTurn();
            }
        } else {
            this.display.showMessage('無効な方向です。');
        }
    }

    cancelTargeting() {
        this.state = 'inventory'; // インベントリに戻るか、playingに戻るか。インベントリが無難か。
        this.display.showMessage('やめた。');
        this.updateDisplay();
        // インベントリ閉じるなら
        this.closeInventory();
    }

    throwItem(index) {
        const item = this.player.inventory[index];
        const dx = this.targetDirection.x;
        const dy = this.targetDirection.y;

        let thrownItem = item;

        // 装備中なら外す
        this.player.unequip(item); // 装備しているものを投げると外れる

        // スタック処理: 1個だけ投げる
        if (item.quantity > 1) {
            item.quantity--;
            thrownItem = item.clone();
        } else {
            // インベントリから削除
            this.player.inventory.splice(index, 1);
        }

        this.display.showMessage(`${thrownItem.getDisplayName()}を投げた！`);

        // 軌道計算 (Rogueは最大24歩)
        let cx = this.player.x;
        let cy = this.player.y;
        let hitMonster = null;
        let blocked = false;

        // Rogue: get_thrown_at_monster logic
        for (let i = 0; i < 24; i++) {
            const nx = cx + dx;
            const ny = cy + dy;

            // 壁判定 (nothing or wall/hidden)
            if (!this.level.isWalkable(nx, ny)) {
                blocked = true;
                break; // 壁に当たったらその手前(cx,cy)で止まる
            }

            // モンスター判定
            const monster = this.monsters.find(m => m.x === nx && m.y === ny);
            if (monster) {
                hitMonster = monster;
                cx = nx;
                cy = ny;
                break;
            }

            cx = nx;
            cy = ny;
        }

        let itemLost = false;

        if (hitMonster) {
            // モンスターに命中判定
            const hit = this.throwAtMonster(hitMonster, thrownItem);
            if (hit) {
                itemLost = true; // 命中したらアイテムは消滅 (Rogue仕様)
            } else {
                // 外れたらアイテムはモンスターの足元(cx,cy)に落ちる
                this.display.showMessage('はずれた。');
            }
        }

        // アイテムが消滅していないなら、最後に到達した地点(cx, cy)に落ちる
        if (!itemLost) {
            this.flopWeapon(thrownItem, cx, cy);
        }

        this.processTurn();
    }

    throwAtMonster(monster, item) {
        // 命中・ダメージ計算 (throw.c / hit.c 簡易再現)

        // 1. 命中率 (hit_chance)
        // 本来は Dex, Level, Weapon Bonus 等見るが、とりあえず基礎値 + Dex補正
        let hitChance = 50 + (this.player.level * 2);

        // 弓矢ボーナス (Arrow + Bow)
        const isArrow = (item.id === 'arrow');
        const hasBow = (this.player.weapon && this.player.weapon.id === 'bow');

        if (isArrow && hasBow) {
            hitChance += 30;
        }
        // 投擲武器ボーナス (Dagger/Shuriken/Dart) -> 未実装IDだがロジックのみ
        else if (['dart', 'dagger', 'shuriken'].includes(item.id)) {
            hitChance += 20;
        }

        // 2. ダメージ計算
        let damage = 1;
        // アイテム定義のダメージダイスを使用
        // 本来は throw.c get_weapon_damage だが、Item.value (1d2など) をパース
        // ここではPlayer.attackのロジックを借用したいが、Player依存ではないので簡易パース
        if (typeof item.value === 'string' && item.value.includes('d')) {
            const [count, faces] = item.value.split('d').map(Number);
            for (let k = 0; k < count; k++) damage += Math.floor(Math.random() * faces);
        } else {
            damage = 1; // 石とか
        }

        // ボーナスダメージ
        if (isArrow && hasBow) {
            // damage += bow's damage
            // damage = damage * 2 / 3 (Rogue仕様...あれ、減るの？いや、合計してから補正か)
            // throw.c: damage += get_weapon_damage(rogue.weapon); damage = ((damage * 2) / 3);
            damage += 2; // 弓のダメージ(適当)
            damage = Math.floor(damage * 2 / 3);
        } else if (['dart', 'dagger', 'shuriken'].includes(item.id)) {
            damage = Math.floor(damage * 3 / 2);
        }

        // 3. 判定
        if (Math.random() * 100 < hitChance) {
            // 命中
            this.display.showMessage(`${monster.name}に当たった！`);
            monster.takeDamage(damage);
            if (monster.isDead()) {
                this.display.showMessage(`${monster.name}を倒した!`);
                this.monsters = this.monsters.filter(m => m !== monster);
                this.player.gainExp(monster.exp);
            }
            return true;
            return false;
        }
    }

    flopWeapon(item, x, y) {
        // アイテムをマップ上に配置
        item.x = x;
        item.y = y;
        this.items.push(item);
    }

    // 戦闘解決 (hit.c / fight.c 再現)
    resolveAttack(attacker, defender) {
        let hitChance = 0;
        let damage = 0;
        let message = '';
        const isPlayerAttacking = (attacker === this.player);

        if (isPlayerAttacking) {
            // --- プレイヤーの攻撃 (rogue_hit) ---

            // 1. 命中率計算 (get_hit_chance)
            // 基礎値40 + レベル*2 + STR補正 + 武器補正
            hitChance = 40 + (this.player.level * 2);

            // STR補正 (簡易: 14以上で+1ずつ)
            if (this.player.str > 14) hitChance += (this.player.str - 14) * 3;

            // 武器補正
            if (this.player.weapon) {
                hitChance += (this.player.weapon.plusValue || 0) * 3;
            }

            // 2. 命中判定
            if (Math.random() * 100 < hitChance) {
                // 3. ダメージ計算 (get_weapon_damage + damage_for_strength)
                if (this.player.weapon) {
                    damage = this.parseDice(this.player.weapon.value || '1d4');
                    damage += (this.player.weapon.plusValue || 0); // +Modifier
                } else {
                    damage = this.parseDice('1d4'); // 素手
                }

                // STRダメージボーナス
                if (this.player.str > 21) damage += 6;
                else if (this.player.str > 20) damage += 5;
                else if (this.player.str > 18) damage += 4;
                else if (this.player.str > 17) damage += 3;
                else if (this.player.str > 15) damage += 1;

                // レベルボーナス
                damage += Math.floor((this.player.level + 1) / 2);

                message = `${defender.name}に攻撃！(${damage}ダメージ)`;
                defender.takeDamage(damage);

                if (defender.isDead()) {
                    message += ` -> 倒した！(${defender.exp} exp)`;
                    this.monsters = this.monsters.filter(m => m !== defender);
                    const oldLevel = this.player.level;
                    this.player.gainExp(defender.exp);
                    if (this.player.level > oldLevel) {
                        this.display.showMessage(`レベル${this.player.level}に上がった！`);
                    }

                    // 拘束解除
                    if (this.player.held) {
                        this.player.held = false;
                        message += ' (拘束が解けた)';
                    }
                }
            } else {
                message = '攻撃ははずれた。';
            }

        } else {
            // --- モンスターの攻撃 (mon_hit) ---

            // 1. 命中率計算
            // モンスター基礎命中率 (簡易: レベル*5 + 40) - (プレイヤーレベル * 2)
            // 本来は定義テーブルがあるが省略
            let monBaseHit = 40 + (defender.level * 5); // モンスターレベルがないので適当...いやMonster.definitionsにminLevelがある
            // defenderはplayerなので、attacker(monster)のレベルが必要。
            // Monsterクラスにlevelプロパティがないので、minLevelを代用するか、Expから算出するか。
            // ここでは簡易的に「一律50% - プレイヤーレベル」にするか。

            // hit.c: hit_chance = monster->m_hit_chance - (2 * player_exp)
            // 標準的なモンスター命中率を60%と仮定
            hitChance = 60 - (this.player.level * 2);

            // ACによる回避 (RogueのACは命中率にも影響するが、Web版はダメージ軽減に使っているので、ここでは簡易的に)
            // プレイヤーのアーマーが強いほど当たりにくいボーナスを少し入れる
            hitChance -= (this.player.armor * 2);

            // 2. 命中判定
            if (Math.random() * 100 < hitChance) {
                // 3. ダメージ計算
                // attacker.damageは "1d6" のような文字列
                damage = this.parseDice(attacker.damage);

                // 4. プレイヤーのダメージ軽減 (Web版Armor仕様)
                // takeDamage内で処理されるが、メッセージ用に計算済みを知りたい
                // Player.takeDamageを呼ぶ。

                // ここでメッセージを出す前にtakeDamageを呼ぶとHP減る。
                // メッセージは呼び出し元で表示するか、ここで表示するか。
                // プレイヤーは複数回攻撃受けるので、ログが流れる。

                // Player.takeDamageは `damage - this.armor`
                const actualDamage = Math.max(1, damage - this.player.armor);

                this.display.showMessage(`${attacker.name}の攻撃！(${actualDamage}ダメージ)`);
                this.player.takeDamage(damage); // Player側で軽減計算

                // 特殊攻撃判定
                SpecialHit.check(this, attacker);

                if (this.player.hp <= 0) {
                    message += ' -> あなたは死にました...';
                    this.display.showMessage(message);
                    // モンスターに殺された
                    this.gameOver(attacker, null);
                    return; // これ以降の処理をスキップ
                }
            } else {
                message = `${attacker.name}の攻撃をかわした！`;
            }
        }

        this.display.showMessage(message);
    }

    parseDice(diceStr) {
        // "1d6", "2d4+1", "3d3/2d5" などをパース
        // 複数回攻撃("/")は最初の1回分だけ採用(簡易)
        if (typeof diceStr === 'string' && diceStr.includes('/')) {
            diceStr = diceStr.split('/')[0];
        }

        if (!diceStr || typeof diceStr !== 'string' || !diceStr.includes('d')) return 1;

        const [count, faces] = diceStr.split('d').map(Number);
        if (isNaN(count) || isNaN(faces)) return 1;

        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * faces) + 1;
        }
        return total;
    }

    flopWeapon(item, x, y) {
        // アイテムを指定座標に落とす。埋まっていたら周囲を探す (flop_weapon)
        let foundX = x;
        let foundY = y;
        let found = false;

        // まず中心
        if (!this.isItemAt(x, y) && this.level.isWalkable(x, y)) {
            found = true;
        } else {
            // 周囲8マス探索
            const dirs = [
                [0, -1], [0, 1], [-1, 0], [1, 0],
                [-1, -1], [1, -1], [-1, 1], [1, 1]
            ];
            for (const d of dirs) {
                const nx = x + d[0];
                const ny = y + d[1];
                if (this.level.isWalkable(nx, ny) && !this.isItemAt(nx, ny)) {
                    foundX = nx;
                    foundY = ny;
                    found = true;
                    break;
                }
            }
        }

        if (found) {
            item.x = foundX;
            item.y = foundY;
            this.items.push(item);
            this.display.showMessage(`${item.getDisplayName()}は地面に落ちた。`);
        } else {
            this.display.showMessage(`${item.getDisplayName()}はどこかへ消えた...`); // 置き場なし
        }
    }

    isItemAt(x, y) {
        return this.items.some(i => i.x === x && i.y === y);
    }

    showFullMap() {
        // マップ全体表示(訪れた場所を全て表示)
        const visitedCount = this.level.visited.flat().filter(v => v).length;
        const totalTiles = this.level.width * this.level.height;
        const exploredPercent = Math.floor((visitedCount / totalTiles) * 100);

        this.display.showMessage(`マップ探索率: ${exploredPercent}% (${visitedCount}/${totalTiles}マス)`);
        // TODO: 将来的にはマップ全体を別画面で表示する機能を追加
    }

    gameOver(monster = null, cause = null) {
        this.state = 'gameover';

        // スコアマネージャーで死亡処理
        // causeがnullの場合はモンスターに殺された扱い
        this.scoreManager.killedBy(monster, cause);

        // Enterキーでランキング表示、その後タイトルへ
        this.waitForRanking();
    }

    waitForRanking() {
        const handleKey = (e) => {
            if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                document.removeEventListener('keydown', handleKey);

                // 現在gameover画面ならランキングへ、ranking画面ならタイトルへ
                if (this.state === 'gameover') {
                    this.state = 'ranking';
                    const rank = this.scoreManager.getScores().findIndex(s =>
                        s.timestamp === this.scoreManager.getScores()[0]?.timestamp
                    );
                    this.scoreManager.showRanking(rank >= 0 ? rank : -1);
                    this.waitForRanking(); // 再度待機
                } else {
                    this.state = 'title';
                    this.display.showScreen('title');
                    this.waitForStart();
                }
            }
        };
        document.addEventListener('keydown', handleKey);
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
