// ===========================
// デバッグ用ダンジョン
// ===========================

export class DebugLevel {
    constructor(width, height) {
        this.width = 80;
        this.height = 30;
        this.tiles = [];
        this.rooms = [];
        this.visited = [];
    }

    generate() {
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            this.visited[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = ' ';
                this.visited[y][x] = false;
            }
        }

        // 1. 上部エリア: アイテム＆罠の巨大倉庫
        // (2, 1) 幅76, 高さ5 -> 内部幅74, 内部高さ3
        this.createFixedRoom(2, 1, 76, 5, 'storage');

        // 階段
        this.tiles[2][3] = '%';

        // 2. モンスター実験場 (下部エリア)
        // 9列 x 3行
        const startX = 2;
        const startY = 7;
        const roomW = 5;
        const roomH = 5;
        const gap = 1;

        const cols = 9;
        const rows = 3;
        const monsterTypes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let mIndex = 0;

        // 通路網
        for (let r = 0; r <= rows; r++) {
            const py = startY + r * (roomH + gap) - 1;
            if (py >= 0 && py < this.height) {
                this.drawPassage(startX - 1, py, startX + cols * (roomW + gap), py);
            }
        }
        for (let c = 0; c <= cols; c++) {
            const px = startX + c * (roomW + gap) - 1;
            if (px >= 0 && px < this.width) {
                this.drawPassage(px, startY - 1, px, startY + rows * (roomH + gap));
            }
        }

        // 接続通路 (倉庫中央下 -> 実験場中央上)
        // 倉庫中央: x=40
        this.tiles[5][40] = '+'; // 倉庫出口
        this.drawPassage(40, 6, 40, startY - 1);

        // モンスター個室
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (mIndex >= monsterTypes.length) break;

                const type = monsterTypes[mIndex];
                const rx = startX + c * (roomW + gap);
                const ry = startY + r * (roomH + gap);

                this.createFixedRoom(rx, ry, roomW, roomH, `monster_${type}`);

                if (ry > 0) this.tiles[ry][rx + 2] = '+';
                if (ry + 4 < this.height) this.tiles[ry + 4][rx + 2] = '+';
                if (rx > 0) this.tiles[ry + 2][rx] = '+';
                if (rx + 4 < this.width) this.tiles[ry + 2][rx + 4] = '+';

                mIndex++;
            }
        }
    }

    createFixedRoom(x, y, width, height, id) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const px = x + dx;
                const py = y + dy;
                if (py < 0 || py >= this.height || px < 0 || px >= this.width) continue;

                if (dy === 0 || dy === height - 1) {
                    this.tiles[py][px] = '-';
                } else if (dx === 0 || dx === width - 1) {
                    this.tiles[py][px] = '|';
                } else {
                    this.tiles[py][px] = '.';
                }
            }
        }
        this.rooms.push({ x, y, w: width, h: height, id });
    }

    drawPassage(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        if (minY === maxY) {
            for (let x = minX; x <= maxX; x++) {
                if (this.isInBounds(x, minY)) {
                    const t = this.tiles[minY][x];
                    if (t === ' ' || t === '#') this.tiles[minY][x] = '#';
                }
            }
        } else if (minX === maxX) {
            for (let y = minY; y <= maxY; y++) {
                if (this.isInBounds(minX, y)) {
                    const t = this.tiles[y][minX];
                    if (t === ' ' || t === '#') this.tiles[y][minX] = '#';
                }
            }
        }
    }

    getTile(x, y) {
        if (!this.isInBounds(x, y)) return ' ';
        return this.tiles[y][x];
    }
    isInBounds(x, y) { return x >= 0 && x < this.width && y >= 0 && y < this.height; }
    isWalkable(x, y) {
        if (!this.isInBounds(x, y)) return false;
        const tile = this.tiles[y][x];
        return tile === '.' || tile === '#' || tile === '+' || tile === '%';
    }
    updateVisibility(playerX, playerY) {
        const room = this.getRoomAt(playerX, playerY);
        const tile = this.getTile(playerX, playerY);
        if (room) {
            this.lightUpRoom(room);
            if (tile === '+') this.lightPassage(playerX, playerY);
        } else {
            this.lightPassage(playerX, playerY);
        }
    }
    getRoomAt(x, y) {
        for (const room of this.rooms) {
            if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) return room;
        }
        return null;
    }
    lightUpRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                if (this.isInBounds(x, y)) this.visited[y][x] = true;
            }
        }
    }
    lightPassage(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.isInBounds(nx, ny)) this.visited[ny][nx] = true;
            }
        }
    }
    isVisible(x, y) { return this.visited[y][x]; }
}
