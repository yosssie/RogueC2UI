// ===========================
// スコア管理 (score.c 移植)
// ===========================

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

        // 死因メッセージの生成
        let causeText = '';
        let causeDetail = '';

        if (other !== null && other !== this.DEATH_CAUSES.MONSTER) {
            // その他の死因
            switch (other) {
                case this.DEATH_CAUSES.HYPOTHERMIA:
                    causeText = '凍死した';
                    causeDetail = '凍死';
                    break;
                case this.DEATH_CAUSES.STARVATION:
                    causeText = '餓死した';
                    causeDetail = '餓死';
                    break;
                case this.DEATH_CAUSES.POISON_DART:
                    causeText = '毒ダーツの罠で死んだ';
                    causeDetail = '毒ダーツ';
                    break;
                case this.DEATH_CAUSES.QUIT:
                    causeText = 'ゲームを終了した';
                    causeDetail = '中断';
                    break;
                case this.DEATH_CAUSES.WIN:
                    causeText = 'アミュレットを持って脱出した！';
                    causeDetail = '勝利';
                    break;
            }
        } else if (monster) {
            // モンスターに殺された
            causeText = `${monster.name}に殺された`;
            causeDetail = monster.name;
        }

        // スコア登録
        const rank = this.putScores(monster, other, causeDetail);

        // 墓石表示 (QUITと勝利以外)
        if (other !== this.DEATH_CAUSES.QUIT && other !== this.DEATH_CAUSES.WIN) {
            this.showTombstone(player.name, causeText, player.gold, rank);
        } else if (other === this.DEATH_CAUSES.WIN) {
            this.showVictory(rank);
        } else {
            // QUIT時は簡易メッセージ
            this.game.display.showMessage(`${causeText} (${player.gold}ゴールド)`);
        }
    }

    /**
     * 墓石表示 (score.c killed_by 内のスカル表示)
     */
    showTombstone(playerName, cause, gold, rank) {
        const display = this.game.display;

        // 墓石ASCIIアート (score.c: line 57-71)
        const tombstone = [
            "----------",
            "/          \\",
            "/            \\",
            "/              \\",
            "/                \\",
            "/                  \\",
            "|                  |",
            "|                  |",
            "|                  |",
            "|                  |",
            "|                  |",
            "|                  |",
            "*|     *  *  *      | *",
            "________)/\\_//(\\/(/)\\)/\\//\\/|_)_______"
        ];

        // 各行のX座標（中央揃え用、ROGUE_COLUMNS=80として）
        const xpos = [35, 34, 33, 32, 31, 30, 30, 30, 30, 30, 30, 30, 29, 21];

        // 墓石を中央に配置
        let container = document.getElementById('gameover-screen');
        if (!container) {
            this.createGameOverScreen();
            container = document.getElementById('gameover-screen');
        }

        // ゲーム画面をクリアして墓石を表示
        display.showScreen('gameover');

        const tombDiv = document.getElementById('tombstone');
        if (tombDiv) {
            // 各行を個別に配置（オリジナルのmvaddstr_rogue相当）
            let html = '<div style="font-family: \'Noto Sans Mono\', monospace; color: #888; line-height: 1.2; position: relative; width: 80ch; margin: 0 auto;">';

            // 墓石の各行を表示（Y座標: i+3）
            tombstone.forEach((line, i) => {
                const y = i + 3;
                const x = xpos[i];
                html += `<div style="position: absolute; top: ${y * 1.2}rem; left: ${x}ch; white-space: pre;">${line}</div>`;
            });

            // テキスト情報を中央揃えで表示（center関数相当）
            const year = new Date().getFullYear();
            html += `<div style="position: absolute; top: ${9 * 1.2}rem; width: 100%; text-align: center; color: #fff;">${playerName}</div>`;
            html += `<div style="position: absolute; top: ${10 * 1.2}rem; width: 100%; text-align: center; color: #fff;">${gold}ゴールド</div>`;
            html += `<div style="position: absolute; top: ${12 * 1.2}rem; width: 100%; text-align: center; color: #888;">${cause}</div>`;
            html += `<div style="position: absolute; top: ${14 * 1.2}rem; width: 100%; text-align: center; color: #888;">${year}</div>`;

            html += '</div>';

            // メッセージ
            html += '<div style="text-align: center; margin-top: 2rem; color: #888;">Enterキーでランキングを表示</div>';

            tombDiv.innerHTML = html;
        }
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
            tombDiv.innerHTML = `<div style="text-align: center; color: #ff0; font-size: 2rem; margin-top: 3rem;">
    <div style="margin-bottom: 2rem;">🏆 YOU WIN! 🏆</div>
    <div style="font-size: 1.2rem; color: #fff;">おめでとうございます！</div>
    <div style="font-size: 1rem; color: #aaa; margin-top: 1rem;">
        アミュレットを持って無事に脱出しました。<br>
        あなたは冒険者ギルドに認められ、<br>
        財宝を売って悠々自適な生活を送りました。
    </div>
    ${rank >= 0 && rank < 10 ? `<div style="color: #ff0; margin-top: 2rem; font-weight: bold;">第${rank + 1}位にランクイン！</div>` : ''}
    <div style="margin-top: 3rem; color: #888;">Enterキーでランキングを表示</div>
</div>`;
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

        // 新しいスコアエントリ
        const newScore = {
            name: player.name,
            gold: player.gold,
            level: this.game.currentFloor,
            maxLevel: this.game.currentFloor, // 本来は最大到達階層を記録
            cause: causeDetail,
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

        // ランキング画面を作成
        let rankingScreen = document.getElementById('ranking-screen');
        if (!rankingScreen) {
            const container = document.getElementById('game-container');
            rankingScreen = document.createElement('div');
            rankingScreen.id = 'ranking-screen';
            rankingScreen.className = 'screen';
            container.appendChild(rankingScreen);
        }

        // オリジナルRogueスタイル（シンプル）
        let html = '<div style="font-family: \'Noto Sans Mono\', monospace; color: #fff; padding: 2rem; line-height: 1.5;">';

        // タイトル（3行目、中央）
        html += '<div style="text-align: center; margin-bottom: 2rem;">Top Ten Rogueists</div>';

        // ヘッダー（6行目）
        html += '<div style="margin-bottom: 1rem;">Rank   Score   Name</div>';

        // スコア一覧（8行目から）
        if (scores.length === 0) {
            html += '<div style="margin-top: 2rem; color: #888;">(まだスコアがありません)</div>';
        } else {
            scores.forEach((score, index) => {
                // ランク番号（1-10）
                const rankNum = index === 9 ? '10' : ` ${index + 1}`;

                // スコア（右詰め7桁）
                const goldStr = score.gold.toString().padStart(7, ' ');

                // 名前と死因
                const nameAndCause = `${score.name}: ${score.cause}`;

                // 自分のスコアは反転表示（A_REVERSE相当）
                const isHighlight = (index === highlightRank);
                const style = isHighlight ? 'background-color: #fff; color: #000;' : '';

                html += `<div style="${style}">${rankNum}   ${goldStr}   ${nameAndCause}</div>`;
            });
        }

        html += '</div>';
        html += '<div style="text-align: center; margin-top: 2rem; color: #888;">Enterキーでタイトルに戻る</div>';

        rankingScreen.innerHTML = html;
        display.showScreen('ranking');
    }

    /**
     * スコアをクリア
     */
    clearScores() {
        this.scores = [];
    }
}
