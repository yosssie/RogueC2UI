// ===========================
// セーブ/ロード管理
// ===========================

export class SaveManager {
    constructor() {
        this.saveKey = 'rogueSaveData';
    }

    // セーブ機能はユーザー要望により未実装（中断セーブ不要方針）
    save(game) {
        console.log('Save functionality is disabled.');
        return false;
    }

    load() {
        return null;
    }

    hasSaveData() {
        return false;
    }

    deleteSave() {
        // localStorage.removeItem(this.saveKey);
    }

    restoreGame(game, saveData) {
        // 何もしない
    }
}
