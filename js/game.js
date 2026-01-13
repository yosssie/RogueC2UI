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
import { Mesg } from './mesg_J.js';

// オリジナルRogueのクリアバナーデータ (score.c ban)
const BANNER_DATA = [
    [0x88, 0x00, 0x08, 0x80, 0x08, 0x01, 0xc8, 0x20],
    [0x88, 0x00, 0x0d, 0x80, 0x08, 0x00, 0x88, 0x20],
    [0x89, 0xc8, 0x8a, 0x9c, 0x79, 0xc0, 0x9c, 0x20],
    [0x7a, 0x28, 0x88, 0x82, 0x8a, 0x20, 0x88, 0x20],
    [0x0a, 0x28, 0x88, 0x9e, 0x8b, 0xe0, 0x88, 0x20],
    [0x8a, 0x29, 0x88, 0xa2, 0x8a, 0x00, 0x89, 0x00],
    [0x71, 0xc6, 0x88, 0x9e, 0x79, 0xc1, 0xc6, 0x20]
];

// デバッグモードはタイトル画面で選択

export class Game {
    constructor() {
        this.state = 'title'; // title, playing, menu, config, gameover
        this.display = new Display();
        this.input = new InputManager(this);
        this.saveManager = new SaveManager();
        this.scoreManager = new ScoreManager(this); // スコア管理
        this.trapManager = new TrapManager(this); // 罠管理
        this.ringManager = new RingManager(this); // 指輪管理
        this.wandManager = new WandManager(this); // 杖管理

        this.isProcessing = false; // アクション処理中フラグ（非同期処理中の入力ブロック用）

        this.level = null;
        this.player = null;
        this.monsters = [];
        this.items = [];

        this.currentFloor = 1;
        this.turnCount = 0;

        // モンスターハウス (Party Room) 関連
        // オリジナルRogue: next_party() ロジック
        // 10階ごとのブロック（11-20, 21-30...）内でランダムに1回発生
        this.partyCounter = this.nextParty(1);
        this.partyRoom = -1; // 現在の階層のParty Room ID (-1: なし)
        this.debugMode = false; // デバッグモードフラグ（タイトル画面用）
        this.inGameDebugMode = false; // ゲーム中のデバッグモード

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
                if (e.code === this.input.keyConfig.buttonA || e.key === 'Enter') {
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
        this.maxLevel = 1;
        this.turnCount = 0;
        this.monsters = [];
        this.items = [];
        this.WANDER_TIME = 120; // モンスター発生間隔

        // プレイヤー作成 (Rogue初期値: HP12, Str16)
        this.player = new Player('勇者', 12, 16);

        // 指輪効果をリセット (プレイヤー作成後に実行)
        this.ringManager.ringStats(false);

        // 罠マネージャリセット
        this.trapManager.reset();

        // メッセージログクリア
        this.display.clearMessageLog();

        // 初期装備 (init.c player_init 準拠)
        // 初期装備 (init.c player_init 準拠)
        // 食料 (1個)
        const food = new Item(':', 0, 0, 'food');
        this.player.addItem(food);

        // リングメイル +1
        const armor = new Item(']', 0, 0, 'ring_mail');
        armor.damageBonus = 1; // d_enchant
        armor.identified = true;
        this.player.addItem(armor);
        this.player.equip(armor);

        // メイス +1, +1
        const weapon = new Item(')', 0, 0, 'mace');
        weapon.hitBonus = 1;
        weapon.damageBonus = 1;
        weapon.identified = true;
        this.player.addItem(weapon);
        this.player.equip(weapon);

        // 弓 +1, +0
        const bow = new Item(')', 0, 0, 'bow');
        bow.hitBonus = 1;
        bow.damageBonus = 0;
        bow.identified = true;
        this.player.addItem(bow);

        // 矢 25-35本
        const arrow = new Item(')', 0, 0, 'arrow');
        arrow.quantity = 25 + Math.floor(Math.random() * 11);
        arrow.identified = true;
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

    nextLevel() {
        this.currentFloor++;

        // 階層移動時のステータスリセット (level.c clear_level)
        this.player.status.detectMonster = 0;
        this.player.status.detectObjects = 0;
        this.player.status.seeInvisible = false;
        this.player.status.held = false;
        this.player.status.bearTrap = 0;

        this.generateFloor();
        // 階層移動した後、デバッグモードならマップを全開にする
        if (this.inGameDebugMode) {
            this.level.revealAll();
        }
        // 画面更新は generateFloor 内では行われない（loop内でupdateDisplayされる）
        // だがアクションの一部として呼ばれるので手動更新が必要な場合がある
        this.updateDisplay();
        this.display.showMessage(`${this.currentFloor}階に降りた。`);
    }

    generateFloor() {
        console.log(`📍 Generating floor ${this.currentFloor}...`);

        if (this.currentFloor > this.maxLevel) {
            this.maxLevel = this.currentFloor;
        }

        if (this.debugMode) {
            console.log('🔧 DEBUG MODE: Using fixed dungeon layout');
            this.level = new DebugLevel(90, 30);
        } else {
            this.level = new Level(80, 22, this.currentFloor);
        }

        this.level.generate();

        // プレイヤーを配置
        // プレイヤーを配置
        // 有効な部屋を探す (R_ROOM = 0x02)
        let validRooms = this.level.rooms.filter(r => r.is_room & 0x02);
        if (validRooms.length === 0) {
            // 万が一部屋がない場合は強制的に中央付近に通路を作るなどが必要だが、
            // 生成ロジック上必ず1つはあるはず。
            console.error('No valid rooms found!');
            // デバッグモード互換
            if (this.debugMode) validRooms = this.level.rooms;
        }

        const startRoom = validRooms[0]; // ランダムにするなら Math.random()
        // 部屋の中央に配置 (オリジナルRogue準拠の座標系)
        const roomWidth = startRoom.right_col - startRoom.left_col + 1;
        const roomHeight = startRoom.bottom_row - startRoom.top_row + 1;
        this.player.x = startRoom.left_col + Math.floor(roomWidth / 2);
        this.player.y = startRoom.top_row + Math.floor(roomHeight / 2);

        // 初期視界を設定
        this.level.updateVisibility(this.player.x, this.player.y);

        // モンスター配置
        this.spawnMonsters();

        // アイテム配置
        this.spawnItems();

        // --- Party Room (Monster House) ---
        // spawnMonsters/spawnItemsの後に呼ぶ（配列がクリアされた後に追加）
        // Party Room がある階でも、通常のモンスター・アイテム生成は行われる (追加で配置される)
        this.partyRoom = -1;
        if (!this.debugMode && this.currentFloor === this.partyCounter) {
            console.log(`🎉 Party time at floor ${this.currentFloor}`);
            this.makeParty(this.level);
            // 次回発生階層を計算
            this.partyCounter = this.nextParty(this.currentFloor);
            console.log(`🎯 Next party scheduled at floor ${this.partyCounter}`);
        }

        // デバッグモード追加アイテム
        if (this.debugMode) {
            // イェンダーの魔除け配置 (75, 3) = 階段 (76, 3) の隣
            const amulet = new Item(',', 75, 3, 'amulet');
            this.items.push(amulet);
        }

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

            // R_ROOM | R_MAZE (0x02 | 0x04 = 0x06)
            const validRooms = this.level.rooms.filter(r => r.is_room & 0x06);

            let spawnedCount = 0;
            let attempts = 0;
            // 無限ループ防止のため、最大試行回数を設定 (通常はすぐに配置できるはず)
            const MAX_ATTEMPTS = 100;

            while (spawnedCount < numMonsters && attempts < MAX_ATTEMPTS) {
                attempts++;
                if (validRooms.length === 0) break;

                const room = validRooms[Math.floor(Math.random() * validRooms.length)];
                const roomWidth = room.right_col - room.left_col + 1;
                const roomHeight = room.bottom_row - room.top_row + 1;
                const x = room.left_col + Math.floor(Math.random() * roomWidth);
                const y = room.top_row + Math.floor(Math.random() * roomHeight);

                if (this.level.isWalkable(x, y) && this.level.getTile(x, y) !== '+' && !this.isPositionOccupied(x, y)) {
                    const type = candidates[Math.floor(Math.random() * candidates.length)];
                    const monster = new Monster(type, x, y);

                    // オリジナルRogue準拠: WANDERSフラグ持ちは50%の確率で最初から起きている
                    // object.c put_mons line 87-89: if ((monster->m_flags & WANDERS) && coin_toss()) wake_up(monster);
                    if (monster.hasFlag(Monster.FLAGS.WANDERS) && Math.random() < 0.5) {
                        monster.removeFlag(Monster.FLAGS.ASLEEP);
                    }

                    this.monsters.push(monster);
                    spawnedCount++;
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

                            // こけももは3個配置
                            if (def.id === 'fruit') {
                                for (let i = 0; i < 2; i++) {
                                    px++;
                                    if (px >= storage.x + storage.w - 1) {
                                        px = storage.x + 1;
                                        py++;
                                    }
                                    const extraFruit = new Item(symbol, px, py, def.id);
                                    extraFruit.identified = true;
                                    this.items.push(extraFruit);
                                }
                            }

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
            // 帰還中（到達済み階層への移動）はアイテムを生成しない (object.c put_objects)
            if (this.currentFloor < this.maxLevel) {
                return;
            }

            // アイテム生成数 (object.c put_objects)
            // n = coin_toss()? get_rand(2, 4) : get_rand(3, 5);
            let n = (Math.random() < 0.5) ? (2 + Math.floor(Math.random() * 3)) : (3 + Math.floor(Math.random() * 3));
            // while (rand_percent(33)) n++;
            while (Math.random() < 0.33) n++;

            // R_ROOM | R_MAZE (0x02 | 0x04 = 0x06)
            const validRooms = this.level.rooms.filter(r => r.is_room & 0x06);
            let spawnedCount = 0;
            let attempts = 0;
            const MAX_ATTEMPTS = 100;

            while (spawnedCount < n && attempts < MAX_ATTEMPTS) {
                attempts++;
                if (validRooms.length === 0) break;

                const room = validRooms[Math.floor(Math.random() * validRooms.length)];
                const roomWidth = room.right_col - room.left_col + 1;
                const roomHeight = room.bottom_row - room.top_row + 1;
                const x = room.left_col + Math.floor(Math.random() * roomWidth);
                const y = room.top_row + Math.floor(Math.random() * roomHeight);

                if (this.level.isWalkable(x, y) && this.level.getTile(x, y) !== '+' && !this.isPositionOccupied(x, y)) {
                    // object.c gr_what_is
                    // scroll 30, potion 30, wand 4, weapon 10, armor 9, food 5, ring 3
                    // Total 91
                    const rand = Math.floor(Math.random() * 91);
                    let type;
                    if (rand < 30) type = '?';      // 巻物 30
                    else if (rand < 60) type = '!'; // 薬 30
                    else if (rand < 64) type = '/'; // 杖 4
                    else if (rand < 74) type = ')'; // 武器 10
                    else if (rand < 83) type = ']'; // 防具 9
                    else if (rand < 88) type = ':'; // 食料 5
                    else type = '=';                // 指輪 3 (残り)

                    this.items.push(new Item(type, x, y));
                    spawnedCount++;
                }
            }

            // 金貨生成 (オリジナルでは別処理)
            this.spawnGold();

            // 魔除け (Amulet of Yendor) の生成
            // 26階以降、かつ所持していない場合
            if (this.currentFloor >= 26 && !this.player.inventory.some(i => i.id === 'amulet')) {
                // R_ROOM | R_MAZE (0x02 | 0x04 = 0x06)
                const validRooms = this.level.rooms.filter(r => r.is_room & 0x06);
                if (validRooms.length > 0) {
                    let placed = false;
                    let attempts = 0;
                    while (!placed && attempts < 100) {
                        attempts++;
                        const room = validRooms[Math.floor(Math.random() * validRooms.length)];
                        const roomWidth = room.right_col - room.left_col + 1;
                        const roomHeight = room.bottom_row - room.top_row + 1;
                        const x = room.left_col + Math.floor(Math.random() * roomWidth);
                        const y = room.top_row + Math.floor(Math.random() * roomHeight);

                        if (this.level.isWalkable(x, y) && this.level.getTile(x, y) !== '+' && !this.isPositionOccupied(x, y)) {
                            const amulet = new Item(',', x, y, 'amulet');
                            this.items.push(amulet);
                            placed = true;
                        }
                    }
                }
            }
        }
    }

    // 金貨生成 (object.c put_gold)
    spawnGold() {
        // 全ての有効な部屋について判定
        // R_ROOM | R_MAZE (0x02 | 0x04 = 0x06)
        const rooms = this.level.rooms.filter(r => r.is_room & 0x06);

        rooms.forEach(room => {
            // 迷路かどうかチェック (R_MAZE = 0x04)
            const isMaze = (room.is_room & 0x04) !== 0;

            // GOLD_PERCENT (46%) の確率で配置、迷路は100%
            if (isMaze || Math.random() < 0.46) {
                // 配置場所を探す (MAX 50回試行)
                for (let i = 0; i < 50; i++) {
                    const roomWidth = room.right_col - room.left_col + 1;
                    const roomHeight = room.bottom_row - room.top_row + 1;
                    const x = room.left_col + Math.floor(Math.random() * roomWidth);
                    const y = room.top_row + Math.floor(Math.random() * roomHeight);

                    if (this.level.isWalkable(x, y) && this.level.getTile(x, y) !== '+' && !this.isPositionOccupied(x, y)) {
                        const gold = new Item('*', x, y);

                        // 額を階層依存にする
                        // amount = get_rand((2 * cur_level), (16 * cur_level))
                        const min = 2 * this.currentFloor;
                        const max = 16 * this.currentFloor;
                        gold.value = min + Math.floor(Math.random() * (max - min + 1));

                        // 迷路なら1.5倍 (object.c plant_gold)
                        if (isMaze) {
                            gold.value += Math.floor(gold.value / 2);
                        }

                        this.items.push(gold);
                        break; // 1部屋に1個まで
                    }
                }
            }
        });
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

    async handlePlayerAction(action) {
        if (this.state !== 'playing') return;
        if (this.isProcessing) return; // 処理中は入力を受け付けない

        this.isProcessing = true;
        try {
            // プレイヤーの行動開始時に、前のターンのメッセージをアーカイブ(グレーにする)
            // これにより、今回のターンで発生する一連のメッセージは全て白文字になる
            this.display.archiveMessages();

            let actionTaken = false;

            switch (action.type) {
                case 'move':
                    actionTaken = await this.movePlayer(action.dx, action.dy);
                    break;
                case 'rest':
                    // 休憩 (move.c rest()) - その場で待機してHP回復
                    actionTaken = true;
                    break;
                case 'rest_and_search':
                    // 休憩 + 探索 (Aボタン用統合アクション)
                    // 移動せずに休憩し、ついでに探索も行う (便利な独自機能)
                    console.log('🔍 rest_and_search action triggered');
                    this.search();
                    console.log('✅ search completed, setting actionTaken = true');
                    actionTaken = true; // ターンを進める
                    break;
                case 'search':
                    // 探索 (trap.c search()) - 隠し扉・罠を探す
                    this.search();
                    actionTaken = true; // ターンを進める
                    break;
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
                case 'inventory':
                    this.showInventory();
                    return;
                case 'stairs':
                    if (this.level.getTile(this.player.x, this.player.y) === '%') {
                        // オリジナルRogue準拠: 浮遊中は階段を降りられない (level.c drop_check line 698-701)
                        if (this.player.status.levitate > 0) {
                            this.display.showMessage('浮遊しているので階段を降りられない。');
                            return;
                        }

                        let goUp = false;
                        let goDown = false;

                        if (action.direction === 'up') goUp = true;
                        else if (action.direction === 'down') goDown = true;
                        else {
                            // 自動判別: 魔除けがあれば上る
                            if (this.player.inventory.some(item => item.id === 'amulet')) {
                                goUp = true;
                            } else {
                                goDown = true;
                            }
                        }

                        if (goUp) {
                            // イェンダーの魔除けチェック
                            if (this.player.inventory.some(item => item.id === 'amulet')) {
                                this.currentFloor--;

                                if (this.currentFloor <= 0) {
                                    this.gameClear();
                                    return;
                                }

                                this.display.showMessage(`${this.currentFloor}階に上った。`);

                                // 階層移動時のステータスリセット
                                this.player.status.detectMonster = 0;
                                this.player.status.detectObjects = 0;
                                this.player.status.seeInvisible = false;
                                this.player.status.held = false;
                                this.player.status.bearTrap = 0;

                                this.generateFloor();
                                if (this.inGameDebugMode) {
                                    this.level.revealAll();
                                }
                                this.updateDisplay();
                            } else {
                                this.display.showMessage("上れません。");
                            }
                        } else {
                            this.nextLevel();
                        }
                    } else {
                        this.display.showMessage('ここには階段がない。');
                    }
                    return;
                case 'debug_ascend':
                    this.currentFloor--;
                    if (this.currentFloor <= 0) {
                        this.gameClear();
                        return;
                    }
                    this.display.showMessage(`${this.currentFloor}階へワープした。(Debug)`);
                    // 階層移動時のステータスリセット
                    this.player.status.detectMonster = 0;
                    this.player.status.detectObjects = 0;
                    this.player.status.seeInvisible = false;
                    this.player.status.held = false;
                    this.player.status.bearTrap = 0;

                    this.generateFloor();
                    if (this.inGameDebugMode) {
                        this.level.revealAll();
                    }
                    this.updateDisplay();
                    return;
                case 'debug_descend':
                    this.nextLevel();
                    return;
                case 'debug':
                    // ゲーム中デバッグモード切り替え
                    this.inGameDebugMode = !this.inGameDebugMode;
                    if (this.inGameDebugMode) {
                        this.level.revealAll(); // 全体を表示
                        this.display.showMessage('🐛 デバッグモード: ON (壁判定無効、全体表示)');
                    } else {
                        this.display.showMessage('デバッグモード: OFF');
                    }
                    this.display.toggleDebugMode();
                    this.updateDisplay();
                    return;
            }

            if (actionTaken && !this.skipTurnProcessing) {
                // 加速時の処理 (use.c haste_self)
                // 加速中は2回行動できる = モンスターが1回行動する間にプレイヤーが2回行動
                // 実装方法: 奇数ターンはモンスター行動なし
                const isFast = this.player.status && this.player.status.fast > 0;
                await this.processTurn(isFast);
            }
            this.skipTurnProcessing = false; // リセット
        } finally {
            this.isProcessing = false;
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // オリジナルRogue: next_party() の実装
    nextParty(currentLevel) {
        const PARTY_TIME = 10;
        let n = currentLevel;

        // n を PARTY_TIME の倍数に切り上げ
        while (n % PARTY_TIME !== 0) {
            n++;
        }

        // (n + 1) から (n + PARTY_TIME) の間でランダム
        return Math.floor(Math.random() * PARTY_TIME) + n + 1;
    }

    // --- Party Room (Monster House) Logic ---

    makeParty(level) {
        console.log('🎪 [Party Room] Starting party room generation...');
        console.log('🎪 [Party Room] Total rooms:', level.rooms.length);

        // オリジナル: gr_room() - R_ROOM | R_MAZE (0x06) のいずれかの部屋を選ぶ
        // R_ROOM = 0x02, R_MAZE = 0x04
        const validRooms = level.rooms.filter(r => r.is_room & 0x06);

        console.log('🎪 [Party Room] Valid rooms:', validRooms.length);
        console.log('🎪 [Party Room] Valid room flags:', validRooms.map(r => r.is_room.toString(16)));

        if (validRooms.length === 0) {
            console.warn('🎪 [Party Room] No valid rooms found!');
            return;
        }

        const room = validRooms[Math.floor(Math.random() * validRooms.length)];
        // partyRoomにはindexではなく部屋オブジェクトそのものを持たせるか、
        // あるいはlevel.rooms内のインデックスを特定する必要がある。
        // ここではインデックスを特定して保持する。
        this.partyRoom = level.rooms.indexOf(room);

        console.log('🎪 [Party Room] Selected room index:', this.partyRoom);
        console.log('🎪 [Party Room] Room bounds:', {
            left: room.left_col,
            right: room.right_col,
            top: room.top_row,
            bottom: room.bottom_row,
            is_room: room.is_room.toString(16)
        });

        // アイテム配置 (アイテム数nを返す)
        let n = 11;
        if (Math.random() < 0.99) {
            n = this.partyObjects(level, room);
        }

        // モンスター配置
        if (Math.random() < 0.99) {
            this.partyMonsters(level, room, n);
        }

        console.log('🎪 [Party Room] Generation complete!');
    }

    partyObjects(level, room) {
        // オリジナル: n = get_rand(5, 10)
        let n = Math.floor(Math.random() * 6) + 5;
        // オリジナル: if (rand_percent(50)) n += get_rand(5, 10);
        if (Math.random() < 0.5) {
            n += Math.floor(Math.random() * 6) + 5;
        }

        console.log(`🎁 [Party Objects] Placing ${n} items...`);

        // 部屋の範囲 (壁の内側)
        const minX = room.left_col + 1;
        const maxX = room.right_col - 1;
        const minY = room.top_row + 1;
        const maxY = room.bottom_row - 1;
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        // オリジナル: N = ((bottom - top) - 1) * ((right - left) - 1)
        // = 部屋の内側のマス数
        const N = width * height;

        // オリジナル: if (n > N) n = N - 2;
        if (n > N) {
            n = N - 2;
            console.log(`🎁 [Party Objects] Adjusted item count to ${n} (room size: ${N})`);
        }

        console.log(`🎁 [Party Objects] Inner room bounds: x[${minX}..${maxX}] y[${minY}..${maxY}] (${width}x${height})`);

        if (width <= 0 || height <= 0) {
            console.warn('🎁 [Party Objects] Invalid room dimensions!');
            return 0;
        }

        let itemsPlaced = 0;

        // アイテム配置
        for (let i = 0; i < n; i++) {
            // アイテムタイプをランダム決定 (spawnItemsと同じロジック)
            // object.c gr_what_is: scroll 30, potion 30, wand 4, weapon 10, armor 9, food 5, ring 3
            const rand = Math.floor(Math.random() * 91);
            let type;
            if (rand < 30) type = '?';      // 巻物 30
            else if (rand < 60) type = '!'; // 薬 30
            else if (rand < 64) type = '/'; // 杖 4
            else if (rand < 74) type = ')'; // 武器 10
            else if (rand < 83) type = ']'; // 防具 9
            else if (rand < 88) type = ':'; // 食料 5
            else type = '=';                // 指輪 3

            let placed = false;
            for (let j = 0; j < 250; j++) { // オリジナルと同じ試行回数
                const r = Math.floor(Math.random() * height) + minY;
                const c = Math.floor(Math.random() * width) + minX;

                // spawnItemsと同じ判定を使用
                if (level.isWalkable(c, r) && level.getTile(c, r) !== '+' && !this.isPositionOccupied(c, r)) {
                    const item = new Item(type, c, r);
                    this.items.push(item);
                    itemsPlaced++;
                    placed = true;
                    console.log(`🎁 [Party Objects] Item ${i + 1} placed at (${c}, ${r}), type: ${type}`);
                    break;
                }
            }

            if (!placed) {
                console.warn(`🎁 [Party Objects] Failed to place item ${i + 1} after 250 attempts`);
            }
        }

        console.log(`🎁 [Party Objects] Placed ${itemsPlaced}/${n} items`);
        return n;
    }

    partyMonsters(level, room, n) {
        // n += n; (アイテム数の2倍？ オリジナルコード: n += n;)
        // モンスター数はアイテム数より多くなる傾向
        const numMonsters = n + n;
        console.log(`👹 [Party Monsters] Placing ${numMonsters} monsters...`);

        // モンスターレベル調整 (オリジナルは一時的にレベル変動させるが、ここではそのまま実装)
        // mon_tab[i].first_level -= (cur_level % 3);

        // 部屋の範囲 (壁の内側)
        const minX = room.left_col + 1;
        const maxX = room.right_col - 1;
        const minY = room.top_row + 1;
        const maxY = room.bottom_row - 1;
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        console.log(`👹 [Party Monsters] Inner room bounds: x[${minX}..${maxX}] y[${minY}..${maxY}] (${width}x${height})`);

        if (width <= 0 || height <= 0) {
            console.warn('👹 [Party Monsters] Invalid room dimensions!');
            return; // 安全策
        }

        let monstersPlaced = 0;

        for (let i = 0; i < numMonsters; i++) {
            // オリジナル: no_room_for_monster(rn) - 部屋がいっぱいなら終了
            // 部屋の壁の内側に空きマスがあるかチェック
            let hasEmptySpace = false;
            for (let r = minY; r <= maxY && !hasEmptySpace; r++) {
                for (let c = minX; c <= maxX && !hasEmptySpace; c++) {
                    if (level.isWalkable(c, r) &&
                        !this.monsters.some(m => m.x === c && m.y === r) &&
                        !(this.player.x === c && this.player.y === r)) {
                        hasEmptySpace = true;
                    }
                }
            }
            if (!hasEmptySpace) {
                console.log(`👹 [Party Monsters] Room is full, stopping at ${i} monsters`);
                break;
            }

            let placed = false;
            for (let j = 0; j < 250 && !placed; j++) { // オリジナルと同じ試行回数
                const r = Math.floor(Math.random() * height) + minY;
                const c = Math.floor(Math.random() * width) + minX;

                // spawnMonstersと同じ判定を使用
                if (level.isWalkable(c, r) &&
                    level.getTile(c, r) !== '+' &&
                    !this.monsters.some(m => m.x === c && m.y === r) &&
                    !(this.player.x === c && this.player.y === r)) {

                    // この階層に出現可能なモンスター候補を取得（spawnMonstersと同じロジック）
                    const candidates = [];
                    for (const [key, def] of Object.entries(Monster.definitions)) {
                        if (this.currentFloor >= def.minLevel && this.currentFloor <= def.maxLevel) {
                            candidates.push(key);
                        }
                    }
                    if (candidates.length === 0) candidates.push('B');

                    const type = candidates[Math.floor(Math.random() * candidates.length)];
                    const monster = new Monster(type, c, r);

                    // WAKENS フラグを付与 (部屋に入ったら起きる)
                    monster.flags |= Monster.FLAGS.WAKENS;

                    this.monsters.push(monster);
                    monstersPlaced++;
                    placed = true;
                    console.log(`👹 [Party Monsters] Monster ${i + 1} (${type}) placed at (${c}, ${r})`);
                }
            }

            if (!placed) {
                console.warn(`👹 [Party Monsters] Failed to place monster ${i + 1} after 250 attempts`);
            }
        }

        console.log(`👹 [Party Monsters] Placed ${monstersPlaced}/${numMonsters} monsters`);
    }

    // move.c one_move_rogue
    async movePlayer(dx, dy, pickup = true) {
        // 睡眠・凍結チェック
        if (this.player.status.sleep > 0) {
            this.display.showMessage('動けない！');
            await this.wait(200); // メッセージを読ませるためのウェイト
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
        // デバッグモード時は壁判定をスキップ
        if (!this.inGameDebugMode) {
            if (!this.level.isInBounds(newX, newY) ||
                !this.level.canMove(this.player.x, this.player.y, newX, newY)) {
                return false;
            }
        } else {
            // デバッグモード: 範囲外チェックのみ
            if (!this.level.isInBounds(newX, newY)) {
                return false;
            }
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
                    this.display.showMessage(Mesg[67]);
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
        if (pickup) {
            const item = this.items.find(i => i.x === newX && i.y === newY);
            if (item) {
                // オリジナルRogue準拠: 浮遊中はアイテムを拾えない (move.c line 131-134)
                if (this.player.status.levitate > 0) {
                    this.display.showMessage('浮遊しているのでアイテムを拾えない。');
                    return true; // ターン消費 (STOPPED_ON_SOMETHING)
                }

                // SCARE_MONSTER特殊処理 (pack.c pick_up line 86-95)
                if (item.id === 'scroll_scare_monster' && item.picked_up) {
                    // 一度拾ったSCARE_MONSTERを再度拾おうとすると消滅
                    this.items = this.items.filter(i => i !== item);
                    this.display.showMessage(Mesg[86]); // "拾いあげたとたん、巻き物はちりになってしまった。"
                    return true; // ターン消費
                }

                if (this.player.addItem(item)) {
                    // アイテムを拾った時にpicked_upフラグを立てる
                    item.picked_up = true;
                    this.items = this.items.filter(i => i !== item);
                    this.display.showMessage(item.getDisplayName() + Mesg[69]);
                    // Rogue仕様: アイテムを拾ったらダッシュ停止 (STOPPED_ON_SOMETHING)
                    // これはdashPlayerのnextToSomethingで検知される
                } else {
                    this.display.showMessage(Mesg[87]);
                }
            }
        }

        // 6. 罠判定 (trap_player)
        // 罠があれば発動。隠し罠なら表示される。
        // 発動前に一度描画更新して、プレイヤーが罠の上に移動したことを視覚的に反映させる
        this.updateDisplay();
        await this.trapManager.trapPlayer(newY, newX);

        // 7. 部屋の更新 (move.c line 104-117)
        const oldTile = this.level.getTile(oldX, oldY);
        const newTile = this.level.getTile(newX, newY);
        const oldRoom = this.level.getRoomAt(oldX, oldY);
        const newRoom = this.level.getRoomAt(newX, newY);

        // オリジナルRogue準拠: ドアに入る (通路→部屋) (move.c line 104-108)
        if (newTile === '+' && !oldRoom) {
            // 通路からドアに入った → 部屋に入る
            if (newRoom) {
                this.wakeRoom(newRoom, true, newY, newX);
            }
        }
        // オリジナルRogue準拠: ドアから出る (部屋→通路) (move.c line 112-117)
        else if (oldTile === '+' && newTile === '#') {
            // ドアから通路に出た → 部屋から出る
            if (oldRoom) {
                this.wakeRoom(oldRoom, false, oldY, oldX);
            }
        }

        return true; // ターン消費 (MOVED or STOPPED_ON_SOMETHING)
    }

    // monster.c wake_room 移植
    wakeRoom(room, entering, row, col) {
        if (!room) return;

        this.monsters.forEach(m => {
            // モンスターがいる部屋を取得
            const mRoom = this.level.getRoomAt(m.x, m.y);

            // 同じ部屋にいるかチェック
            if (mRoom && mRoom === room) {
                if (entering) {
                    // プレイヤーが入ってきた瞬間はターゲットクリア（まだ気づいていない？）
                    // オリジナル: monster->trow = NO_ROOM;
                    m.trow = null;
                    m.tcol = null;
                } else {
                    // 部屋から出る時、最後の位置をターゲット設定（ここまで追ってくる）
                    // オリジナル: monster->trow = row; monster->tcol = col;
                    m.trow = row;
                    m.tcol = col;
                }

                // 寝ているモンスターを起こす判定 (WAKENS flag)
                // オリジナル仕様: entering に関係なく常に起床判定
                if (m.hasFlag(Monster.FLAGS.WAKENS) && m.hasFlag(Monster.FLAGS.ASLEEP)) {
                    // Party Room判定
                    // オリジナル: wake_percent = (rn == party_room) ? PARTY_WAKE_PERCENT(75) : WAKE_PERCENT(45);
                    const isPartyRoom = this.partyRoom !== -1 && this.level.rooms.indexOf(room) === this.partyRoom;
                    const wakeChance = isPartyRoom ? 0.75 : 0.45;

                    // 隠密(stealthy)補正があればここで計算

                    if (Math.random() < wakeChance) {
                        m.removeFlag(Monster.FLAGS.ASLEEP);
                        // 擬態解除 (IMITATES)
                        if (m.hasFlag(Monster.FLAGS.IMITATES)) {
                            m.removeFlag(Monster.FLAGS.IMITATES);
                        }
                        // メッセージはうるさいので基本出さない
                    }
                }
            }
        });
    }

    // ダッシュ (move.c multiple_move_rogue() 移植)
    async dashPlayer(dx, dy) {
        const maxSteps = 100;

        for (let i = 0; i < maxSteps; i++) {
            // 1. 移動を試みる (one_move_rogue)
            // ダッシュ時は拾わない (pickup=false)
            let moved = await this.movePlayer(dx, dy, false);

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
                        moved = await this.movePlayer(dx, dy, false); // 新しい方向へ移動(拾わない)
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

            // 足元チェック (アイテムに乗ったら停止)
            if (this.isItemAt(this.player.x, this.player.y)) {
                const item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
                if (item) this.display.showMessage(`${item.getDisplayName()}の上にいる。`);
                break;
            }

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

                // 進行方向の逆（来た道）は無視するが、アイテムやモンスターは無視しない
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

                // ドア: 上下左右に隣接したら止まる (オリジナルRogue準拠: move.c line 360)
                // 斜めは無視 ((i == 0) || (j == 0))
                if (isDoor && !isReverse && (x === 0 || y === 0)) return true;
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

    // モンスターの1回分の行動処理
    async processMonsterAction(monster) {
        const MonsterClass = Monster; // クラス参照用

        // プレイヤーが死んでいたら中止
        if (this.player.hp <= 0) return;
        // モンスターが死んでいたら中止
        if (monster.hp <= 0) return;

        // プレイヤーに隣接しているかチェック
        const dx = Math.abs(monster.x - this.player.x);
        const dy = Math.abs(monster.y - this.player.y);

        // 睡眠判定 (ASLEEP)
        if (monster.hasFlag(MonsterClass.FLAGS.ASLEEP)) {
            // 隣接判定
            const adjacent = (dx <= 1 && dy <= 1);

            // 隣接時に確率で起きる (WAKENS持ちのみ)
            // オリジナル (monster.c mv_monster): WAKENSがあり、隣接している場合、確率で起きる
            if (adjacent && monster.hasFlag(MonsterClass.FLAGS.WAKENS)) {
                // 確率 (WAKE_PERCENT = 45)
                if (Math.random() < 0.45) {
                    monster.removeFlag(MonsterClass.FLAGS.ASLEEP);
                    if (monster.hasFlag(MonsterClass.FLAGS.IMITATES)) {
                        monster.removeFlag(MonsterClass.FLAGS.IMITATES);
                    }
                }
            }

            // 寝ていた場合、起きたとしてもこのターンは行動しない (オリジナル仕様: monster.c mv_monster line 244 return)
            return;
        }

        // 攻撃判定
        // 斜め攻撃もありなら <= 1 で判定 (dx<=1 && dy<=1 && !(dx=0,dy=0))
        let canAttack = false;
        if (dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0)) {
            // 壁越し攻撃防止 (canMoveチェック)
            if (this.level.canMove(monster.x, monster.y, this.player.x, this.player.y)) {
                // SCARE_MONSTERチェック (monster.c mon_can_go line 447-452)
                // プレイヤーがSCARE_MONSTERの上に立っている場合は攻撃できない
                const scareScroll = this.items.find(item =>
                    item.x === this.player.x &&
                    item.y === this.player.y &&
                    item.id === 'scroll_scare_monster'
                );
                if (!scareScroll) {
                    canAttack = true;
                }
            }
        }

        if (canAttack) {
            // 攻撃
            this.resolveAttack(monster, this.player);
        } else {
            // 特殊行動: 混乱 (Medusa) - 離れている時のみ
            if (monster.hasFlag(MonsterClass.FLAGS.CONFUSES) && this.mConfuse(monster)) {
                return;
            }

            // 特殊行動: 炎 (Dragon) - 離れていて直線上にいる場合
            if (monster.hasFlag(Monster.FLAGS.FLAMES) && await this.mFlames(monster)) {
                monster.actionPoints--;
                return;
            }

            // 金貨探索 (Leprechaun)
            if (monster.hasFlag(Monster.FLAGS.SEEKS_GOLD) && this.mSeekGold(monster)) {
                monster.actionPoints--;
                return;
            }

            // 以下、通常の移動などの処理
            // 周囲にプレイヤーがいなければ、あるいは特殊行動もしなければ移動
            // プレイヤーが見えているなら追跡、そうでなければ徘徊
            // ... (既存コード) (他のモンスターとの衝突判定を渡す)
            monster.act(this.player, this.level, this.monsters, this.items);
        }
    }

    async processTurn(skipMonsters = false) {
        this.turnCount++;

        // 罠のターン経過処理 (熊の罠解除など)
        if (this.trapManager) {
            this.trapManager.processTurn();
        }

        // 加速時はモンスターの行動をスキップ (use.c haste_self)
        if (!skipMonsters) {
            // モンスターの行動
            // 途中で死んだモンスターなどでズレないようコピーで回す
            for (const monster of [...this.monsters]) {
                const MonsterClass = Monster;

                // --- ステータス持続時間処理 (1ターン1回) ---
                if (monster.sleepTurns > 0) {
                    monster.sleepTurns--;
                    if (monster.sleepTurns <= 0) {
                        monster.removeFlag(MonsterClass.FLAGS.ASLEEP);
                        monster.removeFlag(MonsterClass.FLAGS.NAPPING);
                        // this.display.showMessage(`${monster.name}は目を覚ました！`);
                    }
                }
                if (monster.confusedTurns > 0) {
                    monster.confusedTurns--;
                    if (monster.confusedTurns <= 0) {
                        monster.removeFlag(MonsterClass.FLAGS.CONFUSED);
                        this.display.showMessage(`${monster.name}の混乱は解けた。`);
                    }
                }

                // プレイヤーが死んでいたら中止
                if (this.player.hp <= 0) break;

                // --- 行動処理 (HASTED/SLOWED/FLIES反映) ---
                let actionCount = 1;
                let extraAction = false;

                if (monster.hasFlag(MonsterClass.FLAGS.HASTED)) {
                    actionCount = 2;
                } else if (monster.hasFlag(MonsterClass.FLAGS.SLOWED)) {
                    monster.slowedToggle = !monster.slowedToggle;
                    if (monster.slowedToggle) {
                        actionCount = 0; // 今回はスキップ
                    }
                } else if (monster.hasFlag(MonsterClass.FLAGS.FLIES) &&
                    !monster.hasFlag(MonsterClass.FLAGS.ASLEEP) &&
                    !monster.hasFlag(MonsterClass.FLAGS.NAPPING)) {
                    // 飛行 (FLIES): プレイヤーと離れている場合は追加移動を行う
                    // ただし、追加移動後にプレイヤーに隣接した場合は、通常行動（攻撃）を行わない
                    const distCheck = Math.max(Math.abs(monster.x - this.player.x), Math.abs(monster.y - this.player.y));
                    if (distCheck >= 2) {
                        extraAction = true;
                    }
                }

                if (extraAction) {
                    await this.processMonsterAction(monster);
                    if (this.player.hp <= 0 || monster.hp <= 0) {
                        // 死亡などで終了した場合は以降の行動キャンセル
                        actionCount = 0;
                    } else {
                        // 移動後の再チェック
                        const distClick = Math.max(Math.abs(monster.x - this.player.x), Math.abs(monster.y - this.player.y));
                        if (distClick < 2) {
                            // 隣接してしまった -> 攻撃権なし（通常行動スキップ）
                            actionCount = 0;
                        }
                        // まだ離れている -> 通常行動へ（2回目の移動になる）
                    }
                }

                for (let i = 0; i < actionCount; i++) {
                    await this.processMonsterAction(monster);
                    // 行動により死亡している可能性チェック
                    if (this.player.hp <= 0 || monster.hp <= 0) break;
                }
            }
        }

        // プレイヤーが生きている場合のみ空腹度処理
        if (this.player.hp > 0) {
            let hungerAmount = 1 + this.ringManager.getHungerModifier();
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

            if (this.level.isWalkable(x, y) && this.level.getTile(x, y) !== '+' && !this.isPositionOccupied(x, y)) {
                // 生成成功
                const monster = new MonsterClass(type, x, y);
                // WANDERSフラグなどがあればここで設定するが、デフォルトでOK
                // Rogueでは湧いたモンスターは WANDERS フラグを持つことが多い
                monster.setFlag(MonsterClass.FLAGS.WANDERS);
                this.monsters.push(monster);
                // this.display.showMessage('気配を感じる...'); // デバッグ用
                break;
            }
            attempts++;
        }
    }

    // monster.c create_monster() - 怪物召喚の巻物用
    createMonster() {
        const MonsterClass = Monster;

        // プレイヤー周囲9マスをランダムに探索 (monster.c line 591-605)
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
            { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
            { x: 0, y: 0 }  // プレイヤー位置も含む (後でスキップ)
        ];

        // ランダムな順序で探索
        const shuffled = directions.sort(() => Math.random() - 0.5);

        for (const dir of shuffled) {
            const x = this.player.x + dir.x;
            const y = this.player.y + dir.y;

            // プレイヤー位置はスキップ
            if (x === this.player.x && y === this.player.y) {
                continue;
            }

            // 範囲外チェック
            if (!this.level.isInBounds(x, y)) {
                continue;
            }

            // 配置可能チェック: 床・通路・階段・ドア、かつモンスターなし
            const tile = this.level.getTile(x, y);
            const hasMonster = this.monsters.some(m => m.x === x && m.y === y);

            if (!hasMonster && (tile === '.' || tile === '#' || tile === '%' || tile === '+')) {
                // モンスター生成
                const type = MonsterClass.getRandomMonster(this.currentFloor);
                if (!type) continue;

                const monster = new MonsterClass(type, x, y);

                // WANDERS または WAKENS フラグがあれば起こす (monster.c line 610-611)
                if (monster.hasFlag(MonsterClass.FLAGS.WANDERS) ||
                    monster.hasFlag(MonsterClass.FLAGS.WAKENS)) {
                    monster.removeFlag(MonsterClass.FLAGS.ASLEEP);
                }

                this.monsters.push(monster);
                this.updateDisplay();
                this.display.showMessage('モンスターが現れた！');
                return true;
            }
        }

        // 配置できなかった (monster.c line 614)
        this.display.showMessage(Mesg[64]);
        return false;
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

        // アイテム感知 (ポーション) - メッセージは出さないが効果切れ
        if (typeof status.detectObjects === 'number' && status.detectObjects > 0) {
            status.detectObjects--;
        }
    }

    // combatメソッドは廃止(resolveAttackに統合)

    // 探索 (search.c do_search)
    // 探索 (search.c do_search)
    search() {
        // オリジナルRogue仕様: sコマンド1回につき、2回探索判定を行う
        // これにより、実質的に半分のターンで探索できる（休息しつつ探索）
        for (let i = 0; i < 2; i++) {
            // 隠し扉探索
            const messages = this.level.search(this.player.x, this.player.y);
            for (const msg of messages) {
                this.display.showMessage(msg);
            }

            // 罠探索
            this.trapManager.search(1, false);
        }

        // ターン経過は呼び出し元(handlePlayerAction)で行うため削除
        // this.processTurn();
    }

    pickupItem() {
        const item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
        if (item) {
            if (this.player.addItem(item)) {
                this.items = this.items.filter(i => i !== item);
                this.display.showMessage(item.getDisplayName() + Mesg[69]);
                return true;
            } else {
                this.display.showMessage(Mesg[87]);
                return false;
            }
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

        this.display.renderDungeon(this.level, this.player, this.monsters, this.items, targetInfo, this.trapManager, this.inGameDebugMode);
        this.display.updateStatus(this.player, this.currentFloor);

        // インベントリ更新: 常にUI用リスト（足元含む）を表示
        const uiList = this.getUIInventoryList();
        this.display.updateInventory(uiList, this.player);

        // インベントリ画面ならカーソルを再適用
        if (this.state === 'inventory') {
            this.display.updateInventoryCursor(this.inventoryIndex);
        }

        this.display.updateDebugInfo(this); // デバッグ情報更新
    }

    // ===========================
    // メニュー・インベントリ操作
    // ===========================

    // UI表示用のインベントリリストを取得（足元のアイテムを含む）
    getUIInventoryList() {
        const list = [...this.player.inventory];

        // 足元のアイテム
        const itemAtFeet = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
        if (itemAtFeet) {
            // UI表示用にプロパティを追加するためのコピー
            // プロトタイプ継承してメソッドを使えるようにしつつ、独自プロパティを追加
            const uiItem = Object.assign(Object.create(Object.getPrototypeOf(itemAtFeet)), itemAtFeet);
            uiItem._isAtFeet = true;
            list.push(uiItem);
        }

        // 足元の階段
        if (this.level.getTile(this.player.x, this.player.y) === '%') {
            list.push({
                getDisplayName: () => '階段',
                _isStairs: true
            });
        }

        return list;
    }

    openInventory() {
        const list = this.getUIInventoryList();
        if (list.length === 0) {
            this.display.showMessage('持ち物がない。');
            return;
        }
        this.state = 'inventory';

        // 足元のアイテム・階段があればそこにカーソルを合わせる
        // 足元アイテムがあっても常に一番上を選択
        this.inventoryIndex = 0;

        this.display.updateInventoryCursor(this.inventoryIndex);
        this.display.showMessage('持ち物を選択中... (A:決定, B:戻る)');
        this.updateDisplay(); // 足元アイテム表示のために更新
    }

    closeInventory() {
        this.state = 'playing';
        this.display.updateInventoryCursor(-1); // カーソル消去
        this.display.showMessage('');
        this.updateDisplay(); // 通常インベントリリストに戻す
    }

    moveInventoryCursor(delta) {
        const list = this.getUIInventoryList();
        const len = list.length;
        if (len === 0) return;
        this.inventoryIndex = (this.inventoryIndex + delta + len) % len;
        this.display.updateInventoryCursor(this.inventoryIndex);
    }

    selectInventoryItem() {
        const list = this.getUIInventoryList();
        if (list.length === 0) return;

        const item = list[this.inventoryIndex];

        // 足元のアイテムや階段でもサブメニューを開く（selectInventoryItemでは分岐しない）
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
    // 識別モード (識別の巻物用)
    // ===========================

    selectItemToIdentify() {
        const list = this.player.inventory;
        if (list.length === 0) {
            this.display.showMessage('持ち物がない。');
            return;
        }

        this.state = 'identify';
        this.inventoryIndex = 0;

        // 識別モードでインベントリを表示
        this.display.updateInventory(list, this.player, true, this.inventoryIndex);
        this.display.updateInventoryCursor(this.inventoryIndex);
        this.display.showMessage('識別するアイテムを選択してください (A:決定, B:キャンセル)');
        this.updateDisplay();
    }

    moveIdentifyCursor(delta) {
        const list = this.player.inventory;
        if (list.length === 0) return;

        this.inventoryIndex += delta;
        if (this.inventoryIndex < 0) this.inventoryIndex = list.length - 1;
        if (this.inventoryIndex >= list.length) this.inventoryIndex = 0;

        // 識別モードで再描画
        this.display.updateInventory(list, this.player, true, this.inventoryIndex);
        this.display.updateInventoryCursor(this.inventoryIndex);
    }

    confirmIdentifyItem() {
        const list = this.player.inventory;
        if (list.length === 0) return;

        const item = list[this.inventoryIndex];

        // アイテムを識別
        item.identified = true;

        // アイテムの種類に応じて識別情報を更新 (use.c idntfy line 582-585)
        if (item.type === 'scroll' || item.type === 'potion' ||
            item.type === 'weapon' || item.type === 'armor' ||
            item.type === 'wand' || item.type === 'ring') {
            // Item.definitions の識別状態を更新
            // (簡易実装: 個別アイテムの識別のみ)
        }

        // メッセージ表示 (use.c idntfy line 586: mesg[206])
        const desc = item.getDisplayName();
        const msg = Mesg[206].replace('%s', desc);
        this.display.showMessage(msg);

        // 識別モード終了、ゲームに戻る
        this.state = 'playing';
        this.updateDisplay();

        // ターン経過
        this.processTurn();
    }

    cancelIdentify() {
        // 識別モード終了、ゲームに戻る (ターン経過なし)
        this.state = 'playing';
        this.display.showMessage(''); // メッセージクリア
        this.updateDisplay();
    }

    // ===========================
    // サブメニュー操作
    // ===========================

    openSubMenu() {
        this.state = 'submenu';
        this.subMenuIndex = 0;

        // UIリストを使用（足元アイテム対応）
        const list = this.getUIInventoryList();
        const item = list[this.inventoryIndex];

        // アイテム種別に応じたアクション定義
        this.subMenuOptions = [];

        // 足元アイテム・階段の場合の特別処理
        if (item._isAtFeet || item._isStairs) {
            if (item._isAtFeet) {
                this.subMenuOptions.push({ label: '拾う', action: 'pickup' });
            } else if (item._isStairs) {
                // 階段の場合
                // イェンダーの魔除けチェック
                if (this.player.inventory.some(i => i.id === 'amulet')) {
                    this.subMenuOptions.push({ label: '上る', action: 'ascend' });
                }
                this.subMenuOptions.push({ label: '降りる', action: 'descend' });
            }
            this.subMenuOptions.push({ label: 'やめる', action: 'cancel' });

            // 即座にメニュー表示してリターン（既存ロジックをスキップ）
            const x = 800;
            const y = 100 + (this.inventoryIndex * 24);
            this.display.showSubMenu(x, y, this.subMenuOptions, this.subMenuIndex);
            return;
        }

        // 以下、通常アイテムの処理
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
                // 装備中の指輪は「外す」のみ
                this.subMenuOptions.push({ label: '外す', action: 'unequip_ring' });
            } else {
                // 未装備の指輪は常に左右両方の選択肢を表示
                this.subMenuOptions.push({ label: '左手に装備', action: 'equip_ring_left' });
                this.subMenuOptions.push({ label: '右手に装備', action: 'equip_ring_right' });
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

        // 通常のインベントリアイテムを取得（足元アイテムではない）
        const item = this.player.inventory[this.inventoryIndex];

        switch (option.action) {
            case 'pickup':
                this.closeSubMenu();
                this.closeInventory();
                if (this.pickupItem()) {
                    this.processTurn();
                }
                break;
            case 'ascend':
                this.closeSubMenu();
                this.closeInventory();
                this.handlePlayerAction({ type: 'stairs', direction: 'up' });
                break;
            case 'descend':
                this.closeSubMenu();
                this.closeInventory();
                this.handlePlayerAction({ type: 'stairs', direction: 'down' }); // 方向指定を付加
                break;
            case 'use':
                this.closeSubMenu(); // サブメニュー閉じる
                // アイテム使用処理
                const success = this.useItem(this.inventoryIndex);
                if (success) {
                    // 識別の巻物などで識別モードに入った場合は、インベントリを閉じず、ターンも進めない
                    if (this.state === 'identify') {
                        // useItemで巻物が消費されてインベントリが変更されているため、
                        // カーソル位置を調整して再描画が必要。
                        if (this.identifyIndex >= this.player.inventory.length) {
                            this.identifyIndex = Math.max(0, this.player.inventory.length - 1);
                        }
                        this.display.updateInventory(this.player.inventory, this.player, true, this.identifyIndex);
                    } else {
                        this.closeInventory();
                        this.processTurn();
                    }
                }
                break;
            case 'equip':
                this.closeSubMenu();
                this.player.equip(item);
                const equipMsg = item.type === 'weapon' ? Mesg[107] : Mesg[100];
                this.display.showMessage(item.getDisplayName() + equipMsg);
                // 装備状態が変わったので再描画
                this.display.updateInventory(this.player.inventory, this.player);
                this.processTurn();
                break;
            case 'unequip':
                this.closeSubMenu();
                this.player.unequip(item);
                const unequipMsg = item.type === 'armor' ? Mesg[94] : Mesg[166];
                this.display.showMessage(item.getDisplayName() + unequipMsg);
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
        // メッセージ表示は廃止し、インベントリ画面を開く
        this.openInventory();
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

    async zapWand(index) {
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
            if (await this.wandManager.zap(item, dir)) {
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
                this.display.showMessage(Mesg[213]);
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
            this.display.showMessage(monster.name + Mesg[214]);

            // 拡張版: 杖の投擲効果（75%で発動）
            if (item.type === 'wand' && Math.random() < 0.75) {
                this.wandManager.zapMonster(monster, item.wandType);
                return true;
            }
            // 拡張版: ポーションの投擲効果
            else if (item.type === 'potion') {
                this.potionMonster(monster, item.potionType);
                return true;
            }
            // 通常のダメージ
            else {
                monster.takeDamage(damage);
                if (monster.isDead()) {
                    this.display.showMessage(Mesg[24].replace('%s', monster.name));
                    this.monsters = this.monsters.filter(m => m !== monster);
                    this.player.gainExp(monster.exp);
                }
            }
            return true;
        }
        return false;
    }

    // 拡張版: ポーション投擲効果 (throw.c potion_monster)
    potionMonster(monster, potionType) {
        const maxHp = monster.maxHp;

        switch (potionType) {
            case 'RESTORE_STRENGTH':
            case 'LEVITATION':
            case 'HALLUCINATION':
            case 'DETECT_MONSTER':
            case 'DETECT_OBJECTS':
            case 'SEE_INVISIBLE':
                // 効果なし
                break;
            case 'EXTRA_HEALING':
                // 敵のHPを回復（2/3）
                monster.hp += Math.floor((maxHp - monster.hp) * 2 / 3);
                this.display.showMessage(`${monster.name}は回復した！`);
                break;
            case 'INCREASE_STRENGTH':
            case 'HEALING':
            case 'RAISE_LEVEL':
                // 敵のHPを回復（1/5）
                monster.hp += Math.floor((maxHp - monster.hp) / 5);
                this.display.showMessage(`${monster.name}は少し回復した。`);
                break;
            case 'POISON':
                // ダメージ（HP/4+1）
                const poisonDamage = Math.floor(monster.hp / 4) + 1;
                monster.takeDamage(poisonDamage);
                this.display.showMessage(`${monster.name}は毒に侵された！`);
                if (monster.isDead()) {
                    this.display.showMessage(`${monster.name}を倒した!`);
                    this.monsters = this.monsters.filter(m => m !== monster);
                    this.player.gainExp(monster.exp);
                }
                break;
            case 'BLINDNESS':
                // 睡眠
                monster.flags |= Monster.FLAGS.ASLEEP;
                this.display.showMessage(`${monster.name}は眠ってしまった。`);
                break;
            case 'CONFUSION':
                // 混乱
                monster.flags |= Monster.FLAGS.CONFUSED;
                monster.confusedTurns = 12 + Math.floor(Math.random() * 11); // 12-22ターン
                this.display.showMessage(`${monster.name}は混乱した！`);
                break;
            case 'HASTE_SELF':
                // 加速（または鈍化解除）
                if (monster.flags & Monster.FLAGS.SLOWED) {
                    monster.flags &= ~Monster.FLAGS.SLOWED;
                    this.display.showMessage(`${monster.name}の動きが元に戻った。`);
                } else {
                    monster.flags |= Monster.FLAGS.HASTED;
                    this.display.showMessage(`${monster.name}は素早くなった！`);
                }
                break;
        }
    }

    flopWeapon(item, x, y) {
        // アイテムをマップ上に配置
        item.x = x;
        item.y = y;
        this.items.push(item);
    }

    // 混乱攻撃 (Medusa)
    // 混乱攻撃 (Medusa)
    mConfuse(monster) {
        // 視線チェック: Rogue仕様 (同じ部屋かつ暗くない、または隣接)
        if (!this.level.canSee(monster.x, monster.y, this.player.x, this.player.y)) {
            return false;
        }

        // 45%の確率で能力を失う（不発＆今後も使えない）
        if (Math.random() < 0.45) {
            monster.removeFlag(Monster.FLAGS.CONFUSES);
            return false;
        }

        // 残りのうち55%の確率で発動（能力失う＆混乱発動）
        // つまり全体から見て 0.55 * 0.55 = 30.25%
        if (Math.random() < 0.55) {
            monster.removeFlag(Monster.FLAGS.CONFUSES);
            this.display.showMessage(`${monster.name}の視線があなたを混乱させた！`);
            this.display.showMessage('あなたは混乱したようだ。');
            this.player.confuse();
            return true; // 行動終了
        }

        return false;
    }

    // 炎攻撃 (Dragon)
    async mFlames(monster) {

        // 50% で不発
        if (Math.random() < 0.5) return false;

        // 視線チェック
        // Rogue仕様: 同じ部屋かつ暗くない、または隣接
        if (!this.level.canSee(monster.x, monster.y, this.player.x, this.player.y)) {
            return false;
        }

        // 距離チェック (7マス以内)
        if (Math.abs(monster.x - this.player.x) > 7 || Math.abs(monster.y - this.player.y) > 7) {
            return false;
        }

        // 直線チェック
        const dx = Math.sign(this.player.x - monster.x);
        const dy = Math.sign(this.player.y - monster.y);

        if (dx !== 0 && dy !== 0 && Math.abs(this.player.x - monster.x) !== Math.abs(this.player.y - monster.y)) {
            return false; // 直線でも対角線でもない
        }

        // 間に障害物がないかチェック (自分とプレイヤーは除く)
        let cx = monster.x + dx;
        let cy = monster.y + dy;
        while (cx !== this.player.x || cy !== this.player.y) {
            if (!this.level.allowsSight(cx, cy)) {
                return false; // 壁など
            }
            cx += dx;
            cy += dy;
        }

        // 炎のエフェクト表示 (隣接していない場合のみ)
        const adjacent = Math.abs(monster.x - this.player.x) <= 1 && Math.abs(monster.y - this.player.y) <= 1;
        if (!adjacent) {
            await this.display.showFlameEffect(monster.x, monster.y, this.player.x, this.player.y, dx, dy,
                this.level, this.player, this.monsters, this.items, this.trapManager, this.debugMode);
        }

        // 攻撃実行 (isFlame: true)
        this.resolveAttack(monster, this.player, { isFlame: true });
        return true;
    }

    // 金貨を追う行動 (SEEKS_GOLD - Leprechaun)
    mSeekGold(monster) {
        // 部屋にいるか？
        const room = this.level.getRoomAt(monster.x, monster.y);
        if (!room) return false;

        // 同じ部屋にある金貨を探す
        // その上にモンスターがいないこと（自分は除く）
        const goldItem = this.items.find(item => {
            return item.type === 'gold' &&
                item.x >= room.x && item.x < room.x + room.w &&
                item.y >= room.y && item.y < room.y + room.h &&
                !this.monsters.some(m => m !== monster && m.x === item.x && m.y === item.y);
        });

        if (!goldItem) return false; // 金貨なし

        // 金貨が見つかった

        // 既に金貨の上にいる？
        if (monster.x === goldItem.x && monster.y === goldItem.y) {
            // 眠る & 金貨探索フラグ削除
            monster.addFlag(Monster.FLAGS.ASLEEP);
            monster.removeFlag(Monster.FLAGS.SEEKS_GOLD);
            return true;
        }

        // 金貨に向かって移動
        const dx = Math.sign(goldItem.x - monster.x);
        const dy = Math.sign(goldItem.y - monster.y);

        let moved = false;

        // まず斜め移動を試みる
        if (dx !== 0 && dy !== 0) {
            if (monster.canMoveTo(monster.x + dx, monster.y + dy, this.level, this.monsters, this.player)) {
                monster.x += dx;
                monster.y += dy;
                moved = true;
            }
        }

        // 斜めが無理ならX軸優先
        if (!moved && dx !== 0) {
            if (monster.canMoveTo(monster.x + dx, monster.y, this.level, this.monsters, this.player)) {
                monster.x += dx;
                moved = true;
            }
        }

        // Y軸を試す
        if (!moved && dy !== 0) {
            if (monster.canMoveTo(monster.x, monster.y + dy, this.level, this.monsters, this.player)) {
                monster.y += dy;
                moved = true;
            }
        }

        // 移動後、金貨の上なら寝る設定
        if (moved && monster.x === goldItem.x && monster.y === goldItem.y) {
            monster.addFlag(Monster.FLAGS.ASLEEP);
            monster.removeFlag(Monster.FLAGS.SEEKS_GOLD);
        }

        return moved;
    }

    // 戦闘解決 (hit.c / fight.c 再現)
    resolveAttack(attacker, defender, options = {}) {
        // プレイヤーの攻撃なら、相手のSEEKS_GOLD解除 (Leprechaunは怒って反撃してくる)
        if (attacker === this.player && defender instanceof Monster && defender.hasFlag(Monster.FLAGS.SEEKS_GOLD)) {
            defender.removeFlag(Monster.FLAGS.SEEKS_GOLD);
        }

        let hitChance = 0;
        let damage = 0;
        let message = '';
        const isPlayerAttacking = (attacker === this.player);
        const isFlame = options.isFlame || false;
        let levelUp = false; // レベルアップフラグ

        if (isPlayerAttacking) {
            // --- プレイヤーの攻撃 (rogue_hit) ---

            // 1. 命中率計算 (get_hit_chance)
            // 基礎値40 + レベル*2 + STR補正 + 武器補正
            hitChance = 40 + (this.player.level * 2);

            // STR補正 (簡易: 14以上で+1ずつ)
            if (this.player.str > 14) hitChance += (this.player.str - 14) * 3;

            // 武器補正 (オリジナルRogue準拠: hitBonus = 命中補正)
            if (this.player.weapon) {
                hitChance += (this.player.weapon.hitBonus || 0) * 3;
            }

            // 器用さの指輪補正 (オリジナルRogue準拠: ring.c ring_stats)
            const dexBonus = this.ringManager.getExpBonus();
            hitChance += dexBonus * 3;

            // 2. 命中判定
            if (Math.random() * 100 < hitChance) {
                // 3. ダメージ計算 (get_weapon_damage + damage_for_strength)
                if (this.player.weapon) {
                    damage = this.parseDice(this.player.weapon.value || '1d4');
                    // オリジナルRogue準拠: damageBonus = ダメージ補正
                    damage += (this.player.weapon.damageBonus || 0);
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

                message = `${defender.name}に命中した。(${damage}ダメージ)`;
                defender.takeDamage(damage);

                if (defender.isDead()) {
                    message += ` -> ` + Mesg[24].replace('%s', defender.name) + `(${defender.exp} exp)`;
                    this.monsters = this.monsters.filter(m => m !== defender);
                    const oldLevel = this.player.level;
                    this.player.gainExp(defender.exp);
                    if (this.player.level > oldLevel) {
                        levelUp = true;
                    }

                    // 拘束解除
                    if (this.player.held) {
                        this.player.held = false;
                        message += ' (拘束が解けた)';
                    }
                }
            } else {
                message = Mesg[22].replace('%s', 'あなた');
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

            // 炎の場合: 命中率減少 (hit.c) -> Originalにはないので削除
            // if (isFlame) {
            //     hitChance -= this.player.level;
            // }

            // ACによる回避 (RogueのACは命中率にも影響するが、Web版はダメージ軽減に使っているので、ここでは簡易的に)
            // プレイヤーのアーマーが強いほど当たりにくいボーナスを少し入れる
            hitChance -= (this.player.armor * 2);

            // 2. 命中判定
            if (Math.random() * 100 < hitChance) {
                // 3. ダメージ計算
                // attacker.damageは "1d6" のような文字列
                damage = this.parseDice(attacker.damage);

                // 4. プレイヤーのダメージ軽減
                // 炎攻撃の場合、まずAC値をそのまま減算する (Original Rogue logic)
                if (isFlame) {
                    damage = Math.max(1, damage - this.player.armor);
                }

                // 表示用ダメージ計算
                let displayDamage = damage;
                if (!isFlame) {
                    // 通常攻撃の場合はアーマー軽減率を適用した値を表示
                    displayDamage = this.player.getActualDamage(damage);
                }

                if (isFlame) {
                    this.display.showMessage(Mesg[200] + `があなたを包んだ！(${displayDamage}ダメージ)`);
                } else {
                    this.display.showMessage(Mesg[19].replace('%s%s', attacker.name).replace('%s', '') + `(${displayDamage}ダメージ)`);
                }

                this.player.takeDamage(damage, isFlame); // 炎の場合はアーマー軽減(AC*3%)を無視(既に減算済み)

                // 特殊攻撃判定
                SpecialHit.check(this, attacker);

                if (this.player.hp <= 0) {
                    message += ' -> あなたは死にました...';
                    this.display.showMessage(message);
                    // 死亡メッセージ表示状態に遷移（Aボタン待ち）
                    this.state = 'death_message';
                    this.deathCause = { monster: attacker, cause: null };
                    return; // これ以降の処理をスキップ
                }
            } else {
                if (isFlame) {
                    message = Mesg[200] + Mesg[213];
                } else {
                    message = Mesg[18].replace('%s', attacker.name);
                }
            }
        }

        this.display.showMessage(message);

        if (levelUp) {
            this.display.showMessage(`レベル ${this.player.level} にようこそ。`);
        }
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

    // ゲームクリア（勝利）
    gameClear() {
        this.state = 'victory';

        // ゲームクリア時はデバッグモードを強制オフ
        if (this.inGameDebugMode) {
            this.inGameDebugMode = false;
            if (this.display.debugMode) {
                this.display.toggleDebugMode();
            }
        }

        // 売却計算とゴールド加算
        this.sellResults = [];
        let totalValue = 0;
        const newInventory = [];

        this.player.inventory.forEach(item => {
            if (item.type === 'food') {
                newInventory.push(item);
            } else {
                item.isIdentified = true; // 全識別
                const val = this.getItemWorth(item);
                totalValue += val;
                this.sellResults.push({
                    name: item.getDisplayName(),
                    value: val
                });
            }
        });

        this.player.inventory = newInventory;
        this.player.gold += totalValue;

        // バナー画面表示 (Display.js)
        this.display.drawVictory(BANNER_DATA, Mesg);
    }

    // 売却画面表示 (InputManagerから呼ばれる)
    showSellingScreen() {
        this.state = 'selling';
        this.display.drawSelling(this.sellResults, Mesg);
    }

    // ゲーム終了・ランキングへ (InputManagerから呼ばれる)
    finishGame() {
        this.state = 'gameover';
        this.scoreManager.killedBy(null, this.scoreManager.DEATH_CAUSES.WIN);
        this.waitForRanking();
    }

    // アイテムの価値取得 (簡易実装)
    getItemWorth(item) {
        // TODO: オリジナル準拠の価値(worth)を定義する必要あり
        let worth = 0;
        switch (item.type) {
            case 'weapon': worth = 80; break;
            case 'armor': worth = 100; break;
            case 'scroll': worth = 50; break;
            case 'potion': worth = 50; break;
            case 'wand': worth = 150; break;
            case 'ring': worth = 200; break;
            case 'amulet': worth = 1000; break;
            default: worth = 10; break;
        }
        // 識別済みなら価値が上がるなどの要素もオリジナルにはある
        return worth;
    }

    gameOver(monster = null, cause = null) {
        this.state = 'gameover';

        // ゲームオーバー時はデバッグモードを強制オフ
        if (this.inGameDebugMode) {
            this.inGameDebugMode = false;
            // display側の表示も消すには toggleDebugMode だが、状態整合性のため直接操作かメソッド呼び出しが必要
            // display.toggleDebugMode はトグルなので、現在の状態を見てオフにする
            if (this.display.debugMode) {
                this.display.toggleDebugMode();
            }
        }

        // スコアマネージャーで死亡処理
        // causeがnullの場合はモンスターに殺された扱い
        this.scoreManager.killedBy(monster, cause);

        // Enterキーでランキング表示、その後タイトルへ
        this.waitForRanking();
    }

    waitForRanking() {
        const handleKey = (e) => {
            if (e.code === this.input.keyConfig.buttonA || e.key === 'Enter') {
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
