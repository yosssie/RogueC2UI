// ===========================
// 表示管理
// ===========================

export class Display {
    constructor() {
        this.titleScreen = document.getElementById('title-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.menuScreen = document.getElementById('menu-screen');
        this.configScreen = document.getElementById('config-screen');

        this.messageLog = document.getElementById('message-log');
        this.dungeonDisplay = document.getElementById('dungeon-display');
        this.inventoryList = document.getElementById('inventory-list');

        this.statusLevel = document.getElementById('status-level');
        this.statusGold = document.getElementById('status-gold');
        this.statusHp = document.getElementById('status-hp');
        this.statusStr = document.getElementById('status-str');
        this.statusArm = document.getElementById('status-arm');
        this.statusExp = document.getElementById('status-exp');

        this.debugInfo = document.getElementById('debug-info');
        this.debugMode = false;

        // フォントサイズ変更用のクラスリスト
        this.zoomClasses = ['zoom-medium', 'zoom-small', 'zoom-large'];
        this.currentZoomIndex = 0;
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

    showScreen(screenName) {
        // 全画面を非表示（静的な画面）
        [this.titleScreen, this.gameScreen, this.menuScreen, this.configScreen].forEach(screen => {
            screen.classList.remove('active');
        });

        // 動的に作成された画面も非表示
        const gameoverScreen = document.getElementById('gameover-screen');
        const rankingScreen = document.getElementById('ranking-screen');
        if (gameoverScreen) gameoverScreen.classList.remove('active');
        if (rankingScreen) rankingScreen.classList.remove('active');

        // 指定画面を表示
        switch (screenName) {
            case 'title':
                this.titleScreen.classList.add('active');
                break;
            case 'game':
                this.gameScreen.classList.add('active');
                break;
            case 'menu':
                this.menuScreen.classList.add('active');
                break;
            case 'config':
                this.configScreen.classList.add('active');
                break;
            case 'gameover':
                // gameover-screenは動的に作成されるので、存在確認
                const gameoverScreen = document.getElementById('gameover-screen');
                if (gameoverScreen) {
                    gameoverScreen.classList.add('active');
                }
                break;
            case 'ranking':
                // ranking-screenは動的に作成されるので、存在確認
                const rankingScreen = document.getElementById('ranking-screen');
                if (rankingScreen) {
                    rankingScreen.classList.add('active');
                }
                break;
        }
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

    showMessage(message) {
        // 空のメッセージは無視
        if (!message || message.trim() === '') {
            return;
        }

        // 既存のメッセージアイテムを取得
        const items = Array.from(this.messageLog.children);

        // 直前のメッセージと同じ場合はスキップ（連続重複防止）
        if (items.length > 0) {
            const lastMessage = items[items.length - 1].textContent;
            if (lastMessage === message) {
                return;
            }
        }

        // クラスをシフト (current -> old)
        items.forEach(item => {
            if (item.classList.contains('current-message')) {
                item.classList.remove('current-message');
                item.classList.add('old-message');
            }
        });

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

    updateInventory(inventory, player = null) {
        this.inventoryList.innerHTML = '';
        if (inventory.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = '(なし)';
            emptyItem.style.opacity = '0.5';
            this.inventoryList.appendChild(emptyItem);
        } else {
            inventory.forEach((item, index) => {
                const li = document.createElement('li');
                // アイテムID (a-z) を表示
                let char = String.fromCharCode(97 + index);
                if (item._isAtFeet || item._isStairs) {
                    char = 'z';
                }

                let name = item.getDisplayName();
                let statusStr = '';

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

                let curseStr = ' ';
                if (item.cursed && item.identified) {
                    curseStr = '!';
                }

                // ステータス文字列構築: "XX Y"形式 (XX:装備, Y:呪い)
                // 例: "EL !", "E  !", "   !"
                // !の位置は常に4文字目になる
                statusStr = `${equipStr} ${curseStr}`;

                // クラス追加 (CSSで下寄せにするため)
                if (item._isAtFeet || item._isStairs) {
                    li.classList.add('at-feet-item');
                }

                // 呪われたアイテムは赤色で表示
                if (item.cursed && item.identified) {
                    li.classList.add('cursed-item');
                }

                // プラスのエンチャント値を持つアイテムは黄色で表示
                if (item.identified) {
                    let hasPositiveEnchant = false;
                    if (item.type === 'weapon' && (item.hitBonus > 0 || item.damageBonus > 0)) {
                        hasPositiveEnchant = true;
                    } else if (item.type === 'armor' && item.damageBonus > 0) {
                        hasPositiveEnchant = true;
                    } else if (item.type === 'ring' && item.enchantment > 0) {
                        hasPositiveEnchant = true;
                    }
                    if (hasPositiveEnchant) {
                        li.classList.add('enchanted-item');
                    }
                }

                // 要素構築
                // ID
                const idSpan = document.createElement('span');
                idSpan.textContent = `${char}) `;
                li.appendChild(idSpan);

                // ステータスエリア (固定幅)
                const statusSpan = document.createElement('span');
                statusSpan.classList.add('item-status');
                // ステータスがない場合でもスペースを確保するために何かしら入れるか、CSSでmin-widthを指定する
                // ここでは中身を入れる
                statusSpan.textContent = statusStr;
                li.appendChild(statusSpan);

                // 名前
                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;
                li.appendChild(nameSpan);

                this.inventoryList.appendChild(li);
            });
        }
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
        items.forEach((item, i) => {
            if (i === index) {
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
        const rightPanel = document.getElementById('right-panel');

        if (selectedItem && rightPanel) {
            // 選択中のアイテムの位置を取得
            const itemRect = selectedItem.getBoundingClientRect();
            const panelRect = rightPanel.getBoundingClientRect();

            // サブメニューをインベントリパネルの左側に配置
            // パネルの左端から70px右にずらして配置
            const submenuWidth = 200; // submenu の幅（CSS で定義されている値）
            submenu.style.left = (panelRect.left - submenuWidth + 70) + 'px';
            submenu.style.right = 'auto';

            // 選択中のアイテムと同じ高さに配置
            submenu.style.top = itemRect.top + 'px';
        } else {
            // フォールバック: 渡された座標を使用
            submenu.style.left = 'auto';
            submenu.style.right = '19rem';
            submenu.style.top = y + 'px';
        }

        submenu.classList.remove('hidden');
    }

    hideSubMenu() {
        const submenu = document.getElementById('submenu');
        if (submenu) submenu.classList.add('hidden');
    }

    updateStatus(player, floor) {
        this.statusLevel.textContent = `Level: ${floor}`;
        this.statusGold.textContent = `Gold: ${player.gold}`;
        this.statusHp.textContent = `Hp: ${player.hp}(${player.maxHp})`;
        this.statusStr.textContent = `Str: ${player.str}(${player.maxStr})`;
        this.statusArm.textContent = `Arm: ${player.armor}`;
        this.statusExp.textContent = `Exp: ${player.level}/${player.exp}`;
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

}
