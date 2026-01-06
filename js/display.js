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
                return `${m.symbol}: HP${m.hp}/${m.maxHp} ${flags}`;
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
        // 既存のメッセージアイテムを取得
        const items = Array.from(this.messageLog.children);

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
                const char = String.fromCharCode(97 + index);
                let name = item.getDisplayName();

                // 装備マーク (playerが渡された場合)
                if (player) {
                    if (player.weapon === item || player.equippedArmor === item) {
                        name += ' (E)';
                    } else if (player.leftRing === item) {
                        name += ' (EL)';
                    } else if (player.rightRing === item) {
                        name += ' (ER)';
                    }
                }

                li.textContent = `${char}) ${name}`;
                this.inventoryList.appendChild(li);
            });
        }
    }

    renderDungeon(level, player, monsters, items, targetInfo = null, trapManager = null, debugMode = false) {
        const width = level.width;
        const height = level.height;
        let output = '';

        // 全体を常に描画 (範囲制限ロジックを削除)
        // 拡大時の表示位置合わせはスクロール制御(updateCamera)で行う

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let char = ' ';
                let cssClass = '';

                // ターゲットカーソル
                let isTarget = (targetInfo && targetInfo.x === x && targetInfo.y === y);

                // 視界チェック: 訪れた場所のみ表示
                if (!level.isVisible(x, y)) {
                    output += ' ';
                    continue;
                }

                // プレイヤー
                if (player.x === x && player.y === y) {
                    char = '@';
                    cssClass = 'player';
                }
                // モンスター(デバッグモード時は全表示、通常時はプレイヤーの視界内のみ)
                else if ((debugMode || this.isInPlayerSight(x, y, player, level)) && monsters.some(m => {
                    if (m.x !== x || m.y !== y) return false;
                    // 透明チェック (INVISIBLE=0x4)
                    // hasFlagがない場合（古いオブジェクト）は常に見える
                    if (m.hasFlag && m.hasFlag(4)) {
                        return player.canSeeInvisible(); // メソッド呼び出しに変更
                    }
                    return true;
                })) {
                    const monster = monsters.find(m => m.x === x && m.y === y);
                    char = monster.symbol || monster.type || '?';
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
                    char = item.symbol;
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
        // 1. 隣接セルは常に見える
        const dx = Math.abs(x - player.x);
        const dy = Math.abs(y - player.y);
        if (dx <= 1 && dy <= 1) return true;

        // 2. 同じ部屋にいるなら見える (暗い部屋の実装はまだないので簡易的に部屋なら見える)
        if (level && level.rooms) {
            const playerRoom = level.rooms.find(r =>
                player.x >= r.x && player.x < r.x + r.w &&
                player.y >= r.y && player.y < r.y + r.h
            );

            // デバッグ: 最初の呼び出しでログ出力
            if (x === player.x && y === player.y - 2 && this._debugOnce !== true) {
                console.log('🔍 Room Debug:', {
                    playerPos: `(${player.x}, ${player.y})`,
                    playerRoom: playerRoom ? `Room at (${playerRoom.x}, ${playerRoom.y}) size ${playerRoom.w}x${playerRoom.h}` : 'NOT IN ROOM',
                    totalRooms: level.rooms.length
                });
                this._debugOnce = true;
            }

            if (playerRoom) {
                // ターゲット(x, y)も同じ部屋か？
                if (x >= playerRoom.x && x < playerRoom.x + playerRoom.w &&
                    y >= playerRoom.y && y < playerRoom.y + playerRoom.h) {
                    return true;
                }
            }
        }
        return false;
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
}
