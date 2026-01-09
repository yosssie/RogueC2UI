// ===========================
// ダンジョン生成 (Original Rogue Level Generation - Complete Port)
// ===========================

// オリジナルRogueの定数 (rogue.h より)
const MAXROOMS = 9;
const BIG_ROOM = 10;
const NO_ROOM = -1;
const PASSAGE = -3;

const MIN_ROW = 1;
const ROGUE_LINES = 24;
const ROGUE_COLUMNS = 80;

const ROW1 = 7;
const ROW2 = 15;
const COL1 = 26;
const COL2 = 52;

const HIDE_PERCENT = 12;

// 部屋タイプ
const R_NOTHING = 0x01;
const R_ROOM = 0x02;
const R_MAZE = 0x04;
const R_DEADEND = 0x08;
const R_CROSS = 0x10;

// ダンジョンタイル
const NOTHING = 0x0000;
const HORWALL = 0x0008;  // '-'
const VERTWALL = 0x0010; // '|'
const DOOR = 0x0020;     // '+'
const FLOOR = 0x0040;    // '.'
const TUNNEL = 0x0080;   // '#'
const STAIRS = 0x0004;   // '%'
const HIDDEN = 0x0200;   // 隠しフラグ

// 方向
const UPWARD = 0;
const RIGHT = 2;
const DOWN = 4;
const LEFT = 6;
const DIRS = 8;

// ランダム部屋順序 (オリジナルと同じ初期値)
let random_rooms = [3, 7, 5, 2, 0, 6, 1, 4, 8];

export class Level {
    constructor(width, height, floor) {
        this.width = ROGUE_COLUMNS;  // 固定値を使用
        this.height = ROGUE_LINES;   // 固定値を使用
        this.floor = floor;
        this.tiles = [];
        this.visited = [];
        this.hiddenObjects = []; // 隠しオブジェクト用
        this.rooms = [];
        this.dungeon = []; // オリジナルのdungeon配列 (フラグ管理用)

        // グローバル変数的なもの
        this.r_de = NO_ROOM;
    }

    generate() {
        this.clear_level();
        this.make_level();
    }

    clear_level() {
        // ダンジョン配列の初期化
        for (let i = 0; i < ROGUE_LINES; i++) {
            this.dungeon[i] = [];
            this.tiles[i] = [];
            this.visited[i] = [];
            for (let j = 0; j < ROGUE_COLUMNS; j++) {
                this.dungeon[i][j] = NOTHING;
                this.tiles[i][j] = ' ';
                this.visited[i][j] = false;
            }
        }

        // 部屋配列の初期化
        this.rooms = [];
        for (let i = 0; i < MAXROOMS; i++) {
            this.rooms[i] = {
                top_row: 0,
                bottom_row: 0,
                left_col: 0,
                right_col: 0,
                is_room: R_NOTHING,
                doors: [
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 },
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 },
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 },
                    { oth_room: NO_ROOM, oth_row: 0, oth_col: 0, door_row: 0, door_col: 0 }
                ],
                visited: false // is_all_connected用
            };
        }
    }

    make_level() {
        let must_exist1, must_exist2, must_exist3;
        let big_room = false;
        let vertical;

        // 必須部屋の決定
        must_exist1 = this.get_rand(0, 2);
        vertical = this.coin_toss();

        if (vertical) {
            must_exist3 = (must_exist2 = must_exist1 + 3) + 3;
        } else {
            must_exist3 = (must_exist2 = (must_exist1 *= 3) + 1) + 1;
        }

        // BIG_ROOMは今回は省略 (実装が複雑なため)
        // big_room = (this.floor == party_counter) && this.rand_percent(1);

        if (big_room) {
            this.make_room(BIG_ROOM, 0, 0, 0);
        } else {
            // 全部屋を生成
            for (let i = 0; i < MAXROOMS; i++) {
                this.make_room(i, must_exist1, must_exist2, must_exist3);
            }
        }

        if (!big_room) {
            // 迷路追加
            this.add_mazes();

            // ランダム部屋順序をシャッフル
            this.mix_random_rooms();

            // 部屋接続
            for (let j = 0; j < MAXROOMS; j++) {
                const i = random_rooms[j];

                if (i < MAXROOMS - 1) {
                    this.connect_rooms(i, i + 1);
                }
                if (i < MAXROOMS - 3) {
                    this.connect_rooms(i, i + 3);
                }
                if (i < MAXROOMS - 2) {
                    if ((this.rooms[i + 1].is_room & R_NOTHING) &&
                        (i + 1 !== 4 || vertical)) {
                        if (this.connect_rooms(i, i + 2)) {
                            this.rooms[i + 1].is_room = R_CROSS;
                        }
                    }
                }
                if (i < MAXROOMS - 6) {
                    if ((this.rooms[i + 3].is_room & R_NOTHING) &&
                        (i + 3 !== 4 || !vertical)) {
                        if (this.connect_rooms(i, i + 6)) {
                            this.rooms[i + 3].is_room = R_CROSS;
                        }
                    }
                }
                if (this.is_all_connected()) {
                    break;
                }
            }

            // 最終チェック
            if (!this.is_all_connected()) {
                // 接続されてない部屋をログ出力
            }

            // 空き部屋を埋める
            this.fill_out_level();
        }

        // dungeon配列からtiles配列へ変換
        this.convert_dungeon_to_tiles();

        // 階段配置
        this.placeStairs();
    }

    make_room(rn, r1, r2, r3) {
        let left_col, right_col, top_row, bottom_row;
        let width, height;
        let row_offset, col_offset;

        if (rn === BIG_ROOM) {
            top_row = this.get_rand(MIN_ROW, MIN_ROW + 5);
            bottom_row = this.get_rand(ROGUE_LINES - 7, ROGUE_LINES - 2);
            left_col = this.get_rand(0, 10);
            right_col = this.get_rand(ROGUE_COLUMNS - 11, ROGUE_COLUMNS - 2);
            rn = 0;
            // goto B相当の処理
        } else {
            // グリッド範囲決定
            switch (rn % 3) {
                case 0:
                    left_col = 0;
                    right_col = COL1 - 1;
                    break;
                case 1:
                    left_col = COL1 + 1;
                    right_col = COL2 - 1;
                    break;
                default:
                case 2:
                    left_col = COL2 + 1;
                    right_col = ROGUE_COLUMNS - 2;
                    break;
            }
            switch (Math.floor(rn / 3)) {
                case 0:
                    top_row = MIN_ROW;
                    bottom_row = ROW1 - 1;
                    break;
                case 1:
                    top_row = ROW1 + 1;
                    bottom_row = ROW2 - 1;
                    break;
                default:
                case 2:
                    top_row = ROW2 + 1;
                    bottom_row = ROGUE_LINES - 2;
                    break;
            }

            height = this.get_rand(4, (bottom_row - top_row + 1));
            width = this.get_rand(7, (right_col - left_col - 2));

            row_offset = this.get_rand(0, ((bottom_row - top_row) - height + 1));
            col_offset = this.get_rand(0, ((right_col - left_col) - width + 1));

            top_row += row_offset;
            bottom_row = top_row + height - 1;

            left_col += col_offset;
            right_col = left_col + width - 1;

            // 必須部屋以外は40%で生成されない
            if ((rn !== r1) && (rn !== r2) && (rn !== r3) && this.rand_percent(40)) {
                // goto END相当 (部屋座標だけ記録して終了)
                this.rooms[rn].top_row = top_row;
                this.rooms[rn].bottom_row = bottom_row;
                this.rooms[rn].left_col = left_col;
                this.rooms[rn].right_col = right_col;
                return;
            }
        }

        // B: 部屋を描画
        this.rooms[rn].is_room = R_ROOM;

        for (let i = top_row; i <= bottom_row; i++) {
            for (let j = left_col; j <= right_col; j++) {
                let ch;
                if (i === top_row || i === bottom_row) {
                    ch = HORWALL;
                } else if (j === left_col || j === right_col) {
                    ch = VERTWALL;
                } else {
                    ch = FLOOR;
                }
                this.dungeon[i][j] = ch;
            }
        }

        // END:
        this.rooms[rn].top_row = top_row;
        this.rooms[rn].bottom_row = bottom_row;
        this.rooms[rn].left_col = left_col;
        this.rooms[rn].right_col = right_col;
    }

    connect_rooms(room1, room2) {
        let row1, col1, row2, col2, dir, rev;

        if (!(this.rooms[room1].is_room & (R_ROOM | R_MAZE)) ||
            !(this.rooms[room2].is_room & (R_ROOM | R_MAZE))) {
            return 0;
        }

        if (this.same_row(room1, room2)) {
            if (this.rooms[room1].left_col > this.rooms[room2].right_col) {
                dir = LEFT;
                rev = RIGHT;
            } else {
                dir = RIGHT;
                rev = LEFT;
            }
        } else if (this.same_col(room1, room2)) {
            if (this.rooms[room1].top_row > this.rooms[room2].bottom_row) {
                dir = UPWARD;
                rev = DOWN;
            } else {
                dir = DOWN;
                rev = UPWARD;
            }
        } else {
            return 0;
        }

        const door1 = this.put_door(this.rooms[room1], dir);
        const door2 = this.put_door(this.rooms[room2], rev);

        row1 = door1.row;
        col1 = door1.col;
        row2 = door2.row;
        col2 = door2.col;

        // オリジナル: 4%の確率で繰り返し描画!
        do {
            this.draw_simple_passage(row1, col1, row2, col2, dir);
        } while (this.rand_percent(4));

        // 接続情報を記録
        let dp = this.rooms[room1].doors[Math.floor(dir / 2)];
        dp.oth_room = room2;
        dp.oth_row = row2;
        dp.oth_col = col2;

        dp = this.rooms[room2].doors[Math.floor(((dir + 4) % DIRS) / 2)];
        dp.oth_room = room1;
        dp.oth_row = row1;
        dp.oth_col = col1;

        return 1;
    }

    put_door(rm, dir) {
        let row, col;
        const wall_width = (rm.is_room & R_MAZE) ? 0 : 1;

        switch (dir) {
            case UPWARD:
            case DOWN:
                row = (dir === UPWARD) ? rm.top_row : rm.bottom_row;
                do {
                    col = this.get_rand(rm.left_col + wall_width, rm.right_col - wall_width);
                } while (!(this.dungeon[row][col] & (HORWALL | TUNNEL)));
                break;
            case RIGHT:
            case LEFT:
                col = (dir === LEFT) ? rm.left_col : rm.right_col;
                do {
                    row = this.get_rand(rm.top_row + wall_width, rm.bottom_row - wall_width);
                } while (!(this.dungeon[row][col] & (VERTWALL | TUNNEL)));
                break;
        }

        if (rm.is_room & R_ROOM) {
            this.dungeon[row][col] = DOOR;
        }

        // 隠しドア判定
        if ((this.floor > 2) && this.rand_percent(HIDE_PERCENT)) {
            this.dungeon[row][col] |= HIDDEN;
        }

        rm.doors[Math.floor(dir / 2)].door_row = row;
        rm.doors[Math.floor(dir / 2)].door_col = col;

        return { row, col };
    }

    draw_simple_passage(row1, col1, row2, col2, dir) {
        let i, middle;

        if ((dir === LEFT) || (dir === RIGHT)) {
            if (col1 > col2) {
                [row1, row2] = [row2, row1];
                [col1, col2] = [col2, col1];
            }
            middle = this.get_rand(col1 + 1, col2 - 1);
            for (i = col1 + 1; i !== middle; i++) {
                this.dungeon[row1][i] = TUNNEL;
            }
            for (i = row1; i !== row2; i += (row1 > row2) ? -1 : 1) {
                this.dungeon[i][middle] = TUNNEL;
            }
            for (i = middle; i !== col2; i++) {
                this.dungeon[row2][i] = TUNNEL;
            }
        } else {
            if (row1 > row2) {
                [row1, row2] = [row2, row1];
                [col1, col2] = [col2, col1];
            }
            middle = this.get_rand(row1 + 1, row2 - 1);
            for (i = row1 + 1; i !== middle; i++) {
                this.dungeon[i][col1] = TUNNEL;
            }
            for (i = col1; i !== col2; i += (col1 > col2) ? -1 : 1) {
                this.dungeon[middle][i] = TUNNEL;
            }
            for (i = middle; i !== row2; i++) {
                this.dungeon[i][col2] = TUNNEL;
            }
        }

        // 隠し通路の生成
        if (this.rand_percent(HIDE_PERCENT)) {
            this.hide_boxed_passage(row1, col1, row2, col2, 1);
        }
    }

    hide_boxed_passage(row1, col1, row2, col2, n) {
        let row, col, row_cut, col_cut;
        let h, w;

        if (this.floor > 2) {
            if (row1 > row2) {
                [row1, row2] = [row2, row1];
            }
            if (col1 > col2) {
                [col1, col2] = [col2, col1];
            }
            h = row2 - row1;
            w = col2 - col1;

            if ((w >= 5) || (h >= 5)) {
                row_cut = (h >= 2) ? 1 : 0;
                col_cut = (w >= 2) ? 1 : 0;

                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < 10; j++) {
                        row = this.get_rand(row1 + row_cut, row2 - row_cut);
                        col = this.get_rand(col1 + col_cut, col2 - col_cut);
                        if (this.dungeon[row][col] === TUNNEL) {
                            this.dungeon[row][col] |= HIDDEN;
                            break;
                        }
                    }
                }
            }
        }
    }

    add_mazes() {
        let start, maze_percent;

        if (this.floor > 1) {
            start = this.get_rand(0, MAXROOMS - 1);
            maze_percent = Math.floor((this.floor * 5) / 4);

            if (this.floor > 15) {
                maze_percent += this.floor;
            }

            for (let i = 0; i < MAXROOMS; i++) {
                const j = (start + i) % MAXROOMS;
                if (this.rooms[j].is_room & R_NOTHING) {
                    if (this.rand_percent(maze_percent)) {
                        this.rooms[j].is_room = R_MAZE;

                        const tr = this.rooms[j].top_row;
                        const br = this.rooms[j].bottom_row;
                        const lc = this.rooms[j].left_col;
                        const rc = this.rooms[j].right_col;

                        const r = this.get_rand(tr + 1, br - 1);
                        const c = this.get_rand(lc + 1, rc - 1);
                        this.make_maze(r, c, tr, br, lc, rc);
                        this.hide_boxed_passage(tr, lc, br, rc, this.get_rand(0, 2));
                    }
                }
            }
        }
    }

    make_maze(r, c, tr, br, lc, rc) {
        const dirs = [UPWARD, DOWN, LEFT, RIGHT];

        this.dungeon[r][c] = TUNNEL;

        // 33%の確率で方向をシャッフル
        if (this.rand_percent(33)) {
            for (let i = 0; i < 10; i++) {
                const t1 = this.get_rand(0, 3);
                const t2 = this.get_rand(0, 3);
                [dirs[t1], dirs[t2]] = [dirs[t2], dirs[t1]];
            }
        }

        for (let i = 0; i < 4; i++) {
            switch (dirs[i]) {
                case UPWARD:
                    if (((r - 1) >= tr) &&
                        (this.dungeon[r - 1][c] !== TUNNEL) &&
                        (this.dungeon[r - 1][c - 1] !== TUNNEL) &&
                        (this.dungeon[r - 1][c + 1] !== TUNNEL) &&
                        (this.dungeon[r - 2][c] !== TUNNEL)) {
                        this.make_maze(r - 1, c, tr, br, lc, rc);
                    }
                    break;
                case DOWN:
                    if (((r + 1) <= br) &&
                        (this.dungeon[r + 1][c] !== TUNNEL) &&
                        (this.dungeon[r + 1][c - 1] !== TUNNEL) &&
                        (this.dungeon[r + 1][c + 1] !== TUNNEL) &&
                        (this.dungeon[r + 2][c] !== TUNNEL)) {
                        this.make_maze(r + 1, c, tr, br, lc, rc);
                    }
                    break;
                case LEFT:
                    if (((c - 1) >= lc) &&
                        (this.dungeon[r][c - 1] !== TUNNEL) &&
                        (this.dungeon[r - 1][c - 1] !== TUNNEL) &&
                        (this.dungeon[r + 1][c - 1] !== TUNNEL) &&
                        (this.dungeon[r][c - 2] !== TUNNEL)) {
                        this.make_maze(r, c - 1, tr, br, lc, rc);
                    }
                    break;
                case RIGHT:
                    if (((c + 1) <= rc) &&
                        (this.dungeon[r][c + 1] !== TUNNEL) &&
                        (this.dungeon[r - 1][c + 1] !== TUNNEL) &&
                        (this.dungeon[r + 1][c + 1] !== TUNNEL) &&
                        (this.dungeon[r][c + 2] !== TUNNEL)) {
                        this.make_maze(r, c + 1, tr, br, lc, rc);
                    }
                    break;
            }
        }
    }

    fill_out_level() {
        this.mix_random_rooms();
        this.r_de = NO_ROOM;

        for (let i = 0; i < MAXROOMS; i++) {
            const rn = random_rooms[i];
            if ((this.rooms[rn].is_room & R_NOTHING) ||
                ((this.rooms[rn].is_room & R_CROSS) && this.coin_toss())) {
                this.fill_it(rn, true);
            }
        }
        if (this.r_de !== NO_ROOM) {
            this.fill_it(this.r_de, false);
        }
    }

    fill_it(rn, do_rec_de) {
        let tunnel_dir, door_dir, drow, dcol;
        let target_room, rooms_found = 0;
        let srow, scol;
        const offsets = [-1, 1, 3, -3];
        let did_this = false;

        // offsetsをシャッフル
        for (let i = 0; i < 10; i++) {
            const sr = this.get_rand(0, 3);
            const sc = this.get_rand(0, 3);
            [offsets[sr], offsets[sc]] = [offsets[sc], offsets[sr]];
        }

        for (let i = 0; i < 4; i++) {
            target_room = rn + offsets[i];

            if (((target_room < 0) || (target_room >= MAXROOMS)) ||
                (!(this.same_row(rn, target_room) || this.same_col(rn, target_room))) ||
                (!(this.rooms[target_room].is_room & (R_ROOM | R_MAZE)))) {
                continue;
            }

            if (this.same_row(rn, target_room)) {
                tunnel_dir = (this.rooms[rn].left_col < this.rooms[target_room].left_col) ?
                    RIGHT : LEFT;
            } else {
                tunnel_dir = (this.rooms[rn].top_row < this.rooms[target_room].top_row) ?
                    DOWN : UPWARD;
            }

            door_dir = ((tunnel_dir + 4) % DIRS);
            if (this.rooms[target_room].doors[Math.floor(door_dir / 2)].oth_room !== NO_ROOM) {
                continue;
            }

            if ((!do_rec_de || did_this) ||
                !this.mask_room(rn, TUNNEL)) {
                srow = Math.floor((this.rooms[rn].top_row + this.rooms[rn].bottom_row) / 2);
                scol = Math.floor((this.rooms[rn].left_col + this.rooms[rn].right_col) / 2);
            } else {
                const pos = this.mask_room(rn, TUNNEL);
                srow = pos.row;
                scol = pos.col;
            }

            const door = this.put_door(this.rooms[target_room], door_dir);
            drow = door.row;
            dcol = door.col;

            rooms_found++;
            this.draw_simple_passage(srow, scol, drow, dcol, tunnel_dir);
            this.rooms[rn].is_room = R_DEADEND;
            this.dungeon[srow][scol] = TUNNEL;

            if ((i < 3) && (!did_this)) {
                did_this = true;
                if (this.coin_toss()) {
                    continue;
                }
            }
            if ((rooms_found < 2) && do_rec_de) {
                this.recursive_deadend(rn, offsets, srow, scol);
            }
            break;
        }
    }

    recursive_deadend(rn, offsets, srow, scol) {
        let de, drow, dcol, tunnel_dir;

        this.rooms[rn].is_room = R_DEADEND;
        this.dungeon[srow][scol] = TUNNEL;

        for (let i = 0; i < 4; i++) {
            de = rn + offsets[i];
            if (((de < 0) || (de >= MAXROOMS)) ||
                (!(this.same_row(rn, de) || this.same_col(rn, de)))) {
                continue;
            }
            if (!(this.rooms[de].is_room & R_NOTHING)) {
                continue;
            }

            drow = Math.floor((this.rooms[de].top_row + this.rooms[de].bottom_row) / 2);
            dcol = Math.floor((this.rooms[de].left_col + this.rooms[de].right_col) / 2);

            if (this.same_row(rn, de)) {
                tunnel_dir = (this.rooms[rn].left_col < this.rooms[de].left_col) ?
                    RIGHT : LEFT;
            } else {
                tunnel_dir = (this.rooms[rn].top_row < this.rooms[de].top_row) ?
                    DOWN : UPWARD;
            }

            this.draw_simple_passage(srow, scol, drow, dcol, tunnel_dir);
            this.r_de = de;
            this.recursive_deadend(de, offsets, drow, dcol);
        }
    }

    mask_room(rn, mask) {
        for (let i = this.rooms[rn].top_row; i <= this.rooms[rn].bottom_row; i++) {
            for (let j = this.rooms[rn].left_col; j <= this.rooms[rn].right_col; j++) {
                if (this.dungeon[i][j] & mask) {
                    return { row: i, col: j };
                }
            }
        }
        return null;
    }

    same_row(room1, room2) {
        return Math.floor(room1 / 3) === Math.floor(room2 / 3);
    }

    same_col(room1, room2) {
        return (room1 % 3) === (room2 % 3);
    }

    is_all_connected() {
        for (let i = 0; i < MAXROOMS; i++) {
            this.rooms[i].visited = false;
        }

        let start_room = NO_ROOM;
        for (let i = 0; i < MAXROOMS; i++) {
            if (this.rooms[i].is_room & (R_ROOM | R_MAZE)) {
                start_room = i;
                break;
            }
        }
        if (start_room === NO_ROOM) return true;

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

    mix_random_rooms() {
        for (let i = 0; i < MAXROOMS; i++) {
            const j = this.get_rand(i, MAXROOMS - 1);
            [random_rooms[i], random_rooms[j]] = [random_rooms[j], random_rooms[i]];
        }
    }

    convert_dungeon_to_tiles() {
        for (let i = 0; i < ROGUE_LINES; i++) {
            for (let j = 0; j < ROGUE_COLUMNS; j++) {
                const cell = this.dungeon[i][j];

                // HIDDENフラグを除去してタイル判定
                const visible_cell = cell & ~HIDDEN;

                if (visible_cell & HORWALL) {
                    this.tiles[i][j] = '-';
                } else if (visible_cell & VERTWALL) {
                    this.tiles[i][j] = '|';
                } else if (visible_cell & DOOR) {
                    // 隠しドアの場合は壁として表示
                    if (cell & HIDDEN) {
                        // 左右に横壁があれば横壁、なければ縦壁 (オリジナルRogue準拠)
                        if ((j > 0 && (this.dungeon[i][j - 1] & HORWALL)) ||
                            (j < ROGUE_COLUMNS - 1 && (this.dungeon[i][j + 1] & HORWALL))) {
                            this.tiles[i][j] = '-';
                        } else {
                            this.tiles[i][j] = '|';
                        }
                    } else {
                        this.tiles[i][j] = '+';
                    }
                } else if (visible_cell & FLOOR) {
                    this.tiles[i][j] = '.';
                } else if (visible_cell & TUNNEL) {
                    // 隠し通路の場合は空白として表示
                    if (cell & HIDDEN) {
                        this.tiles[i][j] = ' ';
                    } else {
                        this.tiles[i][j] = '#';
                    }
                } else if (visible_cell & STAIRS) {
                    this.tiles[i][j] = '%';
                } else {
                    this.tiles[i][j] = ' ';
                }
            }
        }
    }

    placeStairs() {
        // 有効な部屋からランダムに選ぶ
        const validRooms = this.rooms.filter(r => r.is_room & R_ROOM);
        if (validRooms.length > 0) {
            const room = validRooms[Math.floor(Math.random() * validRooms.length)];
            let stairX, stairY;

            // 部屋の床にランダム配置
            do {
                stairX = this.get_rand(room.left_col + 1, room.right_col - 1);
                stairY = this.get_rand(room.top_row + 1, room.bottom_row - 1);
            } while (this.dungeon[stairY][stairX] !== FLOOR);

            this.dungeon[stairY][stairX] = STAIRS;
            this.tiles[stairY][stairX] = '%';
        }
    }

    // 探索処理 (隠しドア・隠し通路を見つける)
    search(x, y) {
        const messages = [];
        let found = false;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;

                const cx = x + dx;
                const cy = y + dy;

                if (!this.isInBounds(cx, cy)) continue;

                const cell = this.dungeon[cy][cx];
                if (cell & HIDDEN) {
                    // 発見判定 (簡易的に40%で発見)
                    if (Math.random() < 0.4) {
                        this.dungeon[cy][cx] &= ~HIDDEN;

                        // タイルを更新
                        if (cell & DOOR) {
                            this.tiles[cy][cx] = '+';
                            if (!found) {
                                messages.push('隠し扉を見つけた！');
                                found = true;
                            }
                        } else if (cell & TUNNEL) {
                            this.tiles[cy][cx] = '#';
                            if (!found) {
                                messages.push('隠し通路を見つけた！');
                                found = true;
                            }
                        }
                    }
                }
            }
        }
        return messages;
    }

    // === ユーティリティ関数 ===

    get_rand(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    coin_toss() {
        return Math.random() < 0.5;
    }

    rand_percent(percentage) {
        return Math.random() * 100 < percentage;
    }

    getTile(x, y) {
        if (!this.isInBounds(x, y)) return ' ';
        return this.tiles[y][x];
    }

    isInBounds(x, y) {
        return x >= 0 && x < ROGUE_COLUMNS && y >= 0 && y < ROGUE_LINES;
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

    canMove(x1, y1, x2, y2) {
        if (!this.isWalkable(x2, y2)) {
            return false;
        }

        // 斜め移動チェック
        if (x1 !== x2 && y1 !== y2) {
            const tile1 = this.getTile(x1, y1);
            const tile2 = this.getTile(x2, y2);

            if (tile1 === '+' || tile2 === '+') {
                return false;
            }

            if (!this.isWalkable(x1, y2) || !this.isWalkable(x2, y1)) {
                return false;
            }
        }
        return true;
    }

    isLineOfSight(x1, y1, x2, y2) {
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

    allowsSight(x, y) {
        const t = this.getTile(x, y);
        return ['.', '#', '+', '%', '^'].includes(t);
    }

    updateVisibility(playerX, playerY) {
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
                x >= room.left_col && x <= room.right_col &&
                y >= room.top_row && y <= room.bottom_row) {
                return room;
            }
        }
        return null;
    }

    lightUpRoom(room) {
        for (let y = room.top_row; y <= room.bottom_row; y++) {
            for (let x = room.left_col; x <= room.right_col; x++) {
                if (this.isInBounds(x, y)) {
                    this.visited[y][x] = true;
                }
            }
        }
    }

    lightPassage(x, y) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const py = y + i;
                const px = x + j;
                if (this.isWalkable(px, py)) {
                    this.visited[py][px] = true;
                }
            }
        }
    }

    revealAll() {
        for (let y = 0; y < ROGUE_LINES; y++) {
            for (let x = 0; x < ROGUE_COLUMNS; x++) {
                if (this.isInBounds(x, y)) {
                    this.visited[y][x] = true;
                }
            }
        }
    }

    canSee(x1, y1, x2, y2) {
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        if (dx <= 1 && dy <= 1) return true;

        const r1 = this.getRoomAt(x1, y1);
        const r2 = this.getRoomAt(x2, y2);

        if (r1 && r2 && r1 === r2 && r1.is_room === R_ROOM) {
            return true;
        }

        if (x1 === x2 || y1 === y2) {
            return false;
        }

        return false;
    }
}
