// ===========================
// 罠システム (trap.c 完全移植)
// ===========================

import { Mesg } from './mesg_J.js';
import { SpecialHit } from './spechit.js';

// 罠の種類定義 (rogue.h)
export const TrapType = {
    NO_TRAP: -1,
    TRAP_DOOR: 0,      // 落とし穴
    BEAR_TRAP: 1,      // 熊の罠
    TELE_TRAP: 2,      // テレポート罠
    DART_TRAP: 3,      // 毒ダーツ罠
    SLEEPING_GAS_TRAP: 4, // 睡眠ガス罠
    RUST_TRAP: 5       // 錆び罠
};

export const TRAPS = 6; // 罠の種類数
export const MAX_TRAPS = 10; // 1フロアの最大罠数

// 罠のメッセージ (trap_strings)
const TRAP_MESSAGES = {
    [TrapType.TRAP_DOOR]: {
        name: '落とし穴',
        trigger: '床が崩れ落ちた！'
    },
    [TrapType.BEAR_TRAP]: {
        name: '熊の罠',
        trigger: '熊の罠にかかった！'
    },
    [TrapType.TELE_TRAP]: {
        name: 'テレポート罠',
        trigger: 'テレポートした！'
    },
    [TrapType.DART_TRAP]: {
        name: '毒ダーツ罠',
        trigger: '毒ダーツが飛んできた！'
    },
    [TrapType.SLEEPING_GAS_TRAP]: {
        name: '睡眠ガス罠',
        trigger: '睡眠ガスが噴き出した！'
    },
    [TrapType.RUST_TRAP]: {
        name: '錆び罠',
        trigger: '酸が降りかかった！'
    }
};

export class Trap {
    constructor(type, row, col) {
        this.trapType = type;
        this.row = row;
        this.col = col;
        this.hidden = true; // 初期状態は隠れている
    }

    getName() {
        return TRAP_MESSAGES[this.trapType]?.name || '未知の罠';
    }

    getTriggerMessage() {
        return TRAP_MESSAGES[this.trapType]?.trigger || '罠が発動した！';
    }
}

export class TrapManager {
    constructor(game) {
        this.game = game;
        this.traps = [];
        this.trapDoorActive = false; // 落とし穴フラグ
        this.bearTrapTurns = 0;      // 熊の罠の拘束ターン数
    }

    reset() {
        this.traps = [];
        this.trapDoorActive = false;
        this.bearTrapTurns = 0;
    }

    // trap_at() - 指定座標に罠があるかチェック
    trapAt(row, col) {
        const trap = this.traps.find(t => t.row === row && t.col === col);
        return trap ? trap.trapType : TrapType.NO_TRAP;
    }

    // trap_player() - 罠発動処理
    async trapPlayer(row, col) {
        const trapType = this.trapAt(row, col);
        if (trapType === TrapType.NO_TRAP) {
            return;
        }

        // 浮遊中は罠を踏まない (use.c LEVITATION)
        if (this.game.player.status && this.game.player.status.levitate > 0) {
            return;
        }

        // 罠を可視化
        const trap = this.traps.find(t => t.row === row && t.col === col);
        if (trap) {
            trap.hidden = false;
        }

        // 経験値による回避判定
        // ring_exp: 器用さの指輪の修正値 (ring.c ring_stats line 296)
        const ringExp = this.game.ringManager ? this.game.ringManager.getExpBonus() : 0;
        if (Math.random() * 100 < (this.game.player.level + ringExp)) {
            this.game.display.showMessage(Mesg[228]);
            return;
        }

        // 罠の種類別処理
        switch (trapType) {
            case TrapType.TRAP_DOOR:
                this.triggerTrapDoor();
                break;
            case TrapType.BEAR_TRAP:
                this.triggerBearTrap();
                break;
            case TrapType.TELE_TRAP:
                this.triggerTeleTrap();
                break;
            case TrapType.DART_TRAP:
                this.triggerDartTrap();
                break;
            case TrapType.SLEEPING_GAS_TRAP:
                await this.triggerSleepingGasTrap();
                break;
            case TrapType.RUST_TRAP:
                this.triggerRustTrap();
                break;
        }
    }

    // 落とし穴
    triggerTrapDoor() {
        this.trapDoorActive = true;
        this.game.display.showMessage(Mesg[217]);
        // 次の階層へ強制移動
        this.game.nextLevel();
    }

    // 熊の罠
    triggerBearTrap() {
        this.game.display.showMessage(Mesg[219]);
        // 4-7ターン拘束
        this.bearTrapTurns = 4 + Math.floor(Math.random() * 4);
    }

    // テレポート罠
    triggerTeleTrap() {
        this.game.display.showMessage(Mesg[221]);
        // ランダムな位置にテレポート
        this.teleportPlayer();
    }

    // 毒ダーツ罠
    triggerDartTrap() {
        this.game.display.showMessage(Mesg[223]);

        // 1d6ダメージ
        const damage = 1 + Math.floor(Math.random() * 6);
        this.game.player.hp -= damage;

        if (this.game.player.hp <= 0) {
            this.game.player.hp = 0;
            this.game.display.showMessage('あなたは死にました...');
            this.game.state = 'death_message';
            this.game.deathCause = { monster: null, cause: this.game.scoreManager.DEATH_CAUSES.POISON_DART };
            return;
        }

        // 40%の確率でSTR-1 (力維持の指輪がない場合)
        const hasSustain = this.game.ringManager && this.game.ringManager.hasSustainStrength();

        if (!hasSustain && Math.random() < 0.4 && this.game.player.str >= 3) {
            this.game.player.str--;
            this.game.player.updateStats(); // ステータス表示更新 (trap.c line 95)
            // オリジナルRogueでは特別なメッセージは表示しない (trap.c line 91-94)
        }
    }

    // 睡眠ガス罠
    async triggerSleepingGasTrap() {
        this.game.display.showMessage(Mesg[225]);
        // take_a_nap() - プレイヤーが数ターン行動不能
        this.game.display.showMessage('眠ってしまった...');

        // モンスターが数ターン行動
        // ランダムに2-5ターン (use.c take_a_nap: get_rand(2, 5))
        const sleepTurns = 2 + Math.floor(Math.random() * 4);

        // アイコン表示用に sleep ステータスを設定
        this.game.player.status.sleep = sleepTurns;

        await this.game.takeNap();

        this.game.display.showMessage('目が覚めた。');
        // 既にターン経過処理を行ったので、呼び出し元のmovePlayerによるprocessTurnはスキップする
        this.game.skipTurnProcessing = true;
    }

    // 錆び罠 (trap.c line 104-107)
    triggerRustTrap() {
        this.game.display.showMessage(Mesg[227]); // "酸が降りかかった！"
        // オリジナルRogue準拠: rust((object *) 0) を呼ぶ (trap.c line 106)
        SpecialHit.rust(this.game, null);
    }

    // テレポート処理
    teleportPlayer() {
        const level = this.game.level;
        let newX, newY;
        let attempts = 0;

        // ランダムな歩ける場所を探す
        do {
            const room = level.rooms[Math.floor(Math.random() * level.rooms.length)];
            const roomWidth = room.right_col - room.left_col + 1;
            const roomHeight = room.bottom_row - room.top_row + 1;
            newX = room.left_col + 1 + Math.floor(Math.random() * (roomWidth - 2));
            newY = room.top_row + 1 + Math.floor(Math.random() * (roomHeight - 2));
            attempts++;
        } while (!level.isWalkable(newX, newY) && attempts < 100);

        if (attempts < 100) {
            this.game.player.x = newX;
            this.game.player.y = newY;
            level.updateVisibility(newX, newY);
        }
    }

    // add_traps() - ダンジョン生成時に罠を配置
    addTraps(level, currentFloor) {
        this.traps = [];

        // 階層別の罠数
        let numTraps;
        if (currentFloor <= 2) {
            numTraps = 0;
        } else if (currentFloor <= 7) {
            numTraps = Math.floor(Math.random() * 3); // 0-2
        } else if (currentFloor <= 11) {
            numTraps = 1 + Math.floor(Math.random() * 2); // 1-2
        } else if (currentFloor <= 16) {
            numTraps = 2 + Math.floor(Math.random() * 2); // 2-3
        } else if (currentFloor <= 21) {
            numTraps = 2 + Math.floor(Math.random() * 3); // 2-4
        } else if (currentFloor <= 26) {
            numTraps = 3 + Math.floor(Math.random() * 3); // 3-5
        } else {
            numTraps = 5 + Math.floor(Math.random() * (MAX_TRAPS - 4)); // 5-10
        }

        for (let i = 0; i < numTraps; i++) {
            const trapType = Math.floor(Math.random() * TRAPS);

            // ランダムな床タイルを選ぶ
            let row, col;
            let attempts = 0;
            // R_ROOM | R_MAZE (0x02 | 0x04 = 0x06)
            const validRooms = level.rooms.filter(r => r.is_room & 0x06);

            do {
                if (validRooms.length === 0) break;
                const room = validRooms[Math.floor(Math.random() * validRooms.length)];
                const roomWidth = room.right_col - room.left_col + 1;
                const roomHeight = room.bottom_row - room.top_row + 1;
                row = room.top_row + 1 + Math.floor(Math.random() * (roomHeight - 2));
                col = room.left_col + 1 + Math.floor(Math.random() * (roomWidth - 2));
                attempts++;
            } while (
                (!level.isWalkable(row, col) ||
                    this.trapAt(row, col) !== TrapType.NO_TRAP ||
                    this.game.items.some(item => item.x === col && item.y === row)) &&
                attempts < 50
            );

            if (attempts < 50) {
                this.traps.push(new Trap(trapType, row, col));
            }
        }
    }

    // show_traps() - 全罠を表示（魔法の地図用）
    showTraps() {
        this.traps.forEach(trap => {
            trap.hidden = false;
        });
    }

    // search() - 隠し扉・罠を探す
    search(times, isAuto = false) {
        const player = this.game.player;
        const level = this.game.level;
        const ringExp = 0; // TODO: 指輪実装後

        let shown = 0;

        // 周囲8マスをチェック
        for (let s = 0; s < times; s++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const row = player.y + dy;
                    const col = player.x + dx;

                    if (!level.isInBounds(col, row)) continue;

                    // 隠れた罠を探す
                    const trap = this.traps.find(t =>
                        t.row === row && t.col === col && t.hidden
                    );

                    if (trap) {
                        // 17% + 経験値 の確率で発見
                        if (Math.random() * 100 < (17 + player.level + ringExp)) {
                            trap.hidden = false;
                            shown++;
                            this.game.display.showMessage(`${trap.getName()}を発見した！`);
                        }
                    }

                    // TODO: 隠し扉の探索も追加
                }
            }
        }
        return shown;
    }

    // 熊の罠の拘束チェック
    // ターン経過処理 (Game.processTurnから呼ばれる)
    processTurn() {
        if (this.bearTrapTurns > 0) {
            this.bearTrapTurns--;
            // 拘束が解けたかチェックしたいが、メッセージ表示タイミングはプレイヤー行動直前が良いか？
            // ここで0になっても、次の行動時に「動けるようになった」とわかるのが自然。
        }
    }

    // 熊の罠の拘束チェック (移動試行時に呼ばれる)
    isBearTrapped() {
        if (this.bearTrapTurns > 0) {
            this.game.display.showMessage(Mesg[68]); // "罠にかかって動けない。"
            return true;
        }
        // 0になった瞬間のメッセージ処理はここで行うと移動試行時しか出ない。
        // でも移動しようとして初めて「あ、動ける」と気づくのは自然かも？
        // オリジナルRogueではreg_moveで減算して、移動しようとしたときにチェック。
        return false;
    }

    // 罠の描画情報を取得
    getVisibleTraps() {
        return this.traps.filter(trap => !trap.hidden);
    }
}
