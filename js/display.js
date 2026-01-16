// ===========================
// 表示管理
// ===========================

export class Display {
    constructor() {
        // メイン画面は常に表示
        this.gameScreen = document.getElementById('game-screen');

        // game-main内のビュー
        this.titleContent = document.getElementById('title-content');
        this.dungeonContent = document.getElementById('dungeon-content');
        this.gameoverContent = document.getElementById('gameover-content');
        this.rankingContent = document.getElementById('ranking-content');

        this.victoryContent = document.getElementById('victory-content');
        this.victoryDisplay = document.getElementById('victory-display');

        this.sellingContent = document.getElementById('selling-content');
        this.sellingDisplay = document.getElementById('selling-display');

        // その他の画面（後で対応）
        this.menuScreen = document.getElementById('menu-screen');
        this.configScreen = document.getElementById('config-screen');


        this.messageLog = document.getElementById('message-log');
        this.dungeonDisplay = document.getElementById('dungeon-display');
        this.tombstoneDisplay = document.getElementById('tombstone-display');
        this.rankingDisplay = document.getElementById('ranking-display');
        this.inventoryList = document.getElementById('inventory-list');

        this.statusLevel = document.getElementById('status-level');
        this.statusGold = document.getElementById('status-gold');
        this.statusHp = document.getElementById('status-hp');
        this.statusStr = document.getElementById('status-str');
        this.statusArm = document.getElementById('status-arm');
        this.statusExp = document.getElementById('status-exp');
        this.statusHunger = document.getElementById('status-hunger');
        this.statusConditions = document.getElementById('status-conditions');

        this.debugInfo = document.getElementById('debug-info');
        this.debugMode = false;

        // フォントサイズ変更用のクラスリスト
        this.zoomClasses = ['zoom-medium', 'zoom-small', 'zoom-large'];
        this.currentZoomIndex = 0;

        // タイトル画面の■を緑色+背景色ブロックにする
        const titleArt = document.getElementById('title-art');
        if (titleArt) {
            // 文字色と背景色を同じにして完全なブロックに見せる
            const color = '#ffffff'; // 白
            titleArt.innerHTML = titleArt.innerHTML.replaceAll('■', `<span style="color:${color}; background-color:${color}">■</span>`);
        }
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        if (this.debugMode) {
            this.debugInfo.style.display = 'block';
        } else {
            this.debugInfo.style.display = 'none';
        }
    }

    updateDebugInfo(game) {
        if (!this.debugMode) return;

        const player = game.player;

        // ステータス異常
        let condStr = '';
        if (player.status) {
            Object.keys(player.status).forEach(key => {
                const val = player.status[key];
                if (typeof val === 'number' && val > 0) {
                    condStr += `${key}:${val} `;
                } else if (typeof val === 'boolean' && val) {
                    condStr += `${key} `;
                }
            });
        }
        if (!condStr) condStr = 'Normal';

        // 装備詳細
        const weapon = player.weapon ?
            `${player.weapon.realName || player.weapon.name} (${player.weapon.value} +${player.weapon.hitBonus || 0},+${player.weapon.damageBonus || 0})`
            : 'None';
        const armor = player.equippedArmor ?
            `${player.equippedArmor.realName || player.equippedArmor.name} [${player.equippedArmor.value}]${player.equippedArmor.protected ? '(Prot)' : ''}`
            : 'None [0]';

        // 指輪効果概要
        const rm = game.ringManager;
        const rings = [];
        if (rm.sustainStrength) rings.push('SusStr');
        if (rm.maintainArmor) rings.push('MtnArm');
        if (rm.rSeeInvisible) rings.push('SeeInv');
        if (rm.addStrength !== 0) rings.push(`Str${rm.addStrength > 0 ? '+' : ''}${rm.addStrength}`);
        if (rm.regeneration > 0) rings.push('Regen');
        if (rm.stealthy > 0) rings.push('Stlth');
        if (rm.eRings !== 0) rings.push(`Dgtn:${rm.eRings}`); // 消化 (遅消化はマイナス)
        if (rm.rTeleport) rings.push('Tel'); // テレポート
        if (rm.autoSearch > 0) rings.push('Srch'); // 自動探索
        if (rm.ringExp !== 0) rings.push(`Exp${rm.ringExp > 0 ? '+' : ''}${rm.ringExp}`); // 経験値
        const ringStr = rings.length > 0 ? rings.join(', ') : 'None';

        // 周囲のモンスター
        const nearbyMonsters = game.monsters
            .filter(m => Math.abs(m.x - player.x) < 10 && Math.abs(m.y - player.y) < 10)
            .map(m => {
                let flags = '';
                if (m.hasFlag && m.hasFlag(0x8)) flags += 'SLP '; // ASLEEP
                if (m.hasFlag && m.hasFlag(0x200)) flags += 'CFS '; // CONFUSED
                if (m.hasFlag && m.hasFlag(0x4)) flags += 'INV '; // INVISIBLE
                if (m.hasFlag && m.hasFlag(0x2)) flags += 'SLW '; // SLOWED
                if (m.hasFlag && m.hasFlag(0x1)) flags += 'HST '; // HASTED

                // 行動モード (Chase, Seek, Wander)
                let mode = 'W';
                if (m.canSeePlayer(player, game.level)) {
                    mode = 'C';
                } else if (m.tcol !== null && m.trow !== null) {
                    mode = 'S';
                }
                return `${m.symbol}: HP${m.hp}/${m.maxHp} [${mode}] ${flags}`;
            })
            .join(' | ');

        const text = `Turn: ${game.turnCount || 0}
Pos:(${player.x},${player.y}) Hunger:${player.hunger} (${this.getHungerState(player.hunger)})
Stat:${condStr}
Wep:${weapon}
Arm:${armor}
Rng:${ringStr}
Mon:${nearbyMonsters}`;

        this.debugInfo.textContent = text;
    }

    getHungerState(val) {
        if (val <= 0) return 'STARVE';
        if (val <= 20) return 'FAINT';
        if (val <= 150) return 'WEAK';
        if (val <= 300) return 'HUNGRY';
        return 'NORMAL';
    }

    toggleFontSize() {
        // 現在のクラスを削除
        this.dungeonDisplay.classList.remove(this.zoomClasses[this.currentZoomIndex]);

        // 次のインデックスへ
        this.currentZoomIndex = (this.currentZoomIndex + 1) % this.zoomClasses.length;

        // 新しいクラスを追加
        this.dungeonDisplay.classList.add(this.zoomClasses[this.currentZoomIndex]);

        const sizeName = ['中', '小', '大'][this.currentZoomIndex];
        this.showMessage(`フォントサイズを変更しました: ${sizeName}`);
    }

    clearMessageLog() {
        this.messageLog.innerHTML =
            `<li class="old-message"></li>` +
            `<li class="old-message"></li>` +
            `<li class="old-message"></li>` +
            `<li class="current-message"></li>`;
    }

    showScreen(screenName) {
        // game-main内のビュー切り替え
        // まず全てのビューを非表示
        this.titleContent.classList.remove('active');
        this.dungeonContent.classList.remove('active');
        this.gameoverContent.classList.remove('active');
        this.rankingContent.classList.remove('active');
        this.victoryContent.classList.remove('active');
        this.sellingContent.classList.remove('active');

        // 指定されたビューを表示
        if (screenName === 'title') {
            this.titleContent.classList.add('active');
        } else if (screenName === 'game') {
            this.dungeonContent.classList.add('active');
        } else if (screenName === 'gameover') {
            this.gameoverContent.classList.add('active');
        } else if (screenName === 'ranking') {
            this.rankingContent.classList.add('active');
        } else if (screenName === 'victory') {
            this.victoryContent.classList.add('active');
        } else if (screenName === 'selling') {
            this.sellingContent.classList.add('active');
        }

        // その他の画面は後で対応
        // menu, config, victory, selling, ranking等
    }

    updateMenuCursor(index) {
        const items = this.menuScreen.querySelectorAll('#menu-list li');
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // 全てのメッセージをoldにする（ターン経過時などに呼ぶ）
    archiveMessages() {
        const items = Array.from(this.messageLog.children);
        items.forEach(item => {
            if (item.classList.contains('current-message')) {
                item.classList.remove('current-message');
                item.classList.add('old-message');
            }
        });
    }

    showMessage(message) {
        // 空のメッセージは無視
        if (!message || message.trim() === '') {
            return;
        }

        // 既存のメッセージアイテムを取得
        const items = Array.from(this.messageLog.children);



        // 新しいメッセージを追加
        const newItem = document.createElement('li');
        newItem.textContent = message;
        newItem.classList.add('current-message');
        this.messageLog.appendChild(newItem);

        // 最大4行に制限 (古いものを削除)
        while (this.messageLog.children.length > 4) {
            this.messageLog.removeChild(this.messageLog.firstChild);
        }

        // 下までスクロール (念のため)
        this.messageLog.scrollTop = this.messageLog.scrollHeight;
    }

    updateInventory(inventory, player = null, identifyMode = false, cursorIndex = 0) {
        this.inventoryList.innerHTML = '';

        // 最大アイテム数 (a-x: 24個)
        // ユーザー要望: 24個 + 足元(1個) = 25行で固定
        const MAX_CAPACITY = 24;

        // インベントリから足元アイテムを分離
        const normalItems = inventory.filter(i => !i._isAtFeet && !i._isStairs);
        const atFeetItems = inventory.filter(i => i._isAtFeet || i._isStairs);

        // 1. 通常アイテム表示 (0 ~ MAX_CAPACITY-1)
        for (let i = 0; i < MAX_CAPACITY; i++) {
            const li = document.createElement('li');

            if (i < normalItems.length) {
                const item = normalItems[i];
                // 実際のインデックス（inventory配列内でのインデックス）を探す
                // ※ cursorIndex は inventory 全体でのインデックスなので、ここでマッチングが必要
                // ただし表示順が変わるとカーソル移動ロジックと不整合が起きる可能性がある。
                // Game.jsのカーソルロジックは inventory 配列順。
                // ここで空行を入れると、inventory配列のインデックスと見た目の行数が一致しなくなる（足元アイテムが最後にある場合、間に空行が入るため）。
                // Game.jsのopenSubMenuでのY座標計算も、この見た目に合わせる必要がある。

                // アイテム描画ロジック (共通化したいがとりあえずコピペで)
                this.renderInventoryItem(li, item, player, identifyMode, cursorIndex, inventory.indexOf(item));
            } else {
                // 空行
                li.style.visibility = 'hidden'; // 領域は確保するが見えない
                li.textContent = 'empty'; // 高さ確保のため
            }
            this.inventoryList.appendChild(li);
        }

        // 2. 足元アイテム表示 (MAX_CAPACITY 番目 = 25行目)
        const feetLi = document.createElement('li');
        if (atFeetItems.length > 0) {
            const item = atFeetItems[0]; // 足元は常に1つと仮定
            // 本来のインデックスを渡す
            this.renderInventoryItem(feetLi, item, player, identifyMode, cursorIndex, inventory.indexOf(item));
            // スタイル調整 (at-feet-itemクラスがrenderInventoryItemでつくはずだが、margin-top:autoは不要になるかも)
            // CSSで margin-top: auto がついていると、空行があっても一番下に押し付けられるのでOK
        } else {
            // 足元なしの場合も枠は作る？
            feetLi.style.visibility = 'hidden';
            feetLi.textContent = 'at feet';
        }
        // CSSの .at-feet-item { margin-top: auto } が効くようにクラスをつけるか、
        // あるいはここでは固定行として出力しているので auto は不要。
        // リストが既に埋まってるので、単純に追加すれば一番下になる。
        this.inventoryList.appendChild(feetLi);
    }

    // アイテム描画ヘルパー
    renderInventoryItem(li, item, player, identifyMode, cursorIndex, actualIndex) {
        let name = item.getDisplayName();

        // ステータス文字列構築
        let equipStr = '  ';
        if (player) {
            if (player.weapon === item || player.equippedArmor === item) {
                equipStr = 'E ';
            } else if (player.leftRing === item) {
                equipStr = 'EL';
            } else if (player.rightRing === item) {
                equipStr = 'ER';
            }
        }

        let throwStr = ' ';
        if (player && player.throwEquip === item) {
            throwStr = 'T';
        }

        let curseStr = ' ';
        if (item.cursed && item.identified) {
            curseStr = '!';
        } else if (item.type === 'armor' && item.protected) {
            curseStr = '*';
        }

        const statusStr = `${equipStr}${throwStr}${curseStr}`;

        if (item._isAtFeet || item._isStairs) {
            li.classList.add('at-feet-item');
        }

        // カーソル強調
        if (identifyMode && actualIndex === cursorIndex) {
            li.style.setProperty('background-color', '#ffff00', 'important');
            li.style.color = '#000';
        } else if (actualIndex === cursorIndex) {
            // 通常メニュー時のカーソル表示もCSSクラスで行う場合
            // ユーザーのフォーカスロジックはCSSの :hover や InputManager で処理している？
            // InputManager.handleMenuClick等はない。
            // CSSの li:hover はある。
            // キー操作時のハイライトは Game.js 側で updateInventoryCursor を呼んでいるはず。
            // display.updateInventoryCursor でクラスをつけている。
            // ここでは初期表示時のクラス付けは不要（あとで updateInventoryCursor が呼ばれるか、自動でつくか）
            // identifyModeのみ特別扱いされている。
        }

        if (item.cursed && item.identified) {
            li.classList.add('cursed-item');
        }

        if (item.identified) {
            let hasPositiveEnchant = false;
            if (item.type === 'weapon' && (item.hitBonus > 0 || item.damageBonus > 0)) {
                hasPositiveEnchant = true;
            } else if (item.type === 'armor' && item.damageBonus > 0) {
                hasPositiveEnchant = true;
            } else if (item.type === 'ring' && item.enchantment > 0) {
                hasPositiveEnchant = true;
            }
            if (hasPositiveEnchant && !(identifyMode && actualIndex === cursorIndex)) {
                li.classList.add('enchanted-item');
            }
        }

        const statusSpan = document.createElement('span');
        statusSpan.classList.add('item-status');
        statusSpan.textContent = statusStr;
        li.appendChild(statusSpan);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        li.appendChild(nameSpan);

        // ID保持 (updateInventoryCursor用)
        li.dataset.index = actualIndex;
    }

    renderDungeon(level, player, monsters, items, targetInfo = null, trapManager = null, debugMode = false) {
        const width = level.width;
        const height = level.height;
        let output = '';

        // 状態異常チェック
        const isBlind = player.status && player.status.blind > 0;
        const isHallucinating = player.status && player.status.hallucinating > 0;
        const hasDetectMonster = player.status && player.status.detectMonster > 0;
        const hasDetectObjects = player.status && (player.status.detectObjects > 0 || player.status.detectObjects === true);

        // 全体を常に描画 (範囲制限ロジックを削除)
        // 拡大時の表示位置合わせはスクロール制御(updateCamera)で行う

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let char = ' ';
                let cssClass = '';

                // ターゲットカーソル
                let isTarget = (targetInfo && targetInfo.x === x && targetInfo.y === y);

                // 盲目チェック: 隣接セルのみ表示 (use.c go_blind)
                if (isBlind && !debugMode) {
                    const dx = Math.abs(x - player.x);
                    const dy = Math.abs(y - player.y);
                    if (dx > 1 || dy > 1) {
                        output += ' ';
                        continue;
                    }
                }

                // 視界チェック: 訪れた場所のみ表示
                // ただし、detectObjects フラグがある場合はアイテムだけは表示
                const hasDetectObjects = player.status && (player.status.detectObjects > 0 || player.status.detectObjects === true);
                if (!level.isVisible(x, y)) {
                    // アイテム感知フラグがあれば、アイテムだけは表示
                    if (hasDetectObjects && items.some(i => i.x === x && i.y === y)) {
                        const item = items.find(i => i.x === x && i.y === y);
                        char = item.symbol;
                        cssClass = `item ${item.type} detected`;
                        if (isTarget) {
                            cssClass += ' target-cursor';
                        }
                        output += `<span class="${cssClass}">${char}</span>`;
                    } else {
                        output += ' ';
                    }
                    continue;
                }

                // プレイヤー
                if (player.x === x && player.y === y) {
                    char = '@';
                    cssClass = 'player';
                }
                // モンスター(デバッグモード時は全表示、モンスター感知時も全表示、通常時はプレイヤーの視界内のみ)
                else if ((debugMode || hasDetectMonster || this.isInPlayerSight(x, y, player, level)) && monsters.some(m => {
                    if (m.x !== x || m.y !== y) return false;
                    // 透明チェック (INVISIBLE=0x4)
                    // hasFlagがない場合（古いオブジェクト）は常に見える
                    if (m.hasFlag && m.hasFlag(4)) {
                        return player.canSeeInvisible(); // メソッド呼び出しに変更
                    }
                    return true;
                })) {
                    const monster = monsters.find(m => m.x === x && m.y === y);
                    // 幻覚時はランダムなモンスターシンボル (use.c hallucinate)
                    if (isHallucinating) {
                        char = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
                    } else {
                        char = monster.symbol || monster.type || '?';
                    }
                    cssClass = 'monster';
                }
                // 罠 (trap.c show_traps())
                else if (trapManager && trapManager.getVisibleTraps().some(t => t.col === x && t.row === y)) {
                    char = '^';
                    cssClass = 'trap';
                }
                // アイテム
                else if (items.some(i => i.x === x && i.y === y)) {
                    const item = items.find(i => i.x === x && i.y === y);
                    // 幻覚時はランダムなアイテムシンボル (use.c hallucinate)
                    if (isHallucinating) {
                        const symbols = ['!', '?', '/', '=', ')', ']', ':', '*'];
                        char = symbols[Math.floor(Math.random() * symbols.length)];
                    } else {
                        char = item.symbol;
                    }
                    cssClass = `item ${item.type}`;
                }
                // 罠 (オリジナルRogue準拠: 地図作成の巻物で表示される - room.c draw_magic_map line 315-316)
                else if (trapManager && trapManager.traps.some(t => t.col === x && t.row === y && !t.hidden)) {
                    char = '^';
                    cssClass = 'trap';
                }
                // 地形
                else {
                    const tile = level.getTile(x, y);
                    char = tile;

                    switch (tile) {
                        case '#':
                            cssClass = 'passage';
                            break;
                        case '-':
                        case '|':
                            cssClass = 'wall';
                            break;
                        case '.':
                            cssClass = 'floor';
                            break;
                        case '+':
                            cssClass = 'door';
                            break;
                        case '%':
                            cssClass = 'stairs';
                            break;
                        case '*':
                            cssClass = 'gold';
                            break;
                    }
                }

                if (isTarget) {
                    cssClass += ' target-cursor';
                }

                if (cssClass) {
                    output += `<span class="${cssClass}">${char}</span>`;
                } else {
                    output += char;
                }
            }
            output += '\n';
        }

        this.dungeonDisplay.innerHTML = output;

    }


    isInPlayerSight(x, y, player, level) {
        if (level && level.canSee) {
            return level.canSee(player.x, player.y, x, y);
        }
        // フォールバック (Level.js更新前など)
        const dx = Math.abs(x - player.x);
        const dy = Math.abs(y - player.y);
        return dx <= 1 && dy <= 1;
    }

    updateInventoryCursor(index) {
        const items = Array.from(this.inventoryList.children);
        items.forEach((item) => {
            // dataset.indexで照合（display.updateInventoryで設定済み）
            // 空のliにはdataset.indexがないので無視される
            if (item.dataset.index && parseInt(item.dataset.index, 10) === index) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    showSubMenu(x, y, options, selectedIndex = 0) {
        const submenu = document.getElementById('submenu');
        const list = document.getElementById('submenu-list');

        list.innerHTML = '';
        options.forEach((opt, i) => {
            const li = document.createElement('li');
            li.textContent = opt.label;
            if (i === selectedIndex) li.classList.add('selected');
            list.appendChild(li);
        });

        // インベントリリストから選択中のアイテムの位置を取得
        const inventoryList = document.getElementById('inventory-list');
        const selectedItem = inventoryList?.querySelector('li.selected');
        const allItems = inventoryList?.querySelectorAll('li'); // 全アイテム（足元含む）
        const rightPanel = document.getElementById('right-panel');

        if (selectedItem && rightPanel && allItems.length > 0) {
            const itemRect = selectedItem.getBoundingClientRect();
            const panelRect = rightPanel.getBoundingClientRect();

            // サブメニューの高さを取得するために一時的に表示（不可視）
            submenu.style.visibility = 'hidden';
            submenu.classList.remove('hidden');
            const submenuHeight = submenu.offsetHeight;
            const itemHeight = itemRect.height; // アイテム行の高さ

            // インデックスと係数tを計算
            const index = Array.from(allItems).indexOf(selectedItem);
            const total = allItems.length;

            // 係数 t (0.0:先頭 ～ 1.0:末尾)
            const t = (total > 1) ? (index / (total - 1)) : 0;

            // 位置補正計算 (線形補間)
            // t=0 (先頭): offset=0 -> 上辺合わせ
            // t=1 (末尾): offset=diff -> 下辺合わせ
            const offset = (submenuHeight - itemHeight) * t;
            const top = itemRect.top - offset;

            submenu.style.top = top + 'px';

            // 横位置: パネルの左端から70px右に配置
            const submenuWidth = 200; // CSS定義値
            submenu.style.left = (panelRect.left - submenuWidth + 70) + 'px';
            submenu.style.right = 'auto';

            // 表示状態にする
            submenu.style.visibility = '';
        } else {
            // フォールバック: 渡された座標を使用
            submenu.style.left = 'auto';
            submenu.style.right = '19rem';
            submenu.style.top = y + 'px';
            submenu.classList.remove('hidden');
        }
    }

    hideSubMenu() {
        const submenu = document.getElementById('submenu');
        if (submenu) submenu.classList.add('hidden');
    }

    // メニューオーバーレイ関連
    openMenuOverlay() {
        const menuScreen = document.getElementById('menu-screen');
        if (menuScreen) {
            menuScreen.classList.add('active');
        }
    }

    closeMenuOverlay() {
        const menuScreen = document.getElementById('menu-screen');
        if (menuScreen) {
            menuScreen.classList.remove('active');
        }
    }

    openConfigOverlay() {
        const configScreen = document.getElementById('config-screen');
        if (configScreen) {
            configScreen.classList.add('active');
        }
    }

    closeConfigOverlay() {
        const configScreen = document.getElementById('config-screen');
        if (configScreen) {
            configScreen.classList.remove('active');
        }
    }

    updateStatus(game) {
        const player = game.player;
        const floor = game.currentFloor;

        this.statusLevel.textContent = `階: ${floor}`;
        this.statusGold.textContent = `金貨: ${player.gold}`;
        this.statusHp.textContent = `体力: ${player.hp}(${player.maxHp})`;
        this.statusStr.textContent = `強さ: ${player.str}(${player.maxStr})`;
        this.statusArm.textContent = `守備: ${player.armor}`;
        this.statusExp.textContent = `経験: ${player.level}/${player.exp}`;

        let hungerText = '';
        if (player.hunger <= 20) {
            hungerText = '瀕死'; // Faint (mesg[75])
            this.statusHunger.style.color = '#ff4444'; // 赤
        } else if (player.hunger <= 150) {
            hungerText = '飢餓'; // Weak (mesg[73])
            this.statusHunger.style.color = '#ff8800'; // オレンジ
        } else if (player.hunger <= 300) {
            hungerText = '空腹'; // Hungry (mesg[71])
            this.statusHunger.style.color = '#ffff44'; // 黄
        } else {
            this.statusHunger.style.color = '';
        }
        this.statusHunger.textContent = hungerText;

        // 状態異常 (絵文字表示)
        const conditions = [];
        const status = player.status;
        const rm = game.ringManager; // RingManager

        if (status.confused > 0) conditions.push('💫');
        if (status.blind > 0) conditions.push('🕶️');
        if (status.hallucinating > 0) conditions.push('🌈');
        if (status.sleep > 0) {
            conditions.push(status.isFrozen ? '❄️' : '💤');
        }
        // 金縛り (held) または 罠 (bearTrap)
        if (status.held || (game.trapManager && game.trapManager.bearTrapTurns > 0)) conditions.push('⛓️');
        if (status.slow > 0) conditions.push('🐢');
        if (status.fast > 0) conditions.push('🐇');
        if (status.levitate > 0) conditions.push('🎈');
        // 透明視認
        if (status.seeInvisible || (rm && rm.rSeeInvisible)) conditions.push('👁️');
        // 感知
        if (status.detectMonster || status.detectObjects) conditions.push('🔍');
        // 強力 (現在の力が最大を超えている、または指輪で増強されている)
        if (player.str > player.maxStr || (rm && rm.addStrength !== 0)) conditions.push('💪');

        this.statusConditions.textContent = conditions.join('');
    }

    // 炎エフェクト表示 (Original Rogue flame_broil 準拠)
    async showFlameEffect(startX, startY, endX, endY, dx, dy, level, player, monsters, items, trapManager, debugMode) {
        // 軌跡を計算
        const path = [];
        let cx = startX + dx;
        let cy = startY + dy;

        while (cx !== endX || cy !== endY) {
            path.push({ x: cx, y: cy });
            cx += dx;
            cy += dy;
        }

        // 一時的に炎を表示するための仮想アイテムを作成
        const flameItems = path.map(pos => ({
            x: pos.x,
            y: pos.y,
            symbol: '~',
            type: 'flame',
            getDisplayName: () => '炎'
        }));

        // 炎を含めて再描画
        this.renderDungeon(level, player, monsters, [...items, ...flameItems], null, trapManager, debugMode);

        // 50ms待機
        await new Promise(resolve => setTimeout(resolve, 50));

        // 元の表示に戻す
        this.renderDungeon(level, player, monsters, items, null, trapManager, debugMode);
    }

    // 魔法の矢エフェクト表示 (Magic Missile)
    async showMissileEffect(startX, startY, dir, level, player, monsters, items, trapManager, debugMode) {
        const dirs = [
            { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
            { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
        ];
        const d = dirs[dir];
        const dx = d.x;
        const dy = d.y;

        // 軌跡を計算 (wand.js getZappedMonster と同等だが壁まで進む)
        const path = [];
        let cx = startX + dx;
        let cy = startY + dy;

        for (let i = 0; i < 20; i++) {
            // 範囲外チェック
            if (!level.isInBounds(cx, cy)) break;

            // 壁チェック
            if (!level.isWalkable(cx, cy)) break;

            path.push({ x: cx, y: cy });

            // モンスターがいるかチェック（当たったらそこで止まる）
            if (monsters.some(m => m.x === cx && m.y === cy)) {
                break;
            }

            cx += dx;
            cy += dy;
        }

        if (path.length === 0) return;

        // 一時的に矢を表示するための仮想アイテムを作成
        const missileItems = path.map(pos => ({
            x: pos.x,
            y: pos.y,
            symbol: '*', // 魔法の矢のシンボル
            type: 'missile',
            getDisplayName: () => '魔法の矢'
        }));

        // ユーザー要望により、ドラゴンの炎と同じく一括表示（高速化）
        this.renderDungeon(level, player, monsters, [...items, ...missileItems], null, trapManager, debugMode);
        await new Promise(resolve => setTimeout(resolve, 50));

        /* 以前の順次表示ロジック
        for (let i = 0; i < missileItems.length; i++) {
            const currentItem = missileItems[i];
            // 過去の軌跡も残すならこれ
            // const currentItems = missileItems.slice(0, i + 1);
            // 弾だけ飛ぶならこれ
            const currentItems = [currentItem];

            this.renderDungeon(level, player, monsters, [...items, ...currentItems], null, trapManager, debugMode);
            await new Promise(resolve => setTimeout(resolve, 30)); // 速めに
        }

        // 最後にもう少し待つ
        await new Promise(resolve => setTimeout(resolve, 50));
        */

        // 元の表示に戻す
        this.renderDungeon(level, player, monsters, items, null, trapManager, debugMode);
    }

    // クリア画面（バナーとメッセージ）
    drawVictory(bannerData, Mesg) {
        this.showScreen('victory');

        let html = '';

        // ヘルパー：中央揃え用のスペース生成
        const getCenterPadding = (text) => {
            const width = 80;
            // マルチバイト文字幅を考慮したパディング計算が必要だが、メッセージは全角が多い
            // getTextWidth相当の簡易計算（全角2、半角1）
            let textWidth = 0;
            for (let i = 0; i < text.length; i++) {
                const c = text.charCodeAt(i);
                if ((c >= 0x3000 && c <= 0xffff) || (c >= 0xff01 && c <= 0xff60)) {
                    textWidth += 2;
                } else {
                    textWidth += 1;
                }
            }
            const padding = Math.max(0, Math.floor((width - textWidth) / 2));
            return ' '.repeat(padding);
        };

        // Y=0-5: 空行 (6行)
        html += '\n'.repeat(6);

        // Y=6-12: バナー (7行)
        // 表示位置: X=10 (rogue.h ROGUE_COLUMNS/2 - 30 -> 40 - 30 = 10)
        const bannerIndent = ' '.repeat(10);

        bannerData.forEach(row => {
            let rowStr = '';
            for (let i = 0; i < 59; i++) { // 幅59
                // bit check
                const byte = row[i >> 3];
                const mask = 0x80 >> (i & 7);
                if (byte & mask) {
                    rowStr += '@';
                } else {
                    rowStr += ' ';
                }
            }
            // バナー行構築 (緑色)
            html += bannerIndent + `<span style="color: #0f0;">${rowStr}</span>\n`;
        });

        // Y=13-14: 空行 (2行)
        html += '\n'.repeat(2);

        // Y=15-18: メッセージ (4行)
        [182, 183, 184, 185].forEach(id => {
            const msg = Mesg[id];
            html += getCenterPadding(msg) + msg + '\n';
        });

        // Y=19-: ガイド
        html += '\n\n';
        const guide = "-- Press Button A to continue --";
        html += getCenterPadding(guide) + guide;

        this.victoryDisplay.innerHTML = html;
    }

    // 売却画面
    drawSelling(inventoryData, Mesg) {
        this.showScreen('selling');

        let html = '';

        // インデント設定 (20文字)
        const indent = ' '.repeat(20);

        // ヘッダー行: Mesg[198] " 価格      持ちもの"
        html += indent + Mesg[198] + '\n';

        // データ行
        inventoryData.forEach(item => {
            // item: { value: number, name: string }
            // フォーマット: "%5d      " (5 digits + 6 spaces)
            const valStr = item.value.toString().padStart(5, ' ');
            const gap = '      ';
            const line = `${valStr}${gap}${item.name}`;
            html += indent + line + '\n';
        });

        // フッター（ガイド）
        const footer = "-- Press Button A to continue --";
        html += '\n\n' + indent + footer;

        // 上部に余白
        this.sellingDisplay.innerHTML = '\n'.repeat(5) + html;
    }
}
