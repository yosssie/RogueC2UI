// ===========================
// スコア管理 (score.c 移植)
// ===========================

import { Mesg } from './mesg_J.js';

export class ScoreManager {
    constructor(game) {
        this.game = game;
        this.scores = []; // メモリ内スコア保存 (リロードで消失)
        this.maxScores = 10;

        // 死因の種類 (score.c)
        this.DEATH_CAUSES = {
            MONSTER: 0,      // モンスターに殺された
            HYPOTHERMIA: 1,  // 凍死
            STARVATION: 2,   // 餓死
            POISON_DART: 3,  // 毒ダーツ
            QUIT: 4,         // 自主退出
            WIN: 5           // 勝利
        };
    }

    /**
     * killed_by() - プレイヤー死亡処理
     * @param {Object} monster - 殺したモンスター (nullの場合はother指定)
     * @param {number} other - その他の死因
     */
    killedBy(monster = null, other = null) {
        const player = this.game.player;

        // 自主退出以外は金貨を10%減らす (score.c: line 83, 173, 230)
        if (other !== this.DEATH_CAUSES.QUIT) {
            player.gold = Math.floor(player.gold * 0.9);
        }

        // 死因メッセージの生成（オリジナルのRogueと同じMesg配列を使用）
        let causeText = '';
        let causeDetail = '';
        let cause1 = '';  // 第一要因
        let cause2 = '';  // 第二要因

        if (other !== null && other !== this.DEATH_CAUSES.MONSTER) {
            // その他の死因（os1とos2配列に対応）
            const os1 = ['', Mesg[168], Mesg[169], Mesg[170], Mesg[171]];
            const os2 = ['', Mesg[172], Mesg[173], Mesg[174], Mesg[175]];

            cause1 = os1[other] || '';
            cause2 = os2[other] || '';
            causeText = cause1 + cause2;

            // causeDetailは短い形式
            switch (other) {
                case this.DEATH_CAUSES.HYPOTHERMIA:
                    causeDetail = '凍死';
                    break;
                case this.DEATH_CAUSES.STARVATION:
                    causeDetail = '餓死';
                    break;
                case this.DEATH_CAUSES.POISON_DART:
                    causeDetail = '毒ダーツ';
                    break;
                case this.DEATH_CAUSES.QUIT:
                    causeDetail = '中断';
                    break;
                case this.DEATH_CAUSES.WIN:
                    causeDetail = '勝利';
                    break;
            }
        } else if (monster) {
            // モンスターに殺された
            cause1 = monster.name;
            cause2 = Mesg[176]; // "と戦いて死す"
            causeText = cause1 + cause2;
            causeDetail = monster.name;
        }

        // スコア登録
        const rank = this.putScores(monster, other, causeDetail);

        // 墓石表示 (QUITと勝利以外)
        if (other !== this.DEATH_CAUSES.QUIT && other !== this.DEATH_CAUSES.WIN) {
            this.showTombstone(player.name, cause1, cause2, player.gold, rank);
        } else if (other === this.DEATH_CAUSES.WIN) {
            this.showVictory(rank);
        } else {
            // QUIT時は簡易メッセージ
            this.game.display.showMessage(`${causeText} (${player.gold}ゴールド)`);
        }
    }

    /**
     * 文字列の表示幅を計算（全角=2、半角=1）
     */
    getTextWidth(text) {
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            // 全角文字（ASCII以外）は幅2、半角は幅1
            width += text.charCodeAt(i) > 127 ? 2 : 1;
        }
        return width;
    }

    /**
     * 指定した幅に収まるようにテキストを切り詰める
     */
    truncateToWidth(text, maxWidth) {
        let width = 0;
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charWidth = text.charCodeAt(i) > 127 ? 2 : 1;
            if (width + charWidth > maxWidth) break;
            result += text[i];
            width += charWidth;
        }
        return result;
    }

    /**
     * 墓石表示 (score.c killed_by 内のスカル表示)
     */
    showTombstone(playerName, cause1, cause2, gold, rank) {
        const display = this.game.display;

        // 墓石ASCIIアート (score.c: line 57-71)
        const tombstone = [
            "----------",
            "/          \\",
            "/            \\",
            "/              \\",
            "/                \\",
            "/                  \\",
            "|                  |", // line 6, Y=8
            "|                  |", // line 7, Y=9 (Name)
            "|                  |", // line 8, Y=10 (Gold)
            "|                  |", // line 9, Y=11 (Cause1)
            "|                  |", // line 10, Y=12 (Cause2)
            "|                  |", // line 11, Y=13
            "*|     *  *  *      | *", // line 12, Y=14 (Year)
            "________)/\\_//(\\/(/)\\)/\\//\\/|_)_______"
        ];

        // 各行のX座標（中央揃え用、ROGUE_COLUMNS=80として）
        const xpos = [35, 34, 33, 32, 31, 30, 30, 30, 30, 30, 30, 30, 29, 21];

        // ゲーム画面をクリアして墓石を表示
        display.showScreen('gameover');

        // 画面サイズ（ダンジョンと同じ80x24）
        const width = 80;
        const height = 24;

        // 空の画面を作成
        const screen = Array(height).fill(null).map(() => Array(width).fill(' '));

        // 墓石の各行を配置（Y座標: i+2で上部に配置）
        tombstone.forEach((line, i) => {
            const y = i + 2;
            const x = xpos[i];
            for (let j = 0; j < line.length; j++) {
                if (y < height && x + j < width) {
                    screen[y][x + j] = line[j];
                }
            }
        });

        // テキスト情報を墓石の空白を埋める形で配置
        const year = new Date().getFullYear();
        const tombInsideWidth = 18; // 墓石の内側の幅（半角文字数）
        // 墓石の内側左端は、Y=8-13では xpos[6]+1 = 30+1 = 31
        // Y=14では xpos[12]+2 = 29+2 = 31 (*| の次)
        const tombLeftIndex = 31;

        // 墓石の内側にテキストを配置する関数
        const placeTextInTomb = (y, text) => {
            let displayedText = text;

            // 1. 幅計算と切り詰め
            let textWidth = this.getTextWidth(displayedText);
            if (textWidth > tombInsideWidth) {
                displayedText = this.truncateToWidth(displayedText, tombInsideWidth);
                textWidth = this.getTextWidth(displayedText);
            }

            // 全角文字数をカウント
            let fullWidthCount = 0;
            for (let i = 0; i < displayedText.length; i++) {
                if (displayedText.charCodeAt(i) > 127) fullWidthCount++;
            }

            // 2. パディング計算
            // 環境によっては全角文字の幅が半角x2より狭くなるため、スペース不足で表示がへこむ（枠が左にずれる）現象が起きる。
            // 係数0.35で補正してスペースを追加する。
            const adjust = Math.round(fullWidthCount * 0.35);

            const totalSpaces = tombInsideWidth - textWidth + adjust;
            const leftSpaces = Math.floor(totalSpaces / 2);
            /* 右側は残りで埋める */
            const rightSpaces = totalSpaces - leftSpaces;

            // 3. 挿入する文字配列を作成
            const chars = [];
            for (let i = 0; i < leftSpaces; i++) chars.push(' ');
            for (let i = 0; i < displayedText.length; i++) chars.push(displayedText[i]);
            for (let i = 0; i < rightSpaces; i++) chars.push(' ');

            // 4. screen[y] の tombLeftIndex から 18要素を削除し、chars を挿入
            //    screen配列の要素数が増えるが、表示上の幅が合致するはず
            if (y >= 0 && y < height) {
                screen[y].splice(tombLeftIndex, 18, ...chars);
            }
        };

        // 名前（Y=9）
        placeTextInTomb(9, playerName);

        // ゴールド（Y=10）
        placeTextInTomb(10, `${gold} Au`);

        // 第一要因（Y=11）
        placeTextInTomb(11, cause1);

        // 第二要因（Y=12）
        placeTextInTomb(12, cause2);

        // 年号（Y=14）
        placeTextInTomb(14, String(year));

        // メッセージ（Y=18、墓石の下）
        const msg = "-- Press Button A to see ranking --";
        const msgX = 40 - Math.floor(msg.length / 2);
        for (let i = 0; i < msg.length; i++) {
            if (18 < height && msgX + i < width) {
                screen[18][msgX + i] = msg[i];
            }
        }

        // 画面を文字列に変換
        let output = '';
        for (let y = 0; y < height; y++) {
            output += screen[y].join('') + '\n';
        }

        // tombstone-displayに設定
        display.tombstoneDisplay.textContent = output;

        // メッセージエリアにメッセージを表示
        const tombstoneMessage = `${Mesg[177]} ${Mesg[178]}`;  // "安らかに 眠れ"
        display.showMessage(tombstoneMessage);
    }

    /**
     * 勝利画面表示 (score.c win())
     */
    showVictory(rank) {
        const display = this.game.display;

        // gameover-screen がない場合は作成
        if (!document.getElementById('gameover-screen')) {
            this.createGameOverScreen();
        }

        display.showScreen('gameover');

        const tombDiv = document.getElementById('tombstone');
        if (tombDiv) {
            // オリジナルRogueのメッセージ (mesg_J.js: 182-185)
            // 中央揃えで表示
            let html = '<div style="text-align: center; color: #ff0; font-size: 1.2rem; margin-top: 5rem; line-height: 2;">';
            html += `<div>${Mesg[182]}</div>`;
            html += `<div>${Mesg[183]}</div>`;
            html += `<div>${Mesg[184]}</div>`;
            html += `<div>${Mesg[185]}</div>`;

            if (rank >= 0 && rank < 10) {
                html += `<div style="color: #fff; margin-top: 3rem; font-weight: bold;">第${rank + 1}位にランクイン！</div>`;
            }

            html += '<div style="margin-top: 4rem; color: #888;">Aボタンでランキングを表示</div>';
            html += '</div>';

            tombDiv.innerHTML = html;
        }
    }

    /**
     * gameover-screen を作成
     */
    createGameOverScreen() {
        const container = document.getElementById('game-container');
        if (!container) return;

        let gameoverScreen = document.getElementById('gameover-screen');
        if (!gameoverScreen) {
            gameoverScreen = document.createElement('div');
            gameoverScreen.id = 'gameover-screen';
            gameoverScreen.className = 'screen';
            gameoverScreen.innerHTML = '<div id="tombstone" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;"></div>';
            container.appendChild(gameoverScreen);
        }
    }

    /**
     * put_scores() - スコアを記録してランキング表示
     * @returns {number} ランクイン順位 (-1なら圏外)
     */
    putScores(monster, other, causeDetail) {
        const player = this.game.player;
        const scores = this.getScores();

        // 詳細な死因メッセージ生成 (score.c insert_score 準拠)
        let fullReason = "";

        // 勝利以外の場合、階層情報を付加
        if (other !== this.DEATH_CAUSES.WIN) {
            // 魔除けあ持っているかチェック
            const hasAmulet = player.inventory.some(item => item.type === 'amulet');
            if (hasAmulet) {
                fullReason += Mesg[189]; // "魔除けを手に、"
            }
            fullReason += Mesg[190]; // "地下"
            fullReason += `${this.game.currentFloor}`;
            fullReason += Mesg[191]; // "階にて"
        }

        let deathMsg = "";
        if (other !== null && other !== this.DEATH_CAUSES.MONSTER) {
            // その他の死因のメッセージ (mesg_J.js 192-196)
            switch (other) {
                case this.DEATH_CAUSES.HYPOTHERMIA: deathMsg = Mesg[192]; break; // 寒さにより死す
                case this.DEATH_CAUSES.STARVATION: deathMsg = Mesg[193]; break; // 飢えにより死す
                case this.DEATH_CAUSES.POISON_DART: deathMsg = Mesg[194]; break; // 毒矢により死す
                case this.DEATH_CAUSES.QUIT: deathMsg = Mesg[195]; break; // 逃亡す
                case this.DEATH_CAUSES.WIN: deathMsg = Mesg[196]; break; // 生きて帰りたる勇者
            }
        } else if (monster) {
            deathMsg = `${monster.name}${Mesg[197]}`; // "XXと戦いて死す"
        }

        fullReason += deathMsg + "。";

        // 新しいスコアエントリ
        const newScore = {
            name: player.name,
            gold: player.gold,
            level: this.game.currentFloor,
            maxLevel: this.game.currentFloor, // 本来は最大到達階層を記録
            cause: fullReason, // 詳細メッセージを保存
            isWin: (other === this.DEATH_CAUSES.WIN),
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        // 既存スコアと比較してランクを決定
        let rank = -1;
        for (let i = 0; i < scores.length; i++) {
            if (newScore.gold > scores[i].gold) {
                rank = i;
                break;
            }
        }

        // スコアが10件未満で、まだランクインしていない場合
        if (rank === -1 && scores.length < this.maxScores) {
            rank = scores.length;
        }

        // ランクインした場合、スコアを挿入
        if (rank >= 0 && rank < this.maxScores) {
            this.scores.splice(rank, 0, newScore);

            // トップ10のみ保持
            this.scores = this.scores.slice(0, this.maxScores);
        }

        return rank;
    }

    /**
     * スコア一覧を取得
     */
    getScores() {
        return this.scores || [];
    }

    /**
     * ランキング画面を表示 (score.c put_scores のランキング表示部分)
     */
    showRanking(highlightRank = -1) {
        const scores = this.getScores();
        const display = this.game.display;

        // ランキング画面を表示
        display.showScreen('ranking');

        // 表示テキスト構築 (innerHTMLを使用することで行ごとのスタイル適用を可能にする)
        let html = '';

        // ヘルパー：中央揃え用のスペース生成
        const getCenterPadding = (text) => {
            const width = 80; // 画面幅
            const textWidth = this.getTextWidth(text);
            const padding = Math.max(0, Math.floor((width - textWidth) / 2));
            return ' '.repeat(padding);
        };

        // 上部余白
        html += '\n'.repeat(2);

        // タイトル
        const title = Mesg[187];
        html += getCenterPadding(title) + title + '\n\n\n';

        // ヘッダー
        const header = Mesg[188];
        html += '                          ' + header + '\n\n';

        // スコア一覧
        if (scores.length === 0) {
            const noScore = "(まだスコアがありません)";
            html += getCenterPadding(noScore) + noScore + '\n';
        } else {
            scores.forEach((score, index) => {
                // ランク番号（1-10）
                // ランク番号 (sprintf(" %2d", rank+1))
                // 先頭スペース1 + 2桁右詰め = 計3文字
                const rankNum = index + 1;
                const rankPart = ' ' + rankNum.toString().padStart(2, ' ');

                // インデント: 26文字
                let line = '                          ' + rankPart + '   ';

                // スコア (sprintf("%6ld", gold)) -> 6桁右詰め
                const goldStr = score.gold.toString().padStart(6, ' ');
                line += goldStr + '   ';

                // 名前と死因 (sprintf("%s: ", name))
                // format: " %2d   %6ld   %s: "
                const nameAndCause = `${score.name}: ${score.cause}`;
                line += nameAndCause;

                // 自分のスコアは反転表示
                if (index === highlightRank) {
                    html += `<span style="background-color: #ccc; color: #000;">${line}</span>\n`;
                } else {
                    html += `${line}\n`;
                }
            });
        }

        html += '\n\n';
        const footer = "Aボタンでタイトルに戻る";
        html += getCenterPadding(footer) + footer;

        display.rankingDisplay.innerHTML = html;
    }

    /**
     * スコアをクリア
     */
    clearScores() {
        this.scores = [];
    }
}
