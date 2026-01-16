
import { Monster } from './monster.js';
import { Mesg } from './mesg_J.js';

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
            // オリジナルRogue準拠: 浮遊中は拘束されない (spechit.c line 53)
            if (!game.player.status.levitate && !game.player.status.held) {
                game.display.showMessage(`${monster.name}に締め上げられた！`);
                game.player.status.held = true;
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

        // オリジナルRogue準拠: AC計算 (object.c get_armor_class)
        const currentAC = armor.value + armor.damageBonus;

        // オリジナルRogue準拠: AC <= 1 なら錆びない (spechit.c rust line 78-80)
        if (currentAC <= 1) {
            return;
        }

        // 革の鎧(LEATHER)は錆びない (spechit.c rust line 79)
        if (armor.id.includes('leather')) {
            return;
        }

        // 防具維持の指輪チェック (spechit.c rust line 82)
        if (game.ringManager && game.ringManager.hasMaintainArmor()) {
            // 防具保護されている場合はメッセージのみ (spechit.c rust line 84-85)
            if (monster && !monster.rustVanished) {
                game.display.showMessage(Mesg[201]); // "鎧が一瞬輝いた。"
                monster.rustVanished = true;
            }
            return;
        }

        // 防具保護の巻物チェック (spechit.c rust line 82)
        if (armor.protected) {
            if (monster && !monster.rustVanished) {
                game.display.showMessage(Mesg[201]); // "鎧が一瞬輝いた。"
                monster.rustVanished = true;
            }
            return;
        }

        // オリジナルRogue準拠: 錆びはエンチャント値(d_enchant)を減らす (spechit.c rust line 88)
        game.display.showMessage(Mesg[202]); // "鎧が錆びた。"
        armor.damageBonus--;
        game.player.updateStats();
    }

    static freeze(game, monster) {
        // 12%で発動しない
        if (Math.random() < 0.12) return;

        // 睡眠/凍結ターン数 (簡易: 2-3ターン)
        // 本来はSTRなどにより変動
        const turns = Math.floor(Math.random() * 2) + 2;

        game.display.showMessage(Mesg[203]);

        // プレイヤーの状態異常を設定
        game.player.status.isFrozen = true;
        // 加算すると永遠に解けないことがあるので、最大値で更新（延長）
        game.player.status.sleep = Math.max(game.player.status.sleep, turns);
    }

    static sting(game, monster) {
        // 力維持の指輪チェック
        if (game.ringManager && game.ringManager.hasSustainStrength()) {
            return;
        }

        // 本来は確率計算があるが簡易的に35%
        if (Math.random() < 0.35) {
            game.display.showMessage(Mesg[207].replace('%s', monster.name));
            if (game.player.str > 3) {
                game.player.str--;
                game.player.updateStats(); // ステータス表示更新 (spechit.c line 406)
                // オリジナルRogueではMesg[207]のみ表示 (spechit.c line 403-406)
            }
        }
    }

    static drainLife(game) {
        // オリジナルRogue準拠: spechit.c drain_life

        // 60%失敗、または MaxHp <= 30、または HP < 10 なら失敗
        if (Math.random() < 0.6 || game.player.maxHp <= 30 || game.player.hp < 10) return;

        // 力維持の指輪チェック
        const sustainStrength = game.player.inventory.some(item =>
            item.type === 'ring' && item.id === 'ring_sustain_str' && item.equipped
        );

        const n = Math.floor(Math.random() * 3) + 1; // 1, 2, 3

        let msgShown = false;

        // n=2以外 (1,3): HP減少
        if (n !== 2) {
            game.display.showMessage(Mesg[208]);
            msgShown = true;

            game.player.maxHp--;
            game.player.hp--;
            if (game.player.maxHp < 1) game.player.maxHp = 1;
            if (game.player.hp < 1) game.player.hp = 1;
        }

        // n=1以外 (2,3): Str減少
        if (n !== 1) {
            if (!sustainStrength) {
                if (!msgShown) {
                    game.display.showMessage(Mesg[208]);
                    msgShown = true;
                }
                if (game.player.str > 3) {
                    game.player.str--;
                    // 50%で最大Strも減る
                    if (Math.random() < 0.5) {
                        game.player.maxStr--;
                    }
                    game.player.updateStats();
                }
            }
        }
    }

    static dropLevel(game) {
        // オリジナルRogue spechit.c drop_level 完全移植

        // 1. 80%の確率で失敗、またはレベル5以下なら無効
        // (Rogueソースの rogue.exp はレベルのこと)
        if (Math.random() < 0.8 || game.player.level <= 5) return;

        game.display.showMessage('エネルギーを吸い取られた気がする。');

        const currentLevel = game.player.level;
        const targetLevel = currentLevel - 1;

        // 2. 経験値を減少させる
        // 新しい経験値 = (レベル-1の下限経験値) - rand(9, 29)
        // Playerクラスのテーブルを使用
        const newExpThreshold = game.player.constructor.getLevelThreshold(targetLevel);

        const loss = Math.floor(Math.random() * 21) + 9; // 9〜29
        game.player.exp = Math.max(0, newExpThreshold - loss);

        // 3. レベルを下げる
        game.player.level = targetLevel;

        // 4. HPを下げる (spechit.c: hp_raise()分減らす)
        // hp_raise() は 3〜10 (wizardモード以外)
        const hpLoss = Math.floor(Math.random() * 8) + 3;

        game.player.maxHp -= hpLoss;
        if (game.player.maxHp < 1) game.player.maxHp = 1;

        game.player.hp -= hpLoss;

        // 現在HPが1未満にならないように修正（オリジナル: if ((rogue.hp_current -= hp) <= 0) rogue.hp_current = 1;）
        if (game.player.hp < 1) game.player.hp = 1;

        // 最大HPを超えていたら補正（オリジナルにはないが、論理的にありえないので安全策、あるいは減少後の最大HPに合わせて下げるべき）
        // オリジナルでは maxHp から引いているので、現在のhpがmaxHpより大きい状態はありうる（hpも引くので）。
        if (game.player.hp > game.player.maxHp) {
            game.player.hp = game.player.maxHp;
        }

        // 5. メッセージ
        // オリジナルでは add_exp(1) を呼んで "Welcome to level N" が出るが、
        // ここではレベルダウンメッセージを出す
        game.display.showMessage(`レベルが ${game.player.level} に下がってしまった！`);
    }

    static stealGold(game, monster) {
        if (game.player.gold <= 0 || Math.random() < 0.1) return;

        const min = game.level.floor * 10;
        const max = game.level.floor * 30;
        const amount = Math.floor(Math.random() * (max - min + 1)) + min;
        const stolen = Math.min(game.player.gold, amount);

        game.player.gold -= stolen;
        game.display.showMessage(Mesg[204]);

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
        game.display.showMessage(item.getDisplayName() + Mesg[205]);

        this.disappear(game, monster);
    }

    static disappear(game, monster) {
        game.monsters = game.monsters.filter(m => m !== monster);
        // 消えたモンスターの描画削除は次のrenderで自動的に行われる
        // メッセージ表示のみ
        game.display.showMessage(`${monster.name}は消え去った。`);
    }
}
