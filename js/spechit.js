
import { Monster } from './monster.js';

export class SpecialHit {
    /**
     * @param {import('./game.js').Game} game
     * @param {import('./monster.js').Monster} monster
     */
    static check(game, monster) {
        // 混乱しているモンスターはたまに特殊攻撃失敗
        if (monster.hasFlag(Monster.FLAGS.CONFUSED) && Math.random() < 0.66) {
            return;
        }

        if (monster.hasFlag(Monster.FLAGS.RUSTS)) {
            this.rust(game, monster);
        }
        if (monster.hasFlag(Monster.FLAGS.HOLDS)) {
            // 本来はlevitateしていれば無効
            // ホールド状態にする (Gameクラスで移動制限が必要)
            if (!game.player.held) {
                game.display.showMessage(`${monster.name}に締め上げられた！`);
                game.player.held = true;
            }
        }
        if (monster.hasFlag(Monster.FLAGS.FREEZES)) {
            this.freeze(game, monster);
        }
        if (monster.hasFlag(Monster.FLAGS.STINGS)) {
            this.sting(game, monster);
        }
        if (monster.hasFlag(Monster.FLAGS.DRAINS_LIFE)) {
            this.drainLife(game);
        }
        if (monster.hasFlag(Monster.FLAGS.DROPS_LEVEL)) {
            this.dropLevel(game);
        }
        if (monster.hasFlag(Monster.FLAGS.STEALS_GOLD)) {
            this.stealGold(game, monster);
        } else if (monster.hasFlag(Monster.FLAGS.STEALS_ITEM)) {
            this.stealItem(game, monster);
        }
    }

    static rust(game, monster) {
        const armor = game.player.equippedArmor;
        if (!armor || armor.type !== 'armor') return;

        // 防具維持の指輪チェック
        if (game.ringManager && game.ringManager.hasMaintainArmor()) {
            return;
        }

        // 革の鎧(LEATHER)などは錆びない判定 (Rogue: a_class < 3 など、ここでは簡易的にIDで革チェック)
        // または armor.value をACとして使っていて、低いほど良いRogueと違い、高いほど防御が高いなら
        // 0以下にはならないようにする

        // 簡易実装: IDに 'leather' が入っていたら錆びない
        if (armor.id.includes('leather')) {
            return;
        }

        if (!armor.protected) {
            if (armor.value > 0) {
                game.display.showMessage('鎧が少し錆びた！');
                armor.value--;
                game.player.updateStats();
            }
        }
    }

    static freeze(game, monster) {
        // 12%で発動しない
        if (Math.random() < 0.12) return;

        // 睡眠/凍結ターン数 (簡易: 2-3ターン)
        // 本来はSTRなどにより変動
        const turns = Math.floor(Math.random() * 2) + 2;

        game.display.showMessage(`${monster.name}に凍らされた！`);

        // プレイヤーの状態異常を設定
        game.player.status.sleep += turns;
    }

    static sting(game, monster) {
        // 力維持の指輪チェック
        if (game.ringManager && game.ringManager.hasSustainStrength()) {
            return;
        }

        // 本来は確率計算があるが簡易的に35%
        if (Math.random() < 0.35) {
            game.display.showMessage(`${monster.name}の毒針が刺さった！`);
            if (game.player.str > 3) {
                game.player.str--;
                game.display.showMessage('力が弱くなった気がする。');
            }
        }
    }

    static drainLife(game) {
        // 力維持の指輪では防げない

        if (Math.random() < 0.6) return; // 60%失敗

        game.display.showMessage('生き血を吸われた気がする。');
        game.player.maxHp--;
        game.player.hp--;
        if (game.player.hp < 1) game.player.hp = 1;
        if (game.player.maxHp < 1) game.player.maxHp = 1;
    }

    static dropLevel(game) {
        if (Math.random() < 0.8 || game.player.exp <= 5) return;

        game.display.showMessage('エネルギーを吸い取られた気がする。');

        if (game.player.level > 1) {
            game.player.level--;
            // 前のレベルの基準値までExpを下げる（簡易計算）
            game.player.exp = (game.player.level - 1) * 10;

            const hpLoss = Math.floor(Math.random() * 5) + 1;
            game.player.maxHp -= hpLoss;
            if (game.player.maxHp < 1) game.player.maxHp = 1;
            if (game.player.hp > game.player.maxHp) game.player.hp = game.player.maxHp;

            game.display.showMessage(`レベルが ${game.player.level} に下がってしまった！`);
        }
    }

    static stealGold(game, monster) {
        if (game.player.gold <= 0 || Math.random() < 0.1) return;

        const amount = Math.floor(Math.random() * 50) + game.player.level * 10;
        const stolen = Math.min(game.player.gold, amount);

        game.player.gold -= stolen;
        game.display.showMessage('金貨を盗まれた！');

        this.disappear(game, monster);
    }

    static stealItem(game, monster) {
        if (Math.random() < 0.15) return;
        if (game.player.inventory.length === 0) {
            this.disappear(game, monster);
            return;
        }

        // インベントリからランダムに選ぶ
        const candidates = game.player.inventory.filter(item =>
            item !== game.player.weapon && item !== game.player.equippedArmor
        );

        if (candidates.length === 0) return;

        const item = candidates[Math.floor(Math.random() * candidates.length)];

        game.player.removeItem(item);
        game.display.showMessage(`${item.getDisplayName()}を盗まれた！`);

        this.disappear(game, monster);
    }

    static disappear(game, monster) {
        game.monsters = game.monsters.filter(m => m !== monster);
        // 消えたモンスターの描画削除は次のrenderで自動的に行われる
        // メッセージ表示のみ
        game.display.showMessage(`${monster.name}は消え去った。`);
    }
}
