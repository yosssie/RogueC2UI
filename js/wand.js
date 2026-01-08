// ===========================
// 杖システム (zap.c 移植)
// ===========================

import { Monster } from './monster.js';

export class WandManager {
    constructor(game) {
        this.game = game;

        // 杖の種類定義 (rogue.h)
        this.WAND_TYPES = {
            TELE_AWAY: 0,        // テレポート
            SLOW_MONSTER: 1,     // 鈍化
            CONFUSE_MONSTER: 2,  // 混乱
            INVISIBILITY: 3,     // 透明化
            POLYMORPH: 4,        // 変身
            HASTE_MONSTER: 5,    // 加速
            PUT_TO_SLEEP: 6,     // 睡眠
            MAGIC_MISSILE: 7,    // 魔法の矢
            CANCELLATION: 8,     // 無効化
            DO_NOTHING: 9        // 何もしない
        };
    }

    /**
     * 杖を使う (zap.c zapp())
     * @param {Object} wand - 杖アイテム
     * @param {number} dir - 方向 (0-7)
     */
    zap(wand, dir) {
        if (!wand || wand.type !== 'wand') {
            this.game.display.showMessage('それは杖ではない。');
            return false;
        }

        if (wand.charges <= 0) {
            this.game.display.showMessage('杖は使い果たされている。');
            return false;
        }

        // チャージ消費
        wand.charges--;

        // 方向に杖を振る
        const target = this.getZappedMonster(dir);

        if (target) {
            this.zapMonster(target, wand.wandType);
        }

        // 拡張版: 使ったら必ず識別される
        wand.identified = true;

        return true;
    }

    /**
     * 杖の効果が当たるモンスターを取得 (zap.c get_zapped_monster())
     * @param {number} dir - 方向
     * @returns {Object|null} - モンスター
     */
    getZappedMonster(dir) {
        const player = this.game.player;
        let row = player.y;
        let col = player.x;

        // 方向ベクトル
        const dirs = [
            [-1, 0],  // 上
            [-1, 1],  // 右上
            [0, 1],   // 右
            [1, 1],   // 右下
            [1, 0],   // 下
            [1, -1],  // 左下
            [0, -1],  // 左
            [-1, -1]  // 左上
        ];

        const [dy, dx] = dirs[dir];

        // 杖の効果が届く範囲を探索
        for (let i = 0; i < 20; i++) {
            const prevRow = row;
            const prevCol = col;

            row += dy;
            col += dx;

            // 範囲外チェック
            if (!this.game.level.isInBounds(col, row)) {
                return null;
            }

            // 壁にぶつかったら終了
            if (!this.game.level.isWalkable(col, row)) {
                return null;
            }

            // 同じ位置なら終了
            if (row === prevRow && col === prevCol) {
                return null;
            }

            // モンスターがいるかチェック
            const monster = this.game.monsters.find(m => m.x === col && m.y === row);
            if (monster) {
                return monster;
            }
        }

        return null;
    }

    /**
     * モンスターに杖の効果を適用 (zap.c zap_monster())
     * @param {Object} monster - モンスター
     * @param {number} wandType - 杖の種類
     */
    zapMonster(monster, wandType) {
        switch (wandType) {
            case this.WAND_TYPES.SLOW_MONSTER:
                // 鈍化
                if (monster.hasFlag(Monster.FLAGS.HASTED)) {
                    monster.removeFlag(Monster.FLAGS.HASTED);
                    this.game.display.showMessage(`${monster.name}の動きが元に戻った。`);
                } else {
                    monster.setFlag(Monster.FLAGS.SLOWED);
                    this.game.display.showMessage(`${monster.name}の動きが遅くなった。`);
                }
                break;

            case this.WAND_TYPES.HASTE_MONSTER:
                // 加速
                if (monster.hasFlag(Monster.FLAGS.SLOWED)) {
                    monster.removeFlag(Monster.FLAGS.SLOWED);
                    this.game.display.showMessage(`${monster.name}の動きが元に戻った。`);
                } else {
                    monster.setFlag(Monster.FLAGS.HASTED);
                    this.game.display.showMessage(`${monster.name}の動きが速くなった！`);
                }
                break;

            case this.WAND_TYPES.TELE_AWAY:
                // テレポート
                this.teleAway(monster);
                this.game.display.showMessage(`${monster.name}が消えた！`);
                break;

            case this.WAND_TYPES.CONFUSE_MONSTER:
                // 混乱
                monster.setFlag(Monster.FLAGS.CONFUSED);
                monster.confusedTurns = 12 + Math.floor(Math.random() * 11); // 12-22ターン
                this.game.display.showMessage(`${monster.name}は混乱した！`);
                break;

            case this.WAND_TYPES.INVISIBILITY:
                // 透明化
                monster.setFlag(Monster.FLAGS.INVISIBLE);
                this.game.display.showMessage(`${monster.name}が見えなくなった。`);
                break;

            case this.WAND_TYPES.POLYMORPH:
                // 変身（ランダムなモンスターに変化）
                const oldName = monster.name;
                const newType = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
                // Monster.definitions は static なので直接アクセス
                const MonsterData = Monster.definitions[newType];
                if (MonsterData) {
                    Object.assign(monster, {
                        name: MonsterData.name,
                        symbol: newType, // 変身したのでシンボルも変わる
                        // type: newType, // typeも変えると振る舞いも変わるか？ Monsterクラスによるが
                        // 今回は Monster クラスのプロパティを上書き
                        hp: MonsterData.hp,
                        maxHp: MonsterData.hp,
                        damage: MonsterData.damage,
                        exp: MonsterData.exp,
                        // flags もリセットすべきか？ オリジナルは維持するかもだが、能力が変わるので再設定
                        // 今回は簡易的に名前とステータスだけ
                    });
                    // flagsの更新が必要（新しいモンスターの能力）
                    monster.flags = 0;
                    if (MonsterData.flags) {
                        MonsterData.flags.forEach(f => {
                            if (Monster.FLAGS[f]) monster.flags |= Monster.FLAGS[f];
                        });
                    }

                    this.game.display.showMessage(`${oldName}が${monster.name}に変身した！`);
                }
                break;

            case this.WAND_TYPES.PUT_TO_SLEEP:
                // 睡眠
                monster.setFlag(Monster.FLAGS.ASLEEP);
                monster.sleepTurns = 3 + Math.floor(Math.random() * 4); // 3-6ターン
                this.game.display.showMessage(`${monster.name}は眠ってしまった。`);
                break;

            case this.WAND_TYPES.MAGIC_MISSILE:
                // 魔法の矢（ダメージ）
                const damage = Math.floor(Math.random() * 6) + 6; // 6-11ダメージ
                monster.hp -= damage;
                this.game.display.showMessage(`${monster.name}に${damage}のダメージ！`);

                if (monster.hp <= 0) {
                    this.game.killMonster(monster);
                }
                break;

            case this.WAND_TYPES.CANCELLATION:
                // 無効化（特殊能力を無効化）
                // フラグをクリアするが、種族特性はどうする？
                // Rogueでは invisible, confusion, etc を消す
                monster.removeFlag(Monster.FLAGS.INVISIBLE);
                monster.removeFlag(Monster.FLAGS.CONFUSED);
                monster.removeFlag(Monster.FLAGS.ASLEEP); // ついでに起こすか？
                // 飛行とかは消える？
                this.game.display.showMessage(`${monster.name}の特殊能力が無効化された。`);
                break;

            case this.WAND_TYPES.DO_NOTHING:
                // 何もしない
                this.game.display.showMessage('何も起こらなかった。');
                break;
        }

        // モンスターを起こす (攻撃か、特定の行動でのみ起きるべきだが、wandは基本起こす)
        // ただし睡眠の杖は起こさない
        if (wandType !== this.WAND_TYPES.PUT_TO_SLEEP && monster.hasFlag(Monster.FLAGS.ASLEEP)) {
            // 攻撃系の杖なら起きる
            if (wandType === this.WAND_TYPES.MAGIC_MISSILE ||
                wandType === this.WAND_TYPES.POLYMORPH ||
                wandType === this.WAND_TYPES.SLOW_MONSTER || // 状態変化も起こす？
                wandType === this.WAND_TYPES.HASTE_MONSTER) {

                monster.removeFlag(Monster.FLAGS.ASLEEP);
                // this.game.display.showMessage(`${monster.name}は目を覚ました！`);
            }
        }
    }

    /**
     * モンスターをランダムな位置にテレポート (zap.c tele_away())
     * @param {Object} monster - モンスター
     */
    teleAway(monster) {
        // ランダムな歩ける位置を探す
        let newX, newY;
        let attempts = 0;

        do {
            newX = Math.floor(Math.random() * this.game.level.width);
            newY = Math.floor(Math.random() * this.game.level.height);
            attempts++;
        } while (
            (!this.game.level.isWalkable(newX, newY) ||
                this.game.monsters.some(m => m.x === newX && m.y === newY)) &&
            attempts < 100
        );

        if (attempts < 100) {
            monster.x = newX;
            monster.y = newY;
        }
    }
}
