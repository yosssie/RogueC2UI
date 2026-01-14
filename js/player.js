// ===========================
// プレイヤー
// ===========================

import { Mesg } from './mesg_J.js';

export class Player {
    constructor(name, hp, str) {
        this.name = name;
        this.x = 0;
        this.y = 0;

        // ステータス
        this.hp = hp;
        this.maxHp = hp;
        this.baseStr = str; // 基本筋力
        this.str = str;     // 現在の筋力（補正込み）
        this.maxStr = str;  // 最大基本筋力
        this.lastRingStrBonus = 0; // 前回の指輪ボーナス（updateStrength用）
        this.armor = 4;
        this.level = 1;
        this.exp = 0;
        this.gold = 0;
        this.hunger = 1250; // rogue.moves_left (初期値1250)
        this.maxHunger = 1250; // 参考値

        // インベントリ
        this.inventory = [];
        this.weapon = null;
        this.equippedArmor = null;
        this.leftRing = null;   // 左手の指輪
        this.rightRing = null;  // 右手の指輪

        // HP回復用カウンタ (move.c heal())
        this.healCounter = 0;
        this.healAlt = false;

        // 状態異常 (残りターン数で管理、0なら無効)
        this.status = {
            confused: 0,      // 混乱
            blind: 0,         // 盲目
            hallucinating: 0, // 幻覚
            sleep: 0,         // 睡眠・凍結 (行動不能)
            levitate: 0,      // 浮遊
            fast: 0,          // 加速
            slow: 0,          // 鈍化

            // 以下はフラグまたは特殊管理
            held: false,      // 金縛り (Flytrap等)
            detectMonster: false, // モンスター感知 (ポーション等)
            detectObjects: false, // アイテム感知 (ポーション等)
            seeInvisible: false   // 透明視認
        };
    }

    // HP自動回復 (move.c heal() 移植)
    regenerateHP() {
        if (this.hp >= this.maxHp) {
            this.healCounter = 0;
            return;
        }

        // レベルに応じた回復間隔 (na[] from move.c)
        const healIntervals = [0, 20, 18, 17, 14, 13, 10, 9, 8, 7, 4, 3];
        const interval = (this.level < 1 || this.level > 11) ? 2 : healIntervals[this.level];

        if (++this.healCounter >= interval) {
            this.healCounter = 0;
            this.hp++;
            if ((this.healAlt = !this.healAlt)) {
                this.hp++;
            }
            if (this.hp > this.maxHp) {
                this.hp = this.maxHp;
            }
        }
    }

    attack() {
        // 攻撃力計算 (Rogue式: Strボーナス + 武器ダメージ + 武器補正)
        // 簡易実装として: Str/2 + 武器ダイス + 補正
        let damage = Math.floor(this.str / 2);

        if (this.weapon && typeof this.weapon.value === 'string') {
            // "2d4" のようなダイス表記をパース
            const [count, faces] = this.weapon.value.split('d').map(Number);
            for (let i = 0; i < count; i++) {
                damage += Math.floor(Math.random() * faces) + 1;
            }
            // 武器のダメージボーナスを加算
            if (this.weapon.damageBonus) {
                damage += this.weapon.damageBonus;
            }
        } else {
            // 素手: 1d2
            damage += Math.floor(Math.random() * 2) + 1;
        }

        return Math.max(1, damage);
    }

    updateStrength(bonus) {
        // 前回の指輪ボーナスを引く
        if (this.lastRingStrBonus !== undefined) {
            this.str -= this.lastRingStrBonus;
        }

        // 新しい指輪ボーナスを足す
        this.str += bonus;
        this.lastRingStrBonus = bonus;

        // 最低値は1
        if (this.str < 1) this.str = 1;
    }

    // 混乱状態にする
    confuse() {
        if (this.status.confused === 0) {
            // 12-22ターン (use.c unconfuse)
            this.status.confused = 12 + Math.floor(Math.random() * 11);
        }
    }

    updateHunger(amount = 1) {
        this.hunger -= amount;

        // 空腹状態の閾値 (rogue.h)
        // HUNGRY 300, WEAK 150, FAINT 20, STARVE 0

        if (this.hunger <= 0) {
            // 餓死ダメージ
            this.takeDamage(1);
            return Mesg[76];
        } else if (this.hunger <= 20) {
            if (Math.random() < 0.2) return Mesg[77]; // 気絶判定の代わり
        } else if (this.hunger === 150) {
            return Mesg[74];
        } else if (this.hunger === 300) {
            return Mesg[72];
        }
        return null;
    }

    // Original Rogue (v5.4.4) Logic: AC * 3 % reduction
    getActualDamage(damage) {
        if (damage <= 0) return 0;
        const reductionPercent = this.armor * 3;
        const reduction = Math.floor(damage * reductionPercent / 100);
        return Math.max(0, damage - reduction);
    }

    takeDamage(damage, ignoreArmor = false) {
        let actualDamage = damage;
        if (!ignoreArmor) {
            actualDamage = this.getActualDamage(damage);
        }
        this.hp -= actualDamage;

        if (this.hp < 0) this.hp = 0;
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
    }

    gainExp(amount) {
        this.exp += amount;

        // 次のレベルの閾値に達しているかチェック
        // レベルアップループ（一気に複数レベル上がる可能性対応）
        while (this.exp >= this.getExpForNextLevel()) {
            this.levelUp();
        }
    }

    // 次のレベルに必要な経験値を計算
    // Lv1->2: 10, Lv2->3: 20, Lv3->4: 40, ...
    getExpForNextLevel() {
        if (this.level === 1) return 10;
        // level 2以降: 10 * 2^(level-1) ?
        // e_levels[] = {10, 20, 40, 80, ...}
        // index 0 (Lv1->2) -> 10
        // index 1 (Lv2->3) -> 20
        return 10 * Math.pow(2, this.level - 1);
    }

    levelUp() {
        this.level++;
        // メッセージは外部(Game.js等)から出したいが、ここで出しても良いか
        // Game.js が参照できないので、メッセージ表示は呼び出し元で行うべきだが、
        // 簡易的にコンソールに出すか、Gameの参照を持たせるか。
        // PlayerはGameを知らない設計に見えるが、constructで渡されていない。
        // -> Game.js で player.levelUp() 後にメッセージを出すのが筋だが、
        // whileループ内で複数上がる場合があるので、戻り値で上がった回数を返すと良い。
        // しかし既存の実装を大きく変えたくないので、HP上昇処理だけここで行う。

        // HP上昇: 1d10
        const hpGain = Math.floor(Math.random() * 10) + 1;
        this.maxHp += hpGain;
        this.hp += hpGain; // 現在HPも回復(上限アップ分)

        // Rogueでは現在HPも全回復するわけではなく、最大値が増えた分だけ増えるのが一般的だが、
        // ソースによっては全回復したりする。Rogue Clone IIは増分だけ。
        // check_level: rogue.hp_max += hp_increase; rogue.hp_current += hp_increase;

        // Str上昇などは無し (Rogue仕様)
    }

    isSameItem(item1, item2) {
        if (item1.id !== item2.id) return false;
        if (item1.type !== item2.type) return false;

        // スタック可能フラグ
        if (!item1.stackable || !item2.stackable) return false;

        // 属性比較
        if (item1.cursed !== item2.cursed) return false;
        if (item1.hitBonus !== item2.hitBonus) return false;
        if (item1.damageBonus !== item2.damageBonus) return false;

        // 識別状態が違ってもIDが同じならスタック可能（Rogue仕様）
        // if (item1.identified !== item2.identified) return false;

        return true;
    }

    checkDuplicate(item) {
        if (!item.stackable) return null;
        return this.inventory.find(i => this.isSameItem(item, i));
    }

    addItem(item) {
        // 金塊処理 (pack.c pick_up 準拠)
        if (item.type === 'gold') { // Item.jsのgoldは type='gold', id='gold'
            this.gold += item.value || 0;
            return true;
        }

        // スタック（重複）チェック (pack.c add_to_pack w/ condense=1)
        const duplicate = this.checkDuplicate(item);
        if (duplicate) {
            duplicate.quantity += item.quantity;
            // どちらかが識別済みなら、スタック後は識別済みに統一
            if (item.identified || duplicate.identified) {
                duplicate.identified = true;
            }
            return true;
        }

        // インベントリ上限チェック (24個)
        if (this.inventory.length >= 24) {
            return false;
        }

        this.inventory.push(item);
        return true;
    }

    removeItem(item) {
        const index = this.inventory.indexOf(item);
        if (index > -1) {
            this.inventory.splice(index, 1);
        }
        // 装備中なら外す
        if (this.weapon === item) this.weapon = null;
        if (this.equippedArmor === item) {
            this.equippedArmor = null;
            this.updateStats();
        }
    }

    equip(item) {
        if (item.type === 'weapon') {
            this.weapon = item;
        } else if (item.type === 'armor') {
            // オリジナルRogue準拠: 防具は着た瞬間に識別される (pack.c wear/do_wear)
            item.identified = true;
            this.equippedArmor = item;
            this.updateStats();
        }
    }

    unequip(item) {
        if (this.weapon === item) this.weapon = null;
        if (this.equippedArmor === item) {
            this.equippedArmor = null;
            this.updateStats();
        }
    }

    updateStats() {
        console.log(`[updateStats] BEGIN str=${this.str}, maxStr=${this.maxStr}`);

        // オリジナルRogue準拠: AC = 基本AC + エンチャント値 (invent.c get_armor_class)
        if (this.equippedArmor) {
            const baseAC = this.equippedArmor.value || 0;
            const enchant = this.equippedArmor.damageBonus || 0;
            this.armor = baseAC + enchant;
        } else {
            this.armor = 0; // 素っ裸は0
        }

        // ステータスバーの表示更新 (print_stats)
        const statusLevel = document.getElementById('status-level');
        const statusGold = document.getElementById('status-gold');
        const statusHp = document.getElementById('status-hp');
        const statusStr = document.getElementById('status-str');
        const statusArm = document.getElementById('status-arm');
        const statusExp = document.getElementById('status-exp');

        if (statusLevel) statusLevel.textContent = `Level: ${this.level}`;
        if (statusGold) statusGold.textContent = `Gold: ${this.gold}`;
        if (statusHp) statusHp.textContent = `Hp: ${this.hp}(${this.maxHp})`;
        if (statusStr) statusStr.textContent = `Str: ${this.str}(${this.maxStr})`;
        if (statusArm) statusArm.textContent = `Arm: ${this.armor}`;
        if (statusExp) statusExp.textContent = `Exp: ${this.level}/${this.exp}`;

        console.log(`[updateStats] END str=${this.str}, maxStr=${this.maxStr}`);
    }

    canSeeInvisible() {
        if (this.status.seeInvisible > 0 || this.status.seeInvisible === true) return true;
        // 定数使わずID判定（依存回避）
        if (this.leftRing && this.leftRing.id === 'ring_see_invis') return true;
        if (this.rightRing && this.rightRing.id === 'ring_see_invis') return true;
        return false;
    }
}
