// ===========================
// アイテムデータと処理
// ===========================

import { Mesg } from './mesg_J.js';

export class Item {
    // 静的データ: ゲーム開始時に初期化（シャッフル）される
    static initialized = false;
    static definitions = {};
    static appearances = {}; // カテゴリごとの未識別名リスト
    static mapping = {};     // effectId -> appearanceId

    // 未識別名の候補
    // オリジナルRogue (v5.4) に準拠した色リスト
    static POTION_COLORS = [
        '赤い', '青い', '緑の', '灰色の', '茶色の', '透明な', 'ピンクの', '白い',
        '紫の', '黒い', '黄色の', '格子柄の', 'ワイン色の'
    ];

    // 巻物名の生成用音節リスト (Rogue準拠)
    static SCROLL_SYLLABLES = [
        'a', 'ab', 'ag', 'aks', 'ala', 'an', 'ank', 'app', 'arg', 'arze',
        'ash', 'ban', 'bar', 'bat', 'baz', 'bip', 'bir', 'bit', 'bjor',
        'blu', 'bot', 'bu', 'byt', 'comp', 'con', 'cos', 'cre', 'dahl',
        'dan', 'den', 'do', 'dok', 'eep', 'el', 'eng', 'er', 'ere', 'erk',
        'esh', 'evs', 'fa', 'fid', 'for', 'fri', 'fu', 'gan', 'gar',
        'glen', 'gop', 'gre', 'ha', 'he', 'hyd', 'i', 'ing', 'ip', 'ish',
        'it', 'ite', 'iv', 'jo', 'kho', 'kli', 'klis', 'la', 'lech',
        'man', 'mar', 'me', 'mi', 'mic', 'mik', 'mon', 'mung', 'mur',
        'nag', 'nej', 'nel', 'nep', 'ner', 'nes', 'nis', 'nih', 'nin',
        'o', 'od', 'ood', 'org', 'orn', 'ox', 'oxy', 'pay', 'ple',
        'plu', 'po', 'pot', 'prok', 're', 'rea', 'rhov', 'ri', 'ro',
        'rog', 'rok', 'rol', 'sa', 'sah', 'sai', 'sal', 'san', 'sat',
        'se', 'sel', 'ses', 'shet', 'si', 'sid', 'sik', 'soe', 'sole',
        'syl', 'ta', 'tab', 'tar', 'tec', 'ti', 'to', 'toc', 'tur',
        'twi', 'ul', 'um', 'uo', 'ur', 'val', 'vel', 'vic', 'vil',
        'vin', 'vod', 'vop', 'vor', 'vex', 'wan', 'won', 'x', 'xer',
        'y', 'year', 'ykes', 'yup', 'z', 'zapp', 'zeb', 'zero', 'zig',
        'zle', 'zot'
    ];

    static init() {
        if (this.initialized) return;

        // アイテム定義
        this.definitions = {
            // 武器 (object.c da[])
            ')': [
                { id: 'bow', name: '弓', prob: 5, value: '1d1', type: 'weapon' },
                { id: 'dart', name: '投げ矢', prob: 5, value: '1d1', type: 'weapon', stack: true },
                { id: 'arrow', name: '矢', prob: 5, value: '1d2', type: 'weapon', stack: true },
                { id: 'dagger', name: '短剣', prob: 10, value: '1d3', type: 'weapon' },
                { id: 'shuriken', name: '手裏剣', prob: 5, value: '1d4', type: 'weapon', stack: true },
                { id: 'mace', name: 'ほこ', prob: 20, value: '2d3', type: 'weapon' },
                { id: 'long_sword', name: '長い剣', prob: 20, value: '3d4', type: 'weapon' },
                { id: 'two_handed_sword', name: '大きな剣', prob: 10, value: '4d5', type: 'weapon' }
            ],
            // 防具 (object.c gr_armor)
            ']': [
                { id: 'leather_armor', name: '革のよろい', prob: 20, value: 2, type: 'armor' },
                { id: 'ring_mail', name: 'かたびら', prob: 15, value: 3, type: 'armor' },
                { id: 'scale_mail', name: 'うろこのよろい', prob: 10, value: 4, type: 'armor' },
                { id: 'chain_mail', name: '鎖かたびら', prob: 10, value: 5, type: 'armor' },
                { id: 'banded_mail', name: '帯金のよろい', prob: 10, value: 6, type: 'armor' },
                { id: 'splint_mail', name: '延金のよろい', prob: 10, value: 6, type: 'armor' },
                { id: 'plate_mail', name: '鋼鉄のよろい', prob: 5, value: 7, type: 'armor' }
            ],
            // 薬 (mesg_J)
            '!': [
                { id: 'potion_gain_str', name: '強さが増す水薬', prob: 10, type: 'potion' },
                { id: 'potion_restore_str', name: '強さが元にもどる水薬', prob: 10, type: 'potion' },
                { id: 'potion_heal', name: '体力が回復する水薬', prob: 30, value: 10, type: 'potion' },
                { id: 'potion_extra_heal', name: '体力がとても回復する水薬', prob: 15, value: 20, type: 'potion' },
                { id: 'potion_poison', name: '毒の水薬', prob: 5, type: 'potion' },
                { id: 'potion_raise_level', name: '経験が増す水薬', prob: 5, type: 'potion' },
                { id: 'potion_blindness', name: '目が見えなくなる水薬', prob: 5, type: 'potion' },
                { id: 'potion_hallucination', name: '幻覚をおこす水薬', prob: 5, type: 'potion' },
                { id: 'potion_detect_monster', name: '遠くの怪物がわかる水薬', prob: 5, type: 'potion' },
                { id: 'potion_detect_objects', name: '遠くのものがわかる水薬', prob: 5, type: 'potion' },
                { id: 'potion_confusion', name: '頭が混乱する水薬', prob: 5, type: 'potion' },
                { id: 'potion_levitation', name: '空中に浮きあがる水薬', prob: 5, type: 'potion' },
                { id: 'potion_haste_self', name: '素早くなる水薬', prob: 5, type: 'potion' },
                { id: 'potion_see_invisible', name: '見えないものが見える水薬', prob: 5, type: 'potion' }
            ],
            // 巻物 (mesg_J)
            '?': [
                { id: 'scroll_protect_armor', name: 'よろいを守る巻き物', prob: 5, type: 'scroll' },
                { id: 'scroll_hold_monster', name: '怪物を封じこめる巻き物', prob: 5, type: 'scroll' },
                { id: 'scroll_enchant_weapon', name: '武器に魔法をかける巻き物', prob: 10, type: 'scroll' },
                { id: 'scroll_enchant_armor', name: 'よろいに魔法をかける巻き物', prob: 10, type: 'scroll' },
                { id: 'scroll_identify', name: '持ちものの種類がわかる巻き物', prob: 20, type: 'scroll' },
                { id: 'scroll_teleportation', name: 'テレポートする巻き物', prob: 5, type: 'scroll' },
                { id: 'scroll_sleep', name: '眠りにおちる巻き物', prob: 5, type: 'scroll' },
                { id: 'scroll_scare_monster', name: '怪物を近寄せない巻き物', prob: 5, type: 'scroll' },
                { id: 'scroll_remove_curse', name: 'のろいを解く巻き物', prob: 10, type: 'scroll' },
                { id: 'scroll_create_monster', name: '怪物を作りだす巻き物', prob: 5, type: 'scroll' },
                { id: 'scroll_aggravate_monster', name: '怪物を怒らせる巻き物', prob: 5, type: 'scroll' },
                { id: 'scroll_magic_mapping', name: '魔法の地図の巻き物', prob: 10, type: 'scroll' }
            ],
            // 食料 (2種類: RATION=食糧, FRUIT=こけもも)
            ':': [
                { id: 'ration', name: '食糧', prob: 70, value: 500, type: 'food', foodKind: 'ration' },
                { id: 'fruit', name: 'こけもも', prob: 30, value: 500, type: 'food', foodKind: 'fruit' }
            ],
            '*': [{ id: 'gold', name: '金貨', prob: 100, type: 'gold' }],

            // 杖 (zap.c)
            '/': [
                { id: 'wand_tele_away', name: 'テレポートの杖', prob: 6, type: 'wand', wandType: 0 },
                { id: 'wand_slow_monster', name: '鈍化の杖', prob: 11, type: 'wand', wandType: 1 },
                { id: 'wand_confuse_monster', name: '混乱の杖', prob: 11, type: 'wand', wandType: 2 },
                { id: 'wand_invisibility', name: '透明化の杖', prob: 6, type: 'wand', wandType: 3 },
                { id: 'wand_polymorph', name: '変身の杖', prob: 10, type: 'wand', wandType: 4 },
                { id: 'wand_haste_monster', name: '加速の杖', prob: 10, type: 'wand', wandType: 5 },
                { id: 'wand_put_to_sleep', name: '睡眠の杖', prob: 11, type: 'wand', wandType: 6 },
                { id: 'wand_magic_missile', name: '魔法の矢の杖', prob: 9, type: 'wand', wandType: 7 },
                { id: 'wand_cancellation', name: '無効化の杖', prob: 5, type: 'wand', wandType: 8 },
                { id: 'wand_do_nothing', name: '何もしない杖', prob: 1, type: 'wand', wandType: 9 }
            ],

            // 指輪 (ring.c)
            '=': [
                { id: 'ring_stealth', name: '隠密の指輪', prob: 10, type: 'ring', ringType: 0 },
                { id: 'ring_teleport', name: 'テレポートの指輪', prob: 9, type: 'ring', ringType: 1 },
                { id: 'ring_regen', name: '再生の指輪', prob: 9, type: 'ring', ringType: 2 },
                { id: 'ring_slow_digest', name: '遅消化の指輪', prob: 9, type: 'ring', ringType: 3 },
                { id: 'ring_add_str', name: '力の指輪', prob: 9, type: 'ring', ringType: 4 },
                { id: 'ring_sustain_str', name: '力維持の指輪', prob: 5, type: 'ring', ringType: 5 },
                { id: 'ring_dex', name: '器用さの指輪', prob: 8, type: 'ring', ringType: 6 },
                { id: 'ring_adorn', name: '装飾の指輪', prob: 1, type: 'ring', ringType: 7 },
                { id: 'ring_see_invis', name: '透明視認の指輪', prob: 10, type: 'ring', ringType: 8 },
                { id: 'ring_maintain_armor', name: '防具維持の指輪', prob: 5, type: 'ring', ringType: 9 },
                { id: 'ring_search', name: '探索の指輪', prob: 10, type: 'ring', ringType: 10 }
            ],
            // アミュレット
            ',': [
                { id: 'amulet', name: 'イェンダーの魔除け', prob: 0, type: 'amulet' }
            ]
        };

        // 未識別名のシャッフルと割り当て
        this.mapping = {};

        // 薬の色をシャッフル
        const colors = [...this.POTION_COLORS].sort(() => Math.random() - 0.5);
        this.definitions['!'].forEach((def, index) => {
            this.mapping[def.id] = colors[index % colors.length] + '薬';
        });

        // 巻物名を生成して割り当て
        this.definitions['?'].forEach((def) => {
            const name = this.generateScrollName();
            this.mapping[def.id] = `"${name}" と書かれた巻物`;
        });

        // 杖の材質をシャッフル（未識別名）
        const wandMaterials = ['木', '金属', 'ガラス', '象牙', '黒檀', '水晶', '真鍮', '銅', '銀', '鉄'];
        const shuffledWandMaterials = [...wandMaterials].sort(() => Math.random() - 0.5);
        this.definitions['/'].forEach((def, index) => {
            this.mapping[def.id] = shuffledWandMaterials[index % shuffledWandMaterials.length] + 'の杖';
        });

        // 指輪の材質をシャッフル（未識別名）
        const materials = ['金', '銀', '銅', '真鍮', '青銅', '鉄', '木', '骨', '石', '水晶', 'ガラス'];
        const shuffledMaterials = [...materials].sort(() => Math.random() - 0.5);
        this.definitions['='].forEach((def, index) => {
            this.mapping[def.id] = shuffledMaterials[index % shuffledMaterials.length] + 'の指輪';
        });

        this.initialized = true;
    }

    static generateScrollName() {
        const syllableCount = 1 + Math.floor(Math.random() * 3); // 1-3音節
        let name = '';
        for (let i = 0; i < syllableCount; i++) {
            if (i > 0) name += ' ';
            const idx = Math.floor(Math.random() * this.SCROLL_SYLLABLES.length);
            name += this.SCROLL_SYLLABLES[idx];
        }
        return name;
    }

    constructor(symbol, x, y, specificId = null) {
        if (!Item.initialized) Item.init();

        this.symbol = symbol; // '!', '?', etc.
        this.x = x;
        this.y = y;
        this.identified = false; // 識別済みフラグ

        // 金貨と食料は最初から識別済み
        if (symbol === '*' || symbol === ':') {
            this.identified = true;
        }

        // 定義からアイテムを抽選または特定
        const defs = Item.definitions[symbol] || [];
        let data = null;

        if (specificId) {
            data = defs.find(d => d.id === specificId);
        } else {
            // 確率に基づいて抽選
            const totalProb = defs.reduce((sum, d) => sum + d.prob, 0);
            let r = Math.random() * totalProb;
            for (const d of defs) {
                r -= d.prob;
                if (r <= 0) {
                    data = d;
                    break;
                }
            }
        }

        // データが見つからない場合のフォールバック（デバッグ用など）
        if (!data && defs.length > 0) data = defs[0];
        if (!data) data = { id: 'unknown', name: '謎の物体', type: 'misc' };

        this.id = data.id;
        this.realName = data.name;
        this.type = data.type; // category
        this.value = data.value || 0;

        // 食料の種類を保存
        if (this.type === 'food') {
            this.foodKind = data.foodKind || 'ration';
        }

        this.value = data.value || 0;
        // スタック可能か判定
        if (data.stack !== undefined) {
            this.stackable = data.stack;
        } else {
            // 定義がない場合のデフォルト: 薬、巻物、食糧(RATION)はスタック可能
            // こけもも(FRUIT)はスタック不可
            if (this.type === 'food' && data.foodKind === 'fruit') {
                this.stackable = false;
            } else {
                this.stackable = ['potion', 'scroll', 'food'].includes(this.type);
            }
        }
        this.quantity = 1; // 個数

        // エンチャント補正 (Rogue: hit_enchant, d_enchant)
        this.hitBonus = 0;
        this.damageBonus = 0;

        // 金貨の場合は金額をランダムに変動させる
        if (this.id === 'gold') {
            this.value = 5 + Math.floor(Math.random() * 20);
        }

        // 指輪の場合の追加プロパティ
        if (this.type === 'ring') {
            this.ringType = data.ringType;
            // エンチャント値（力の指輪、器用さの指輪用）
            if (this.ringType === 4 || this.ringType === 6) { // ADD_STRENGTH or DEXTERITY
                do {
                    this.enchantment = Math.floor(Math.random() * 5) - 2; // -2 ~ +2
                } while (this.enchantment === 0);
                this.cursed = (this.enchantment < 0);
            } else if (this.ringType === 1) { // R_TELEPORT
                this.cursed = true;
                this.enchantment = 0;
            } else if (this.ringType === 7) { // ADORNMENT
                this.cursed = Math.random() < 0.5;
                this.enchantment = 0;
            } else {
                this.cursed = false;
                this.enchantment = 0;
            }
            this.equipped = false;
            this.equippedHand = null;
        }

        // 杖の場合の追加プロパティ
        if (this.type === 'wand') {
            this.wandType = data.wandType;
            this.charges = 3 + Math.floor(Math.random() * 5); // 3-7チャージ
        }
    }

    getUnit() {
        if (this.type === 'food') {
            // 食糧(RATION)は「袋の」、こけもも(FRUIT)は「個の」
            return this.foodKind === 'fruit' ? Mesg[31] : Mesg[30];
        }
        if (this.type === 'weapon' && (this.id === 'arrow' || this.id === 'dart' || this.id === 'shuriken')) return '本の';
        return '個の';
    }

    getDisplayName() {
        if (this.id === 'gold') {
            // 金貨は特別扱い（identifiedフラグに関係なく額面表示）
            return `${this.value}枚の${this.realName}`;
        }

        let name = this.realName;
        if (!this.identified) {
            name = Item.mapping[this.id] || this.realName;
        }

        // エンチャント値の表示（識別済みの場合のみ）
        // エンチャント値の表示（識別済みの場合のみ）
        let enchantStr = '';
        if (this.identified) {
            if (this.type === 'weapon') {
                // 武器: (+1, +2) 長い剣
                // 両方0の場合は表示しない
                if (this.hitBonus !== 0 || this.damageBonus !== 0) {
                    const hit = this.hitBonus >= 0 ? `+${this.hitBonus}` : `${this.hitBonus}`;
                    const dmg = this.damageBonus >= 0 ? `+${this.damageBonus}` : `${this.damageBonus}`;
                    enchantStr = ` (${hit}, ${dmg})`;
                }
            } else if (this.type === 'armor') {
                // 防具: (+2) 鋼鉄のよろい
                // 0の場合は表示しない
                if (this.damageBonus !== 0) {
                    const enc = this.damageBonus >= 0 ? `+${this.damageBonus}` : `${this.damageBonus}`;
                    enchantStr = ` (${enc})`;
                }
            } else if (this.type === 'ring' && this.enchantment !== undefined && this.enchantment !== 0) {
                // 指輪: 筋力の指輪 (+2)
                const enc = this.enchantment >= 0 ? `+${this.enchantment}` : `${this.enchantment}`;
                enchantStr = ` (${enc})`;
            }
        }

        // スタック表示
        if (this.quantity > 1) {
            return `${this.quantity}${this.getUnit()}${name}${enchantStr}`;
        }

        return `${name}${enchantStr}`;
    }

    // ソート用の優先度を取得
    getSortOrder() {
        // カテゴリ優先度
        const typeOrder = {
            'weapon': 10,
            'armor': 20,
            'ring': 25, // 防具の次
            'food': 30,
            'potion': 40,
            'scroll': 50,
            'wand': 60,
            'amulet': 80,
            'gold': 90,
            'misc': 99
        };

        const typeScore = typeOrder[this.type] || 99;

        // 同種内の順序 (definitions内の定義順を使いたいが、
        // インスタンスからは逆引きしにくいので、IDの文字列比較で代用するか、
        // あるいはinit時に順序を記録しておくのが正しい)
        // ここでは簡易的にIDのハッシュ的なもので安定ソートさせる
        // 本当はオリジナル準拠なら定義順

        // Item.definitionsから検索してインデックスを見つける
        let subScore = 999;
        const defs = Item.definitions[this.symbol];
        if (defs) {
            const idx = defs.findIndex(d => d.id === this.id);
            if (idx !== -1) subScore = idx;
        }

        return typeScore * 1000 + subScore;
    }

    usePotion(player, game) {
        const status = player.status;
        switch (this.id) {
            case 'potion_heal':
                // use.c potion_heal(0) - 回復薬
                this.potionHeal(player, game, false);
                return Mesg[236];
            case 'potion_extra_heal':
                // use.c potion_heal(1) - 大回復薬
                this.potionHeal(player, game, true);
                return Mesg[237];
            case 'potion_gain_str':
                // use.c INCREASE_STRENGTH: str++
                player.str++;
                if (player.str > player.maxStr) {
                    player.maxStr = player.str;
                }
                return Mesg[234];
            case 'potion_restore_str':
                if (player.str < player.maxStr) {
                    player.str = player.maxStr;
                } else {
                    player.maxStr++;
                    player.str = player.maxStr;
                }
                return Mesg[235];
            case 'potion_poison':
                {
                    // use.c POISON
                    // 力維持の指輪があってもメッセージは出る
                    if (game.ringManager && game.ringManager.hasSustainStrength()) {
                        return Mesg[238];
                    }
                    const loss = Math.floor(Math.random() * 3) + 1;
                    player.str = Math.max(1, player.str - loss);

                    // 幻覚も治す (use.c line 99-101)
                    if (status.hallucinating > 0) {
                        status.hallucinating = 0;
                        game.display.showMessage(Mesg[272]);
                    }

                    return Mesg[238];
                }
            case 'potion_raise_level':
                player.level++;
                const hpGain = Math.floor(Math.random() * 10) + 1;
                player.maxHp += hpGain;
                player.hp = Math.max(player.hp + hpGain, player.maxHp); // 現在HPも増やす？ Rogueは増えないかも
                // Expも更新
                player.exp = (player.level - 1) * 10 + 1; // 簡易
                game.display.showMessage(`レベル ${player.level} にようこそ。`);
                return '急に気分がよくなった。';
            case 'potion_blindness':
                // use.c BLINDNESS: 500-800ターン
                status.blind += Math.floor(Math.random() * 300) + 500;
                return Mesg[274];
            case 'potion_hallucination':
                // use.c HALLUCINATION: 500-800ターン
                status.hallucinating += Math.floor(Math.random() * 300) + 500;
                return Mesg[239];
            case 'potion_detect_monster':
                status.detectMonster = Math.floor(Math.random() * 300) + 250;
                return '怪物の気配を感じる。';
            case 'potion_detect_objects':
                status.detectObjects = Math.floor(Math.random() * 300) + 250;
                game.updateDisplay();
                return 'アイテムの気配を感じる。';
            case 'potion_confusion':
                // オリジナル: 12-22ターン
                status.confused += Math.floor(Math.random() * 11) + 12;
                return Mesg[240];
            case 'potion_levitation':
                // use.c LEVITATION: 15-30ターン
                status.levitate += Math.floor(Math.random() * 16) + 15;
                // 金縛りと罠から解放 (use.c line 137)
                status.held = false;
                return Mesg[242];
            case 'potion_haste_self':
                // use.c HASTE_SELF: 11-21ターン、奇数にする
                let hasteTurns = Math.floor(Math.random() * 11) + 11;
                if (hasteTurns % 2 === 0) {
                    hasteTurns++;
                }
                status.fast += hasteTurns;
                return Mesg[243];
            case 'potion_see_invisible':
                // use.c SEE_INVISIBLE
                // 効果は永続（階層移動で切れる）
                status.seeInvisible = true;

                // 盲目も治す
                if (status.blind > 0) {
                    status.blind = 0;
                    game.display.showMessage(Mesg[273]);
                }

                // メッセージは「このポーションは%sジュースのような味がする。」
                // フルーツ名は本来プレイヤー設定だが、今は「こけもも」固定
                return Mesg[244].replace('%s', Mesg[333]);
            default:
                return Mesg[230];
        }
    }

    // use.c potion_heal() の移植
    potionHeal(player, game, extra) {
        // 経験値分回復 (use.c line 523)
        player.hp += player.level;

        // 現在HP/最大HPの割合を計算 (use.c line 525)
        const ratio = Math.floor(player.hp * 100 / player.maxHp);

        if (ratio >= 100) {
            // 満タン以上: 最大HPを増やす (use.c line 527-530)
            player.maxHp += (extra ? 2 : 1);
            player.hp = player.maxHp;
        } else if (ratio >= 90) {
            // 90%以上: extra なら最大HP+1 (use.c line 531-534)
            player.maxHp += (extra ? 1 : 0);
            player.hp = player.maxHp;
        } else {
            // 90%未満: 割合に応じて回復 (use.c line 535-546)
            let healRatio = ratio < 33 ? 33 : ratio;
            if (extra) {
                healRatio += healRatio; // 2倍
            }
            const add = Math.floor(healRatio * (player.maxHp - player.hp) / 100);
            player.hp += add;
            if (player.hp > player.maxHp) {
                player.hp = player.maxHp;
            }
        }

        // 盲目を治す (use.c line 548-550)
        if (player.status.blind > 0) {
            player.status.blind = 0;
            game.display.showMessage('目が見えるようになった。');
        }

        // 混乱を治す/軽減 (use.c line 551-555)
        if (player.status.confused > 0) {
            if (extra) {
                player.status.confused = 0;
            } else {
                player.status.confused = Math.floor(player.status.confused / 2) + 1;
            }
        }

        // 幻覚を治す/軽減 (use.c line 556-560)
        if (player.status.hallucinating > 0) {
            if (extra) {
                player.status.hallucinating = 0;
            } else {
                player.status.hallucinating = Math.floor(player.status.hallucinating / 2) + 1;
            }
        }
    }

    useScroll(player, game) {
        switch (this.id) {
            case 'scroll_identify':
                if (game) {
                    game.player.inventory.forEach(i => i.identified = true);
                }
                return Mesg[253];
            case 'scroll_teleportation':
                if (game && game.level) {
                    game.trapManager.teleportPlayer();
                    return 'どこかへ飛ばされた！';
                }
                return '何も起こらなかった。';
            case 'scroll_create_monster':
                // monster.c create_monster() (use.c line 368-369)
                if (game && game.createMonster) {
                    game.createMonster();
                    return ''; // メッセージは createMonster 内で表示
                }
                return '何も起こらなかった。';
            case 'scroll_enchant_weapon':
                if (player.weapon) {
                    // 命中かダメージのどちらかを強化
                    if (Math.random() < 0.5) player.weapon.hitBonus++;
                    else player.weapon.damageBonus++;
                    return Mesg[249].replace('%s', player.weapon.name).replace('%s', '');
                }
                return Mesg[250];
            case 'scroll_enchant_armor':
                if (player.equippedArmor) {
                    player.equippedArmor.value++;
                    player.updateStats(); // AC更新
                    return Mesg[251].replace('%s', '');
                }
                return Mesg[252];
            case 'scroll_protect_armor':
                if (player.equippedArmor) {
                    player.equippedArmor.protected = true;
                    return Mesg[255];
                }
                return Mesg[256];
            case 'scroll_remove_curse':
                let cured = false;
                player.inventory.forEach(i => {
                    if (i.cursed) {
                        i.cursed = false;
                        cured = true;
                    }
                });
                if (player.weapon) player.weapon.cursed = false;
                if (player.equippedArmor) player.equippedArmor.cursed = false;
                if (player.leftRing) player.leftRing.cursed = false;
                if (player.rightRing) player.rightRing.cursed = false;

                return cured ? Mesg[257] : Mesg[257];
            case 'scroll_sleep':
                player.status.sleep += Math.floor(Math.random() * 4) + 4;
                return Mesg[254];
            case 'scroll_scare_monster':
                return Mesg[248];
            case 'scroll_aggravate_monster':
                // monster.c aggravate() (line 738-753)
                game.monsters.forEach(m => {
                    // 起こす
                    if (m.hasFlag(0x8)) { // ASLEEP
                        m.removeFlag(0x8);
                    }
                    // 擬態解除 (monster.c line 747)
                    if (m.hasFlag(0x100)) { // IMITATES
                        m.removeFlag(0x100);
                    }
                });
                // 画面更新
                game.updateDisplay();
                return Mesg[65];
            case 'scroll_magic_mapping':
                // マップ全開放
                if (game && game.level) {
                    game.level.revealAll();
                    game.updateDisplay();
                    return Mesg[259];
                }
                return '何も起こらなかった。';
            case 'scroll_hold_monster':
                // use.c hold_monster() (line 637-667)
                // プレイヤー周囲5x5マス (2マス範囲)
                {
                    let mcount = 0;
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            const x = player.x + dx;
                            const y = player.y + dy;

                            // 範囲外チェック
                            if (!game.level.isInBounds(x, y)) {
                                continue;
                            }

                            // モンスターチェック
                            const monster = game.monsters.find(m => m.x === x && m.y === y);
                            if (monster) {
                                monster.setFlag(0x8); // ASLEEP
                                monster.removeFlag(0x10); // WAKENS 解除
                                mcount++;
                            }
                        }
                    }

                    // メッセージをモンスター数に応じて変更
                    if (mcount === 0) {
                        return Mesg[269];
                    } else if (mcount === 1) {
                        return Mesg[270];
                    } else {
                        return Mesg[271];
                    }
                }
            default:
                return '何も起こらなかった。';
        }
    }

    use(player, game) {
        // 使用処理の分岐
        if (this.type === 'potion') {
            const msg = this.usePotion(player, game);
            this.identified = true;
            return msg;
        }
        else if (this.type === 'scroll') {
            const msg = this.useScroll(player, game);
            this.identified = true;
            return msg;
        }
        else if (this.type === 'food') {
            // 空腹度を回復（増やす）。最大値は1300
            player.hunger = Math.min(1300, player.hunger + this.value);
            return Mesg[266];
        }
        return 'それは使えない。';
    }

    clone() {
        // 新しいインスタンスを作成（コンストラクタでのランダム生成後に値をコピーして上書き）
        const newItem = new Item(this.symbol, this.x, this.y, this.id);

        // 重要プロパティをコピー
        newItem.value = this.value;
        newItem.quantity = 1; // クローンは常に1個
        newItem.identified = this.identified;

        // 変動パラメータ
        newItem.hitBonus = this.hitBonus;
        newItem.damageBonus = this.damageBonus;
        newItem.enchantment = this.enchantment;
        newItem.cursed = this.cursed;
        newItem.charges = this.charges;

        // Type specific
        newItem.wandType = this.wandType;
        newItem.ringType = this.ringType;

        return newItem;
    }
}
