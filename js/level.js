// ===========================
// ダンジョン生成 (Original Rogue Level Generation Port)
// ===========================

const MAXROOMS = 9;
const MIN_ROW = 1; // メッセージライン用
// グリッド定数は画面サイズに合わせて動的に計算するが、
// オリジナルは固定値を持っているのでそれを模倣する。
// 80x22 の画面を想定

/*
 部屋IDの配置:
 0 1 2
 3 4 5
 6 7 8
*/

// 定数
const R_NOTHING = 0;
const R_ROOM = 1;
const R_MAZE = 2;
const R_DEADEND = 4;
const R_CROSS = 8;

const NO_ROOM = -1;

const UPWARD = 0;
const RIGHT = 1;
const DOWN = 2;
const LEFT = 3;

export class Level {
    constructor(width, height, floor) {
        this.width = width;
        this.height = height;
        this.floor = floor;
        this.tiles = [];
        this.visited = [];
        this.hiddenObjects = []; // 隠しドア・罠用
        this.rooms = []; // 部屋データ

        // グリッド境界 (make_room参照)
        this.COL1 = Math.floor(width / 3);
        this.COL2 = 2 * this.COL1;
        this.ROW1 = Math.floor(height / 3);
        this.ROW2 = 2 * this.ROW1;
    }

    // 隠しオブジェクト定数
    static HIDDEN_DOOR = 1;
    static TRAP = 2; // (予約)

    generate() {
        // マップ初期化
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            this.visited[y] = [];
            this.hiddenObjects[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = ' ';
                this.visited[y][x] = false;
                this.hiddenObjects[y][x] = null;
            }
        }

        // 部屋配列の初期化
        this.rooms = [];
        for (let i = 0; i < MAXROOMS; i++) {
            this.rooms[i] = {
                id: i,
                is_room: R_NOTHING,
                top_row: 0, bottom_row: 0,
                left_col: 0, right_col: 0,
                doors: [
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 }, // UP
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 }, // RIGHT
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 }, // DOWN
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 }  // LEFT
                ],
                // JS版での便宜用プロパティ (互換性維持)
                x: 0, y: 0, w: 0, h: 0,
                visited: false // is_all_connected用
            };
        }

        // --- make_level (level.c) のロジック ---

        // 最低限存在する部屋を決定
        let must_exist1 = Math.floor(Math.random() * 3); // 0, 1, 2
        let must_exist2, must_exist3;
        const vertical = Math.random() < 0.5;

        if (vertical) {
            must_exist2 = must_exist1 + 3;
            must_exist3 = must_exist2 + 3;
        } else {
            // オリジナルの式を再現
            must_exist1 *= 3; // 0, 3, 6 に補正
            must_exist2 = must_exist1 + 1;
            must_exist3 = must_exist2 + 1;
        }
        // 注意: オリジナルの式 (must_exist1 *= 3) + 1 で横並びにするロジックを再現
        //  vertical: 0->3->6 (縦一列確定)
        // !vertical: 0->1->2 (横一列確定)

        // 大部屋 (BIG_ROOM) は今回は省略 (実装が複雑になるため)

        // 部屋生成
        for (let i = 0; i < MAXROOMS; i++) {
            this.make_room(i, must_exist1, must_exist2, must_exist3);
        }

        // 接続処理 (mix_random_rooms省略、単純なランダム順で)
        const random_rooms = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);


        for (let j = 0; j < MAXROOMS; j++) {
            const i = random_rooms[j];

            // 基本接続: 右隣(i+1)
            // 0,1, 3,4, 6,7 のみ右と接続可能 (列の最後 2,5,8 は右がない)
            if ((i % 3) !== 2) {
                this.connect_rooms(i, i + 1);
            }

            // 基本接続: 下(i+3)
            // 0,1,2, 3,4,5 のみ下と接続可能 (行の最後 6,7,8 は下がない)
            if (i < 6) {
                this.connect_rooms(i, i + 3);
            }

            // 交差接続: i+2 (横2つ飛ばし) => 0-2, 3-5, 6-8
            // オリジナル通り: 間の部屋(i+1)が無い場合に接続
            if ((i % 3) === 0) {
                if (this.rooms[i + 1].is_room & R_NOTHING) {
                    if (this.connect_rooms(i, i + 2)) {
                        this.rooms[i + 1].is_room = R_CROSS;
                    }
                }
            }

            // 交差接続: i+6 (縦2つ飛ばし) => 0-6, 1-7, 2-8
            if (i < 3) {
                if (this.rooms[i + 3].is_room & R_NOTHING) {
                    if (this.connect_rooms(i, i + 6)) {
                        this.rooms[i + 3].is_room = R_CROSS;
                    }
                }
            }

            if (this.is_all_connected()) {
                break;
            }
        }

        // 5. 階段配置
        this.placeStairs();
    }

    make_room(rn, r1, r2, r3) {
        // level.c make_room
        let left_col, right_col, top_row, bottom_row;
        let width, height;
        let row_offset, col_offset;

        // グリッド範囲決定
        switch (rn % 3) {
            case 0: left_col = 0; right_col = this.COL1 - 1; break;
            case 1: left_col = this.COL1 + 1; right_col = this.COL2 - 1; break;
            case 2: left_col = this.COL2 + 1; right_col = this.width - 2; break; // 右端余白
        }
        switch (Math.floor(rn / 3)) {
            case 0: top_row = MIN_ROW; bottom_row = this.ROW1 - 1; break;
            case 1: top_row = this.ROW1 + 1; bottom_row = this.ROW2 - 1; break;
            case 2: top_row = this.ROW2 + 1; bottom_row = this.height - 2; break; // 下端余白
        }

        // ランダムサイズ決定
        height = 4 + Math.floor(Math.random() * (bottom_row - top_row + 1 - 4));
        width = 7 + Math.floor(Math.random() * (right_col - left_col - 2 - 7));

        // オフセット決定
        row_offset = Math.floor(Math.random() * (bottom_row - top_row - height + 1));
        col_offset = Math.floor(Math.random() * (right_col - left_col - width + 1));

        top_row += row_offset;
        bottom_row = top_row + height - 1;
        left_col += col_offset;
        right_col = left_col + width - 1;

        // 部屋を作るかどうかの判定 (必須部屋以外は40%で生成されない)
        if (rn !== r1 && rn !== r2 && rn !== r3 && Math.random() < 0.4) {
            // 部屋なし (R_NOTHING)
            this.rooms[rn].is_room = R_NOTHING;
            this.rooms[rn].top_row = top_row;
            this.rooms[rn].bottom_row = bottom_row;
            this.rooms[rn].left_col = left_col;
            this.rooms[rn].right_col = right_col;
            return;
        }

        this.rooms[rn].is_room = R_ROOM;
        this.rooms[rn].top_row = top_row;
        this.rooms[rn].bottom_row = bottom_row;
        this.rooms[rn].left_col = left_col;
        this.rooms[rn].right_col = right_col;

        // JS互換プロパティ設定
        this.rooms[rn].x = left_col;
        this.rooms[rn].y = top_row;
        this.rooms[rn].w = width;
        this.rooms[rn].h = height;

        // 描画
        for (let y = top_row; y <= bottom_row; y++) {
            for (let x = left_col; x <= right_col; x++) {
                if (y === top_row || y === bottom_row) {
                    this.tiles[y][x] = '-';
                } else if (x === left_col || x === right_col) {
                    this.tiles[y][x] = '|';
                } else {
                    this.tiles[y][x] = '.';
                }
            }
        }
    }

    connect_rooms(room1, room2) {
        // level.c connect_rooms
        // 部屋がない場合は通路(R_CROSS)にする (init.c connect)
        if (!(this.rooms[room1].is_room & (R_ROOM | R_MAZE))) {
            this.rooms[room1].is_room = R_CROSS;
        }
        if (!(this.rooms[room2].is_room & (R_ROOM | R_MAZE))) {
            this.rooms[room2].is_room = R_CROSS;
        }

        // R_NOTHING チェック削除（上でR_CROSSにするので不要）
        if (!(this.rooms[room1].is_room & (R_ROOM | R_MAZE | R_CROSS)) ||
            !(this.rooms[room2].is_room & (R_ROOM | R_MAZE | R_CROSS))) {
            return false;
        }

        let dir, rev; // 方向

        if (this.same_row(room1, room2)) {
            if (this.rooms[room1].left_col > this.rooms[room2].right_col) {
                dir = LEFT; rev = RIGHT;
            } else {
                dir = RIGHT; rev = LEFT;
            }
        } else if (this.same_col(room1, room2)) {
            if (this.rooms[room1].top_row > this.rooms[room2].bottom_row) {
                dir = UPWARD; rev = DOWN;
            } else {
                dir = DOWN; rev = UPWARD;
            }
        } else {
            return false;
        }

        // ドア位置決定＆配置
        const door1 = this.put_door(this.rooms[room1], dir);
        const door2 = this.put_door(this.rooms[room2], rev);

        // 通路描画
        // オリジナルはdo-whileでrand_percent(4)でループして複数引くことがあるが、今回は1本
        this.draw_simple_passage(door1.row, door1.col, door2.row, door2.col, dir);

        // 接続情報を記録
        // オリジナルのロジック:
        // index logic: UP(0)/2=0, RIGHT(1)/2=0... ? 
        // オリジナルの dir定義: UPWARD=0, UP=0, RIGHT=1, DOWN=2, LEFT=3
        // doors 配列は要素4つなので、dirそのままでよさそうだが、オリジナルは `dir / 2` している？
        // ああ、オリジナルは doors[MAXDIRS/2] なのか？ -> room.h 見ると doors[4] です。
        // level.c: dp = &(rooms[room1].doors[dir / 2]); なぜ割る？
        //  -> rooms構造体定義を確認する必要があるが、JS版では単純に dir をインデックスにする
        this.rooms[room1].doors[dir].oth_room = room2;
        this.rooms[room2].doors[rev].oth_room = room1;

        return true;
    }

    put_door(rm, dir) {
        let row, col;
        // wall_width = 1 (R_ROOM)

        switch (dir) {
            case UPWARD:
            case DOWN:
                row = (dir === UPWARD) ? rm.top_row : rm.bottom_row;
                do {
                    col = rm.left_col + 1 + Math.floor(Math.random() * (rm.right_col - rm.left_col - 1));
                } while (this.tiles[row][col] === '|'); // 隅っこ回避（気休め）
                break;
            case RIGHT:
            case LEFT:
                col = (dir === LEFT) ? rm.left_col : rm.right_col;
                do {
                    row = rm.top_row + 1 + Math.floor(Math.random() * (rm.bottom_row - rm.top_row - 1));
                } while (this.tiles[row][col] === '-');
                break;
        }

        // 隠し扉判定 (20%で隠し扉)
        if (Math.random() < 0.2) {
            // 見た目を壁にする
            if (dir === UPWARD || dir === DOWN) {
                this.tiles[row][col] = '-';
            } else {
                this.tiles[row][col] = '|';
            }
            this.hiddenObjects[row][col] = Level.HIDDEN_DOOR;
        } else {
            this.tiles[row][col] = '+';
        }

        return { row, col };
    }

    // 周囲を探索して隠し扉を見つける
    search(x, y) {
        const messages = [];
        let found = false;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // 足元は除外

                const cx = x + dx;
                const cy = y + dy;

                if (!this.isInBounds(cx, cy)) continue;

                const hidden = this.hiddenObjects[cy][cx];
                if (hidden && hidden === Level.HIDDEN_DOOR) {
                    // 発見判定 (簡易的に40%で発見)
                    if (Math.random() < 0.4) {
                        this.tiles[cy][cx] = '+';
                        this.hiddenObjects[cy][cx] = null;
                        if (!found) {
                            messages.push('隠し扉を見つけた！');
                            found = true;
                        }
                    }
                }
            }
        }
        return messages;
    }

    draw_simple_passage(row1, col1, row2, col2, dir) {
        // level.c draw_simple_passage
        let i;
        let middle;

        if (dir === LEFT || dir === RIGHT) {
            // 横方向接続
            if (col1 > col2) {
                [row1, row2] = [row2, row1];
                [col1, col2] = [col2, col1];
            }
            middle = col1 + 1 + Math.floor(Math.random() * (col2 - col1 - 1));

            // 水平 -> 垂直 -> 水平
            for (i = col1 + 1; i !== middle; i++) this.put_tunnel(row1, i);

            const step = (row1 > row2) ? -1 : 1;
            for (i = row1; i !== row2 + step; i += step) this.put_tunnel(i, middle); // 縦線

            for (i = middle; i !== col2; i++) this.put_tunnel(row2, i);

        } else {
            // 縦方向接続
            if (row1 > row2) {
                [row1, row2] = [row2, row1];
                [col1, col2] = [col2, col1];
            }
            middle = row1 + 1 + Math.floor(Math.random() * (row2 - row1 - 1));

            // 垂直 -> 水平 -> 垂直
            for (i = row1 + 1; i !== middle; i++) this.put_tunnel(i, col1);

            const step = (col1 > col2) ? -1 : 1;
            for (i = col1; i !== col2 + step; i += step) this.put_tunnel(middle, i); // 横線

            for (i = middle; i !== row2; i++) this.put_tunnel(i, col2);
        }
    }

    put_tunnel(y, x) {
        if (this.isInBounds(x, y)) {
            const current = this.tiles[y][x];
            // 部屋、壁、ドアは上書きしない
            if (current !== '.' && current !== '-' && current !== '|' && current !== '+') {
                this.tiles[y][x] = '#';
            }
        }
    }

    is_all_connected() {
        // room.c is_all_connected
        for (let i = 0; i < MAXROOMS; i++) this.rooms[i].visited = false;

        let start_room = NO_ROOM;
        for (let i = 0; i < MAXROOMS; i++) {
            if (this.rooms[i].is_room & (R_ROOM | R_MAZE)) {
                start_room = i;
                break;
            }
        }
        if (start_room === NO_ROOM) return true; // 部屋ゼロなら連結とみなす

        this.visit_rooms(start_room);

        for (let i = 0; i < MAXROOMS; i++) {
            if ((this.rooms[i].is_room & (R_ROOM | R_MAZE)) && !this.rooms[i].visited) {
                return false;
            }
        }
        return true;
    }

    visit_rooms(rn) {
        this.rooms[rn].visited = true;
        for (let i = 0; i < 4; i++) {
            const oth = this.rooms[rn].doors[i].oth_room;
            if (oth !== NO_ROOM && !this.rooms[oth].visited) {
                this.visit_rooms(oth);
            }
        }
    }

    same_row(room1, room2) {
        return Math.floor(room1 / 3) === Math.floor(room2 / 3);
    }
    same_col(room1, room2) {
        return (room1 % 3) === (room2 % 3);
    }

    placeStairs() {
        // 有効な部屋からランダムに選ぶ
        const validRooms = this.rooms.filter(r => r.is_room & R_ROOM);
        if (validRooms.length > 0) {
            const room = validRooms[Math.floor(Math.random() * validRooms.length)];
            const stairX = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
            const stairY = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
            this.tiles[stairY][stairX] = '%';
        }
    }

    // --- 既存のユーティリティ ---

    getTile(x, y) {
        if (!this.isInBounds(x, y)) return ' ';
        return this.tiles[y][x];
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    isWalkable(x, y) {
        if (!this.isInBounds(x, y)) return false;
        const tile = this.tiles[y][x];
        return tile === '.' || tile === '#' || tile === '+' || tile === '%';
    }

    isVisible(x, y) {
        if (!this.isInBounds(x, y)) return false;
        return this.visited[y][x];
    }

    // 移動判定 (move.c can_move)
    canMove(x1, y1, x2, y2) {
        // 目的地が通行可能か
        if (!this.isWalkable(x2, y2)) {
            return false;
        }

        // 斜め移動チェック
        if (x1 !== x2 && y1 !== y2) {
            const tile1 = this.getTile(x1, y1);
            const tile2 = this.getTile(x2, y2);

            // ドアへの斜め入り/出し禁止
            if (tile1 === '+' || tile2 === '+') {
                return false;
            }

            // 角抜けチェック (dungeon[row1][col2] == 0 || dungeon[row2][col1] == 0)
            // つまり、移動経路の直角位置にあるマスが両方とも通行可能でなければならない
            // オリジナルは (!dungeon[row1][col2]) || (!dungeon[row2][col1]) なので、
            // どちらか一方が壁ならNG。
            // 例:
            // @ #
            // . .
            // 左上(@)から右下(.)へ行くとき、右上(#)か左下(.)が通れなければならない。
            // Rogueの仕様:
            // if ((dungeon[row1][col1] & DOOR) || (dungeon[row2][col2] & DOOR)
            //     || (!dungeon[row1][col2]) || (!dungeon[row2][col1])) return 0;
            // つまり、直角位置の「どちらか一方でも」壁（通行不可）なら移動できない。
            // 壁の角を曲がるには、角が空いていないといけない。

            if (!this.isWalkable(x1, y2) || !this.isWalkable(x2, y1)) {
                return false;
            }
        }
        return true;
    }

    // 視線チェック (Bresenham's line algorithm)
    isLineOfSight(x1, y1, x2, y2) {
        // 同じ部屋なら見える
        const r1 = this.getRoomAt(x1, y1);
        const r2 = this.getRoomAt(x2, y2);
        if (r1 && r2 && r1 === r2) return true;

        let dx = Math.abs(x2 - x1);
        let dy = Math.abs(y2 - y1);
        let sx = (x1 < x2) ? 1 : -1;
        let sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;

        let cx = x1;
        let cy = y1;

        while (true) {
            if (cx === x2 && cy === y2) return true;

            // 始点と終点はチェックしない（通過点のみ）
            if (cx !== x1 || cy !== y1) {
                if (!this.allowsSight(cx, cy)) return false;
            }

            let e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                cx += sx;
            }
            if (e2 < dx) {
                err += dx;
                cy += sy;
            }
        }
    }

    // 視線を通すタイルか
    allowsSight(x, y) {
        const t = this.getTile(x, y);
        // 床(.), 通路(#), ドア(+), 階段(%), 罠(^), アイテム/モンスター等は別途(ここでは地形のみ)
        // 壁('-', '|')や空白(' ')は通さない
        return ['.', '#', '+', '%', '^'].includes(t);
    }

    updateVisibility(playerX, playerY) {
        // JS互換: getRoomAt等を使って視界更新
        const room = this.getRoomAt(playerX, playerY);
        const tile = this.getTile(playerX, playerY);

        if (room) {
            this.lightUpRoom(room);
            if (tile === '+') {
                this.lightPassage(playerX, playerY);
            }
        } else {
            this.lightPassage(playerX, playerY);
        }
    }

    getRoomAt(x, y) {
        for (const room of this.rooms) {
            if ((room.is_room & R_ROOM) &&
                x >= room.x && x < room.x + room.w &&
                y >= room.y && y < room.y + room.h) {
                return room;
            }
        }
        return null;
    }

    lightUpRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                if (this.isInBounds(x, y)) {
                    this.visited[y][x] = true;
                }
            }
        }
    }

    lightPassage(x, y) {
        // room.c light_passage 相当
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const py = y + i;
                const px = x + j;
                // isWalkable(x, y) なので、x, y の順で渡す
                if (this.isWalkable(px, py)) {
                    // this.visited[y][x] なので y, x の順でアクセス
                    this.visited[py][px] = true;
                }
            }
        }
    }

    isVisible(x, y) {
        if (!this.isInBounds(x, y)) return false;
        return this.visited[y][x];
    }

    revealAll() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isInBounds(x, y)) {
                    this.visited[y][x] = true;
                }
            }
        }
    }

    // 視界判定 (Original Rogue mon_sees 準拠)
    canSee(x1, y1, x2, y2) {
        // 1. 隣接セルは常に見える
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        if (dx <= 1 && dy <= 1) return true;

        // 2. 部屋判定
        const r1 = this.getRoomAt(x1, y1);
        const r2 = this.getRoomAt(x2, y2);

        // 両方同じ部屋にいて、かつその部屋が迷路でなければ見える
        if (r1 && r2 && r1 === r2 && r1.is_room === R_ROOM) {
            return true;
        }

        // 3. 通路での直線視界判定
        // どちらか（あるいは両方）が通路、またはドアの上にいる場合
        // 直線（縦or横）で、間に遮蔽物がなければ見える
        if (x1 === x2 || y1 === y2) {
            // 簡易判定: 間に壁がないかチェック
            // (本来はtunnel判定など厳密だが、ここではWalkableで判定)

            // 距離が遠すぎる場合は見えない？ Rogueは暗闇通路は1ブロック先しか見えない設定だっけ？
            // いや、モンスターはプレイヤーが見えるかどうかの判定。
            // プレイヤーは通路では1マス先しか見えない（暗闇）が、モンスターは夜目がある設定かも。
            // can_see (monster.c) -> プレイヤーが見えるか。
            // プレイヤーが暗い通路にいる場合、モンスターも隣接しないと見えない可能性が高い。

            /* 
               Original mon_sees:
               if (rn == NO_ROOM) ... rdif, cdif <= 1
               つまり、部屋以外（通路）では隣接していないと見えない！？
            */
            return false;
        }

        return false;
    }
}
