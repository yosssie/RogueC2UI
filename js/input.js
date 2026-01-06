// ===========================
// 入力管理
// ===========================

export class InputManager {
    constructor(game) {
        this.game = game;
        this.keyConfig = this.loadKeyConfig();
        this.rButtonPressed = false; // Rボタン(斜め移動モディファイア)の状態
        this.bButtonPressed = false; // Bボタン(ダッシュモディファイア)の状態
        this.pressedKeys = new Set(); // 押されているキーのセット
    }

    init() {
        // キーボード入力
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // メニュー操作
        document.querySelectorAll('#menu-list li').forEach(item => {
            item.addEventListener('click', () => this.handleMenuClick(item.dataset.action));
        });
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

        if (this.game.state === 'playing') {
            this.handleGameInput(e);
        } else if (this.game.state === 'inventory') {
            this.handleInventoryInput(e);
        } else if (this.game.state === 'submenu') {
            this.handleSubMenuInput(e);
        } else if (this.game.state === 'targeting') {
            this.handleTargetingInput(e);
        } else if (this.game.state === 'death_message') {
            this.handleDeathMessageInput(e);
        }
    }

    handleDeathMessageInput(e) {
        const key = e.code;
        e.preventDefault();

        // Aボタン(Z)またはEnterで墓石画面へ
        if (key === this.keyConfig.buttonA || key === 'Enter') {
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
        if (key === this.keyConfig.buttonA || key === 'Enter') {
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
    }

    handleGameInput(e) {
        const key = e.code;
        let action = null;

        // Rボタン(W)が押されているかチェック(斜め移動モディファイア)
        const isDiagonalMode = e.shiftKey || this.rButtonPressed;
        // Bボタン(X)が押されているかチェック(ダッシュモディファイア)
        const isDashMode = this.bButtonPressed;

        // 移動(十字キー + Home/End/PageUp/PageDown + テンキー)
        if (key === this.keyConfig.up || key === 'Numpad8') {
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

        if (e.code === this.keyConfig.buttonB || e.key === 'Escape') {
            this.game.closeInventory();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveInventoryCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveInventoryCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA || e.key === 'Enter') {
            this.game.selectInventoryItem();
        }

        // ソート (Yボタン)
        else if (e.code === this.keyConfig.buttonY) {
            this.game.sortInventory();
        }
    }

    handleSubMenuInput(e) {
        e.preventDefault();

        if (e.code === this.keyConfig.buttonB || e.key === 'Escape') {
            this.game.closeSubMenu();
            return;
        }

        if (e.key === 'ArrowUp' || e.code === 'Numpad8') {
            this.game.moveSubMenuCursor(-1);
        } else if (e.key === 'ArrowDown' || e.code === 'Numpad2') {
            this.game.moveSubMenuCursor(1);
        }

        else if (e.code === this.keyConfig.buttonA || e.key === 'Enter') {
            this.game.selectSubMenuOption();
        }
    }

    handleMenuClick(action) {
        switch (action) {
            case 'resume':
                this.game.closeMenu();
                break;
            case 'inventory':
                this.game.showInventory();
                this.game.closeMenu();
                break;
            case 'config':
                this.game.display.showScreen('config');
                this.game.state = 'config';
                break;
            case 'help':
                alert('ヘルプ機能は実装中です');
                break;
            case 'save':
                this.game.saveManager.save(this.game);
                alert('セーブしました');
                this.game.closeMenu();
                break;
            case 'quit':
                if (confirm('ゲームを終了しますか?')) {
                    this.game.display.showScreen('title');
                    this.game.state = 'title';
                    this.game.waitForStart();
                }
                break;
        }
    }
}
