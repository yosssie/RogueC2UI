// ===========================
// 指輪システム (ring.c 完全移植)
// ===========================

// 指輪の種類定義 (rogue.h)
export const RingType = {
    STEALTH: 0,           // 隠密
    R_TELEPORT: 1,        // テレポート（呪い）
    REGENERATION: 2,      // HP再生
    SLOW_DIGEST: 3,       // 空腹減少
    ADD_STRENGTH: 4,      // 力増強
    SUSTAIN_STRENGTH: 5,  // 力維持
    DEXTERITY: 6,         // 器用さ（経験値ボーナス）
    ADORNMENT: 7,         // 装飾（効果なし）
    R_SEE_INVISIBLE: 8,   // 透明視認
    MAINTAIN_ARMOR: 9,    // 防具維持
    SEARCHING: 10         // 自動探索
};

export const RINGS = 11; // 指輪の種類数

// 指輪の名前
const RING_NAMES = {
    [RingType.STEALTH]: '隠密の指輪',
    [RingType.R_TELEPORT]: 'テレポートの指輪',
    [RingType.REGENERATION]: '再生の指輪',
    [RingType.SLOW_DIGEST]: '遅消化の指輪',
    [RingType.ADD_STRENGTH]: '力の指輪',
    [RingType.SUSTAIN_STRENGTH]: '力維持の指輪',
    [RingType.DEXTERITY]: '器用さの指輪',
    [RingType.ADORNMENT]: '装飾の指輪',
    [RingType.R_SEE_INVISIBLE]: '透明視認の指輪',
    [RingType.MAINTAIN_ARMOR]: '防具維持の指輪',
    [RingType.SEARCHING]: '探索の指輪'
};

export class RingManager {
    constructor(game) {
        this.game = game;

        // 指輪効果の状態 (ring.c のグローバル変数)
        this.stealthy = 0;           // 隠密レベル
        this.rRings = 0;             // 装備中の指輪数
        this.eRings = 0;             // 空腹度への影響
        this.rTeleport = false;      // テレポート呪い
        this.sustainStrength = false; // 力維持
        this.addStrength = 0;        // 力ボーナス
        this.regeneration = 0;       // 再生レベル
        this.ringExp = 0;            // 経験値ボーナス
        this.rSeeInvisible = false;  // 透明視認
        this.maintainArmor = false;  // 防具維持
        this.autoSearch = 0;         // 自動探索レベル
    }

    // put_on_ring() - 指輪を装備
    putOnRing(ring, hand) {
        const player = this.game.player;

        // 既に装備している場合
        if (ring.equipped) {
            this.game.display.showMessage('既に装備している。');
            return false;
        }

        // 指定された手に既に指輪がある場合は入れ替え
        const currentRing = (hand === 'left') ? player.leftRing : player.rightRing;
        if (currentRing) {
            // 呪われた指輪は外せない
            if (currentRing.cursed) {
                this.game.display.showMessage('呪われた指輪が外れない！');
                return false;
            }
            // 古い指輪を外す
            this.removeRing(hand);
            this.game.display.showMessage(`${currentRing.name}を外した。`);
        }

        // 呪われた指輪は外せない警告
        if (ring.cursed) {
            this.game.display.showMessage('指輪を装備した... 外せない！');
        }

        // 装備実行
        this.doPutOn(ring, hand);
        this.ringStats(true);

        const handName = hand === 'left' ? '左手' : '右手';
        this.game.display.showMessage(`${ring.name}を${handName}に装備した。`);
        return true;
    }

    // do_put_on() - 装備実行
    doPutOn(ring, hand) {
        const player = this.game.player;

        if (hand === 'left') {
            player.leftRing = ring;
        } else {
            player.rightRing = ring;
        }

        ring.equipped = true;
        ring.equippedHand = hand;
    }

    // remove_ring() - 指輪を外す
    removeRing(hand) {
        const player = this.game.player;
        const ring = hand === 'left' ? player.leftRing : player.rightRing;

        if (!ring) {
            this.game.display.showMessage('その手には指輪をしていない。');
            return false;
        }

        // 呪われた指輪は外せない
        if (ring.cursed) {
            this.game.display.showMessage('指輪が外れない！呪われている！');
            return false;
        }

        this.unPutOn(ring);

        const handName = hand === 'left' ? '左手' : '右手';
        this.game.display.showMessage(`${handName}の${ring.name}を外した。`);
        return true;
    }

    // un_put_on() - 外す実行
    unPutOn(ring) {
        const player = this.game.player;

        if (ring.equippedHand === 'left') {
            player.leftRing = null;
        } else {
            player.rightRing = null;
        }

        ring.equipped = false;
        ring.equippedHand = null;

        this.ringStats(true);
    }

    // ring_stats() - 指輪効果の再計算（最重要）
    ringStats(updateDisplay = false) {
        const player = this.game.player;

        // 全効果をリセット
        this.stealthy = 0;
        this.rRings = 0;
        this.eRings = 0;
        this.rTeleport = false;
        this.sustainStrength = false;
        this.addStrength = 0;
        this.regeneration = 0;
        this.ringExp = 0;
        this.rSeeInvisible = false;
        this.maintainArmor = false;
        this.autoSearch = 0;

        // 両手の指輪を確認
        const rings = [player.leftRing, player.rightRing].filter(r => r);

        rings.forEach(ring => {
            this.rRings++;
            this.eRings++; // 基本的に指輪1つで空腹度+1

            switch (ring.ringType) {
                case RingType.STEALTH:
                    this.stealthy++;
                    break;
                case RingType.R_TELEPORT:
                    this.rTeleport = true;
                    break;
                case RingType.REGENERATION:
                    this.regeneration++;
                    break;
                case RingType.SLOW_DIGEST:
                    this.eRings -= 2; // 空腹度-2（実質-1）
                    break;
                case RingType.ADD_STRENGTH:
                    this.addStrength += ring.enchantment || 0;
                    break;
                case RingType.SUSTAIN_STRENGTH:
                    this.sustainStrength = true;
                    break;
                case RingType.DEXTERITY:
                    this.ringExp += ring.enchantment || 0;
                    break;
                case RingType.ADORNMENT:
                    // 効果なし
                    break;
                case RingType.R_SEE_INVISIBLE:
                    this.rSeeInvisible = true;
                    break;
                case RingType.MAINTAIN_ARMOR:
                    this.maintainArmor = true;
                    break;
                case RingType.SEARCHING:
                    this.autoSearch += 2;
                    break;
            }
        });

        // プレイヤーのステータスに反映
        if (updateDisplay) {
            this.game.updateDisplay();
        }
    }

    // gr_ring() - 指輪生成
    static generateRing() {
        const ringType = Math.floor(Math.random() * RINGS);
        let enchantment = 0;
        let cursed = false;

        switch (ringType) {
            case RingType.R_TELEPORT:
                cursed = true;
                break;
            case RingType.ADD_STRENGTH:
            case RingType.DEXTERITY:
                // -2 ~ +2 (0を除く)
                do {
                    enchantment = Math.floor(Math.random() * 5) - 2;
                } while (enchantment === 0);
                cursed = (enchantment < 0);
                break;
            case RingType.ADORNMENT:
                cursed = Math.random() < 0.5;
                break;
        }

        return {
            type: 'ring',
            ringType: ringType,
            name: RING_NAMES[ringType],
            enchantment: enchantment,
            cursed: cursed,
            equipped: false,
            equippedHand: null,
            symbol: '=',
            identified: false
        };
    }

    // inv_rings() - 装備中の指輪表示
    showEquippedRings() {
        const player = this.game.player;

        if (this.rRings === 0) {
            this.game.display.showMessage('指輪を装備していない。');
            return;
        }

        if (player.leftRing) {
            this.game.display.showMessage(`左手: ${player.leftRing.name}`);
        }
        if (player.rightRing) {
            this.game.display.showMessage(`右手: ${player.rightRing.name}`);
        }
    }

    // ターン毎の処理
    processTurnEffects() {
        const player = this.game.player;

        // テレポート呪い
        if (this.rTeleport && Math.random() < 0.01) {
            this.game.display.showMessage('突然テレポートした！');
            this.game.trapManager.teleportPlayer();
        }

        // 自動探索
        if (this.autoSearch > 0) {
            this.game.trapManager.search(1, true); // 自動探索
        }
    }

    // 力ボーナスを取得
    getStrengthBonus() {
        return this.addStrength;
    }

    // 経験値ボーナスを取得
    getExpBonus() {
        return this.ringExp;
    }

    // 再生ボーナスを取得
    getRegenerationBonus() {
        return this.regeneration;
    }

    // 空腹度への影響を取得
    getHungerModifier() {
        return this.eRings;
    }

    // 力維持フラグを取得
    hasSustainStrength() {
        return this.sustainStrength;
    }

    // 防具維持フラグを取得
    hasMaintainArmor() {
        return this.maintainArmor;
    }

    // 透明視認フラグを取得
    canSeeInvisible() {
        return this.rSeeInvisible;
    }

    // 隠密レベルを取得
    getStealthLevel() {
        return this.stealthy;
    }
}
