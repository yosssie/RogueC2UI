// ===========================
// 入力管理
// ===========================

export class InputManager {
    constructor(game) {
        this.game = game;
        this.keyConfig = this.loadKeyConfig();
        this.rButtonPressed = false; // Rボタン(斜め移動モディファイア)の状態
        this.bButtonPressed = false; // Bボタン(ダッシュモディファイア)の状態
        this.lButtonPressed = false; // Lボタン(投げ装備)の状態
        this.pressedKeys = new Set(); // 押されているキーのセット
    }

    init() {
        console.log('🔌 InputManager init called');

        this.handleKeyboard = (e) => {
            const state = this.game ? this.game.state : 'NO GAME';

            if (state !== 'title') {
                e.stopImmediatePropagation();
            }

            if (state === 'title') {
                if (e.key === 'Escape') {
                    this.game.toggleMenu();
                    return;
                }
                this.game.handleTitleInput(e);
                return;
            }

            this.pressedKeys.add(e.code);

            // Escapeキーでメニュー開閉
            if (e.key === 'Escape') {
                if (state === 'config_binding') {
                    this.game.finishKeyBinding(false);
                    return;
                }
                if (state === 'config') {
                    this.game.closeConfig();
                } else {
                    this.game.toggleMenu();
                }
                return;
            }

            if (state === 'playing') {
                this.handleGameInput(e);
            } else if (state === 'inventory') {
                this.handleInventoryInput(e);
            } else if (state === 'menu') {
                this.handleMenuInput(e);
            } else if (state === 'config') {
                this.handleConfigInput(e);
            } else if (state === 'config_binding') {
                this.handleConfigBindingInput(e);
            } else if (state === 'identify') {
                this.handleIdentifyInput(e);
            } else if (state === 'submenu') {
                this.handleSubMenuInput(e);
            } else if (state === 'target') {
                this.handleTargetingInput(e);
            } else if (state === 'death_message') {
                this.handleDeathMessageInput(e);
            } else if (state === 'tombstone' || state === 'gameover') {
                this.game.handleGameoverInput(e);
            } else if (state === 'victory') {
                this.handleVictoryInput(e);
            } else if (state === 'selling') {
                this.handleSellingInput(e);
            } else if (state === 'ranking') {
                this.game.handleRankingInput(e);
            }
        };

        // キーボード入力
        document.addEventListener('keydown', (e) => {
            console.log('🎹 Keydown event detected in listener (key:', e.key, ')');
            this.handleKeyboard(e);
        });
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // メニュー操作 (Event Delegation)
        const menuList = document.getElementById('menu-list');
        if (menuList) {
            menuList.addEventListener('click', (e) => {
                const li = e.target.closest('li');
                if (li && li.dataset.action) {
                    this.handleMenuClick(li.dataset.action);
                }
            });
        }
    }

    getDefaultKeyConfig() {
        // デフォルト設定(SFC風)
        return {
            // 移動(8方向) - カーソルキー、テンキー
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            upLeft: 'Home',
            upRight: 'PageUp',
            downLeft: 'End',
            downRight: 'PageDown',

            // アクション(SFCコントローラー配置)
            buttonA: 'KeyZ',        // Aボタン: 決定/休息/探索
            buttonB: 'KeyX',        // Bボタン: キャンセル
            buttonX: 'KeyA',        // Xボタン: メニュー
            buttonY: 'KeyS',        // Yボタン: インベントリ整理
            buttonL: 'KeyQ',        // Lボタン: 特殊攻撃(矢)
            buttonR: 'KeyW',        // Rボタン: 斜め移動(未作成)
            select: 'Space',        // セレクト: (未定義)
            start: 'Enter'          // スタート: (未定義)
        };
    }

    loadKeyConfig() {
        const saved = localStorage.getItem('rogueKeyConfig');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.getDefaultKeyConfig();
    }

    resetKeyConfig() {
        this.keyConfig = this.getDefaultKeyConfig();
        this.saveKeyConfig();
    }

    saveKeyConfig() {
        localStorage.setItem('rogueKeyConfig', JSON.stringify(this.keyConfig));
    }

    handleKeyboard(e) {
        try {
            console.log('🛑 INPUT DEBUG: key=', e.key, 'code=', e.code, 'state=', this.game ? this.game.state : 'NULL');

            if (this.game.state !== 'title') {
                e.stopImmediatePropagation();
            }
            const state = this.game.state;

            if (state === 'title') {
                this.game.handleTitleInput(e);
                return;
            }

            this.pressedKeys.add(e.code);

            // Escapeキーでメニュー開閉
            if (e.key === 'Escape') {
                if (state === 'config_binding') {
                    this.game.finishKeyBinding(false);
                    return;
                }
                if (state === 'config') {
                    this.game.closeConfig();
                } else {
                    this.game.toggleMenu();
                }
                return;
            }

            if (state === 'playing') {
                this.handleGameInput(e);
            } else if (this.game.state === 'inventory') {
                this.handleInventoryInput(e);
            } else if (this.game.state === 'submenu') {
                this.handleSubMenuInput(e);
            } else if (this.game.state === 'targeting') {
                this.handleTargetingInput(e);
            } else if (this.game.state === 'throw_equip_aiming') {
                this.handleThrowEquipAimingInput(e);
            } else if (this.game.state === 'death_message') {
                this.handleDeathMessageInput(e);
            } else if (this.game.state === 'victory') {
                this.handleVictoryInput(e);
            } else if (this.game.state === 'selling') {
                this.handleSellingInput(e);
            } else if (this.game.state === 'identify') {
                this.handleIdentifyInput(e);
            } else if (this.game.state === 'menu') {
                this.handleMenuInput(e);
            } else if (this.game.state === 'config') {
                this.handleConfigInput(e);
            } else if (this.game.state === 'config_binding') {
                this.handleConfigBindingInput(e);
            }
        } catch (err) {
            console.error('ERROR in handleKeyboard:', err);
        }
    }

    handleConfigBindingInput(e) {
        e.stopImmediatePropagation();
        e.preventDefault();

        // Enterで確定
        if (e.key === 'Enter') {
            this.game.finishKeyBinding(true);
            return;
        }

        // 入力を一時保存してUI更新
        this.game.bindingTempCode = e.code;
        this.game.updateBindingUI();
    }

    handleDeathMessageInput(e) {
        const key = e.code;
        e.preventDefault();

        // Aボタン(Z)またはEnterで墓石画面へ
        if (key === this.keyConfig.buttonA) {
            const { monster, cause } = this.game.deathCause;
            this.game.gameOver(monster, cause);
        }
    }

    handleTargetingInput(e) {
        const key = e.code;
        e.preventDefault();

        // キャンセル (Bボタン)
        if (key === this.keyConfig.buttonB) {
            this.game.cancelTargeting();
            return;
        }
        // 決定 (Aボタン)
        if (key === this.keyConfig.buttonA) {
            this.game.confirmThrow();
            return;
        }

        // 方向移動 (同時押し対応)
        let dx = 0;
        let dy = 0;

        // pressedKeys をチェックして合成
        if (this.pressedKeys.has(this.keyConfig.up) || this.pressedKeys.has('Numpad8')) dy -= 1;
        if (this.pressedKeys.has(this.keyConfig.down) || this.pressedKeys.has('Numpad2')) dy += 1;
        if (this.pressedKeys.has(this.keyConfig.left) || this.pressedKeys.has('Numpad4')) dx -= 1;
        if (this.pressedKeys.has(this.keyConfig.right) || this.pressedKeys.has('Numpad6')) dx += 1;

        // 斜め専用キーもサポート
        if (this.pressedKeys.has(this.keyConfig.upLeft) || this.pressedKeys.has('Numpad7')) { dx = -1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.upRight) || this.pressedKeys.has('Numpad9')) { dx = 1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.downLeft) || this.pressedKeys.has('Numpad1')) { dx = -1; dy = 1; }
        if (this.pressedKeys.has(this.keyConfig.downRight) || this.pressedKeys.has('Numpad3')) { dx = 1; dy = 1; }

        if (dx !== 0 || dy !== 0) {
            // 正規化 (dx, dy は -1, 0, 1 のいずれか)
            if (dx > 0) dx = 1;
            if (dx < 0) dx = -1;
            if (dy > 0) dy = 1;
            if (dy < 0) dy = -1;

            this.game.updateTarget(dx, dy);
        }
    }

    handleThrowEquipAimingInput(e) {
        const key = e.code;
        e.preventDefault();

        // キャンセル (Bボタン)
        if (key === this.keyConfig.buttonB) {
            this.game.cancelThrowEquipAiming();
            return;
        }

        // 方向移動 (同時押し対応)
        let dx = 0;
        let dy = 0;

        // pressedKeys をチェックして合成
        if (this.pressedKeys.has(this.keyConfig.up) || this.pressedKeys.has('Numpad8')) dy -= 1;
        if (this.pressedKeys.has(this.keyConfig.down) || this.pressedKeys.has('Numpad2')) dy += 1;
        if (this.pressedKeys.has(this.keyConfig.left) || this.pressedKeys.has('Numpad4')) dx -= 1;
        if (this.pressedKeys.has(this.keyConfig.right) || this.pressedKeys.has('Numpad6')) dx += 1;

        // 斜め専用キーもサポート
        if (this.pressedKeys.has(this.keyConfig.upLeft) || this.pressedKeys.has('Numpad7')) { dx = -1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.upRight) || this.pressedKeys.has('Numpad9')) { dx = 1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.downLeft) || this.pressedKeys.has('Numpad1')) { dx = -1; dy = 1; }
        if (this.pressedKeys.has(this.keyConfig.downRight) || this.pressedKeys.has('Numpad3')) { dx = 1; dy = 1; }

        if (dx !== 0 || dy !== 0) {
            // 正規化 (dx, dy は -1, 0, 1 のいずれか)
            if (dx > 0) dx = 1;
            if (dx < 0) dx = -1;
            if (dy > 0) dy = 1;
            if (dy < 0) dy = -1;

            this.game.updateThrowEquipTarget(dx, dy);
        }
    }

    handleKeyUp(e) {
        this.pressedKeys.delete(e.code);

        // Rボタンが離されたらフラグをリセット
        if (e.code === this.keyConfig.buttonR) {
            this.rButtonPressed = false;
        }
        // Bボタンが離されたらフラグをリセット
        if (e.code === this.keyConfig.buttonB) {
            this.bButtonPressed = false;
        }
        // Lボタンが離されたら投擲実行
        if (e.code === this.keyConfig.buttonL) {
            if (this.lButtonPressed && this.game.state === 'throw_equip_aiming') {
                this.game.executeThrowEquip();
            }
            this.lButtonPressed = false;
        }
    }

    handleGameInput(e) {
        const key = e.code;
        let action = null;

        // Rボタン(W)が押されているかチェック(斜め移動モディファイア)
        const isDiagonalMode = e.shiftKey || this.rButtonPressed;
        // Bボタン(X)が押されているかチェック(ダッシュモディファイア)
        const isDashMode = this.bButtonPressed;

        // デバッグ: 階層移動
        if (this.game.inGameDebugMode && (key === 'Comma' || e.key === ',')) {
            action = { type: 'debug_ascend' };
        } else if (this.game.inGameDebugMode && (key === 'Period' || e.key === '.')) {
            action = { type: 'debug_descend' };
        }
        // 移動(十字キー + Home/End/PageUp/PageDown + テンキー)
        else if (key === this.keyConfig.up || key === 'Numpad8') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 0, dy: -1 };
        } else if (key === this.keyConfig.down || key === 'Numpad2') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 0, dy: 1 };
        } else if (key === this.keyConfig.left || key === 'Numpad4') {
            action = { type: isDashMode ? 'dash' : 'move', dx: -1, dy: 0 };
        } else if (key === this.keyConfig.right || key === 'Numpad6') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 1, dy: 0 };
        } else if (key === this.keyConfig.upLeft || key === 'Numpad7') {
            action = { type: isDashMode ? 'dash' : 'move', dx: -1, dy: -1 };
        } else if (key === this.keyConfig.upRight || key === 'Numpad9') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 1, dy: -1 };
        } else if (key === this.keyConfig.downLeft || key === 'Numpad1') {
            action = { type: isDashMode ? 'dash' : 'move', dx: -1, dy: 1 };
        } else if (key === this.keyConfig.downRight || key === 'Numpad3') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 1, dy: 1 };
        } else if (key === 'Numpad5') {
            action = { type: 'rest' }; // テンキー5は休憩(足踏み)
        }
        // Bボタン(X): ダッシュモディファイア(単体では何もしない)
        else if (key === this.keyConfig.buttonB) {
            this.bButtonPressed = true;
            return; // アクションは発生させない
        }
        // Xボタン(A): メニューを開く
        else if (key === this.keyConfig.buttonX) {
            action = { type: 'menu' };
        }
        // Yボタン(S): インベントリ表示/整列
        else if (key === this.keyConfig.buttonY) {
            action = { type: 'inventory' };
        }

        // Rボタン(W): 斜め移動モディファイア(単体では何もしない)
        else if (key === this.keyConfig.buttonR) {
            this.rButtonPressed = true;
            return; // アクションは発生させない
        }
        // Lボタン(Q): 投げ装備照準モード開始
        else if (key === this.keyConfig.buttonL && !this.lButtonPressed) {
            this.lButtonPressed = true;
            if (this.game.player.throwEquip) {
                this.game.startThrowEquipAiming();
            } else {
                this.game.display.showMessage('投げ装備が設定されていません。');
            }
            return;
        }
        // Aボタン(Z): 休憩 + 探索 (ゲームパッド用統合アクション)
        else if (key === this.keyConfig.buttonA) {
            action = { type: 'rest_and_search' };
        }
        // . キー: 休憩のみ (move.c rest())
        else if (key === 'Period') {
            action = { type: 'rest' };
        }
        // s キー: 探索のみ (trap.c search())
        else if (key === 'KeyS') {
            action = { type: 'search' };
        }
        // デバッグ(KeyD)
        else if (key === 'KeyD') {
            action = { type: 'debug' };
        }
        // 数字キー(アイテム使用)
        else if (key.match(/^Digit[1-9]$/)) {
            const index = parseInt(key.replace('Digit', '')) - 1;
            action = { type: 'use', index: index };
        }

        if (action) {
            e.preventDefault();
            this.game.handlePlayerAction(action);
        }
    }

    handleInventoryInput(e) {
        e.preventDefault();

        if (e.code === this.keyConfig.buttonB) {
            this.game.closeInventory();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveInventoryCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveInventoryCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA) {
            this.game.selectInventoryItem();
        }

        // ソート (Yボタン)
        else if (e.code === this.keyConfig.buttonY) {
            this.game.sortInventory();
        }
    }

    handleIdentifyInput(e) {
        e.preventDefault();

        if (e.code === this.keyConfig.buttonB) {
            this.game.cancelIdentify();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveIdentifyCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveIdentifyCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA) {
            this.game.confirmIdentifyItem();
        }
    }

    handleSubMenuInput(e) {
        e.preventDefault();

        if (e.code === this.keyConfig.buttonB) {
            this.game.closeSubMenu();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveSubMenuCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveSubMenuCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA) {
            this.game.selectSubMenuOption();
        }
    }

    handleMenuClick(action) {
        this.game.executeMenuAction(action);
    }

    handleMenuInput(e) {
        e.preventDefault();

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveMenuCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveMenuCursor(1);
        }

        // メニュー画面でのみEnterキーを許可
        else if (e.code === this.keyConfig.buttonA || e.key === 'Enter') {
            this.game.selectMenuOption();
        }
    }

    loadKeyConfig() {
        const saved = localStorage.getItem('rogueKeyConfig');
        if (saved) {
            return JSON.parse(saved);
        }

        // デフォルト設定(SFC風)
        return {
            // 移動(8方向) - カーソルキー、テンキー
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            upLeft: 'Home',
            upRight: 'PageUp',
            downLeft: 'End',
            downRight: 'PageDown',

            // アクション(SFCコントローラー配置)
            buttonA: 'KeyZ',        // Aボタン: 決定/休息/探索
            buttonB: 'KeyX',        // Bボタン: キャンセル
            buttonX: 'KeyA',        // Xボタン: メニュー
            buttonY: 'KeyS',        // Yボタン: インベントリ整理
            buttonL: 'KeyQ',        // Lボタン: 特殊攻撃(矢)
            buttonR: 'KeyW',        // Rボタン: 斜め移動(未作成)
            select: 'Space',        // セレクト: (未定義)
            start: 'Enter'          // スタート: (未定義)
        };
    }

    saveKeyConfig() {
        localStorage.setItem('rogueKeyConfig', JSON.stringify(this.keyConfig));
    }

    handleKeyboard(e) {
        this.pressedKeys.add(e.code);

        // Escapeキーでメニュー開閉
        if (e.key === 'Escape') {
            this.game.toggleMenu();
            return;
        }

        if (this.game.state === 'playing') {
            this.handleGameInput(e);
        } else if (this.game.state === 'inventory') {
            this.handleInventoryInput(e);
        } else if (this.game.state === 'submenu') {
            this.handleSubMenuInput(e);
        } else if (this.game.state === 'targeting') {
            this.handleTargetingInput(e);
        } else if (this.game.state === 'throw_equip_aiming') {
            this.handleThrowEquipAimingInput(e);
        } else if (this.game.state === 'death_message') {
            this.handleDeathMessageInput(e);
        } else if (this.game.state === 'victory') {
            this.handleVictoryInput(e);
        } else if (this.game.state === 'selling') {
            this.handleSellingInput(e);
        } else if (this.game.state === 'identify') {
            this.handleIdentifyInput(e);
        } else if (this.game.state === 'menu') {
            this.handleMenuInput(e);
        } else if (this.game.state === 'config') {
            this.handleConfigInput(e);
        }
    }

    handleDeathMessageInput(e) {
        const key = e.code;
        e.preventDefault();

        // Aボタン(Z)またはEnterで墓石画面へ
        if (key === this.keyConfig.buttonA) {
            const { monster, cause } = this.game.deathCause;
            this.game.gameOver(monster, cause);
        }
    }

    handleTargetingInput(e) {
        const key = e.code;
        e.preventDefault();

        // キャンセル (Bボタン)
        if (key === this.keyConfig.buttonB) {
            this.game.cancelTargeting();
            return;
        }
        // 決定 (Aボタン)
        if (key === this.keyConfig.buttonA) {
            this.game.confirmThrow();
            return;
        }

        // 方向移動 (同時押し対応)
        let dx = 0;
        let dy = 0;

        // pressedKeys をチェックして合成
        if (this.pressedKeys.has(this.keyConfig.up) || this.pressedKeys.has('Numpad8')) dy -= 1;
        if (this.pressedKeys.has(this.keyConfig.down) || this.pressedKeys.has('Numpad2')) dy += 1;
        if (this.pressedKeys.has(this.keyConfig.left) || this.pressedKeys.has('Numpad4')) dx -= 1;
        if (this.pressedKeys.has(this.keyConfig.right) || this.pressedKeys.has('Numpad6')) dx += 1;

        // 斜め専用キーもサポート
        if (this.pressedKeys.has(this.keyConfig.upLeft) || this.pressedKeys.has('Numpad7')) { dx = -1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.upRight) || this.pressedKeys.has('Numpad9')) { dx = 1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.downLeft) || this.pressedKeys.has('Numpad1')) { dx = -1; dy = 1; }
        if (this.pressedKeys.has(this.keyConfig.downRight) || this.pressedKeys.has('Numpad3')) { dx = 1; dy = 1; }

        if (dx !== 0 || dy !== 0) {
            // 正規化 (dx, dy は -1, 0, 1 のいずれか)
            if (dx > 0) dx = 1;
            if (dx < 0) dx = -1;
            if (dy > 0) dy = 1;
            if (dy < 0) dy = -1;

            this.game.updateTarget(dx, dy);
        }
    }

    handleThrowEquipAimingInput(e) {
        const key = e.code;
        e.preventDefault();

        // キャンセル (Bボタン)
        if (key === this.keyConfig.buttonB) {
            this.game.cancelThrowEquipAiming();
            return;
        }

        // 方向移動 (同時押し対応)
        let dx = 0;
        let dy = 0;

        // pressedKeys をチェックして合成
        if (this.pressedKeys.has(this.keyConfig.up) || this.pressedKeys.has('Numpad8')) dy -= 1;
        if (this.pressedKeys.has(this.keyConfig.down) || this.pressedKeys.has('Numpad2')) dy += 1;
        if (this.pressedKeys.has(this.keyConfig.left) || this.pressedKeys.has('Numpad4')) dx -= 1;
        if (this.pressedKeys.has(this.keyConfig.right) || this.pressedKeys.has('Numpad6')) dx += 1;

        // 斜め専用キーもサポート
        if (this.pressedKeys.has(this.keyConfig.upLeft) || this.pressedKeys.has('Numpad7')) { dx = -1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.upRight) || this.pressedKeys.has('Numpad9')) { dx = 1; dy = -1; }
        if (this.pressedKeys.has(this.keyConfig.downLeft) || this.pressedKeys.has('Numpad1')) { dx = -1; dy = 1; }
        if (this.pressedKeys.has(this.keyConfig.downRight) || this.pressedKeys.has('Numpad3')) { dx = 1; dy = 1; }

        if (dx !== 0 || dy !== 0) {
            // 正規化 (dx, dy は -1, 0, 1 のいずれか)
            if (dx > 0) dx = 1;
            if (dx < 0) dx = -1;
            if (dy > 0) dy = 1;
            if (dy < 0) dy = -1;

            this.game.updateThrowEquipTarget(dx, dy);
        }
    }

    handleKeyUp(e) {
        this.pressedKeys.delete(e.code);

        // Rボタンが離されたらフラグをリセット
        if (e.code === this.keyConfig.buttonR) {
            this.rButtonPressed = false;
        }
        // Bボタンが離されたらフラグをリセット
        if (e.code === this.keyConfig.buttonB) {
            this.bButtonPressed = false;
        }
        // Lボタンが離されたら投擲実行
        if (e.code === this.keyConfig.buttonL) {
            if (this.lButtonPressed && this.game.state === 'throw_equip_aiming') {
                this.game.executeThrowEquip();
            }
            this.lButtonPressed = false;
        }
    }

    handleGameInput(e) {
        const key = e.code;
        let action = null;

        // Rボタン(W)が押されているかチェック(斜め移動モディファイア)
        const isDiagonalMode = e.shiftKey || this.rButtonPressed;
        // Bボタン(X)が押されているかチェック(ダッシュモディファイア)
        const isDashMode = this.bButtonPressed;

        // デバッグ: 階層移動
        if (this.game.inGameDebugMode && (key === 'Comma' || e.key === ',')) {
            action = { type: 'debug_ascend' };
        } else if (this.game.inGameDebugMode && (key === 'Period' || e.key === '.')) {
            action = { type: 'debug_descend' };
        } else if (this.game.inGameDebugMode && (key === 'Slash' || e.key === '/')) {
            action = { type: 'debug_levelup' };
        }
        // 移動(十字キー + Home/End/PageUp/PageDown + テンキー)
        else if (key === this.keyConfig.up || key === 'Numpad8') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 0, dy: -1 };
        } else if (key === this.keyConfig.down || key === 'Numpad2') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 0, dy: 1 };
        } else if (key === this.keyConfig.left || key === 'Numpad4') {
            action = { type: isDashMode ? 'dash' : 'move', dx: -1, dy: 0 };
        } else if (key === this.keyConfig.right || key === 'Numpad6') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 1, dy: 0 };
        } else if (key === this.keyConfig.upLeft || key === 'Numpad7') {
            action = { type: isDashMode ? 'dash' : 'move', dx: -1, dy: -1 };
        } else if (key === this.keyConfig.upRight || key === 'Numpad9') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 1, dy: -1 };
        } else if (key === this.keyConfig.downLeft || key === 'Numpad1') {
            action = { type: isDashMode ? 'dash' : 'move', dx: -1, dy: 1 };
        } else if (key === this.keyConfig.downRight || key === 'Numpad3') {
            action = { type: isDashMode ? 'dash' : 'move', dx: 1, dy: 1 };
        } else if (key === 'Numpad5') {
            action = { type: 'rest' }; // テンキー5は休憩(足踏み)
        }
        // Bボタン(X): ダッシュモディファイア(単体では何もしない)
        else if (key === this.keyConfig.buttonB) {
            this.bButtonPressed = true;
            return; // アクションは発生させない
        }
        // Xボタン(A): メニューを開く
        else if (key === this.keyConfig.buttonX) {
            action = { type: 'menu' };
        }
        // Yボタン(S): インベントリ表示/整列
        else if (key === this.keyConfig.buttonY) {
            action = { type: 'inventory' };
        }

        // Rボタン(W): 斜め移動モディファイア(単体では何もしない)
        else if (key === this.keyConfig.buttonR) {
            this.rButtonPressed = true;
            return; // アクションは発生させない
        }
        // Lボタン(Q): 投げ装備照準モード開始
        else if (key === this.keyConfig.buttonL && !this.lButtonPressed) {
            this.lButtonPressed = true;
            if (this.game.player.throwEquip) {
                this.game.startThrowEquipAiming();
            } else {
                this.game.display.showMessage('投げ装備が設定されていません。');
            }
            return;
        }
        // Aボタン(Z): 休憩 + 探索 (ゲームパッド用統合アクション)
        else if (key === this.keyConfig.buttonA) {
            action = { type: 'rest_and_search' };
        }
        // . キー: 休憩のみ (move.c rest())
        else if (key === 'Period') {
            action = { type: 'rest' };
        }
        // s キー: 探索のみ (trap.c search())
        else if (key === 'KeyS') {
            action = { type: 'search' };
        }
        // デバッグ(KeyD)
        else if (key === 'KeyD') {
            action = { type: 'debug' };
        }
        // 数字キー(アイテム使用)
        else if (key.match(/^Digit[1-9]$/)) {
            const index = parseInt(key.replace('Digit', '')) - 1;
            action = { type: 'use', index: index };
        }

        if (action) {
            e.preventDefault();
            this.game.handlePlayerAction(action);
        }
    }

    handleInventoryInput(e) {
        e.preventDefault();

        if (e.code === this.keyConfig.buttonB) {
            this.game.closeInventory();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveInventoryCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveInventoryCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA) {
            this.game.selectInventoryItem();
        }

        // ソート (Yボタン)
        else if (e.code === this.keyConfig.buttonY) {
            this.game.sortInventory();
        }
    }

    handleIdentifyInput(e) {
        e.preventDefault();

        if (e.code === this.keyConfig.buttonB) {
            this.game.cancelIdentify();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveIdentifyCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveIdentifyCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA) {
            this.game.confirmIdentifyItem();
        }
    }

    handleSubMenuInput(e) {
        e.preventDefault();

        if (e.code === this.keyConfig.buttonB) {
            this.game.closeSubMenu();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveSubMenuCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveSubMenuCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA) {
            this.game.selectSubMenuOption();
        }
    }

    handleMenuClick(action) {
        this.game.executeMenuAction(action);
    }

    handleMenuInput(e) {

        e.preventDefault();

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveMenuCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveMenuCursor(1);
        }

        // メニュー画面でのみEnterキーを許可
        else if (e.code === this.keyConfig.buttonA || e.key === 'Enter') {
            this.game.selectMenuOption();
        }
    }

    handleConfigInput(e) {
        e.preventDefault();

        // カーソル移動
        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveConfigCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveConfigCursor(1);
        }

        // 決定
        else if (e.key === 'Enter' || e.code === this.keyConfig.buttonA) {
            this.game.selectConfigOption();
        }
    }


    handleVictoryInput(e) {
        e.preventDefault();
        // AボタンまたはEnterで次へ
        if (e.code === this.keyConfig.buttonA) {
            this.game.showSellingScreen();
        }
    }

    handleSellingInput(e) {
        e.preventDefault();
        if (e.code === this.keyConfig.buttonA) {
            this.game.finishGame();
        }
    }
}
