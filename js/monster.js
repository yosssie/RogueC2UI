// ===========================
// モンスター
// ===========================

export class Monster {
    static FLAGS = {
        HASTED: 0x1,
        SLOWED: 0x2,
        INVISIBLE: 0x4,
        ASLEEP: 0x8,
        WAKENS: 0x10,
        WANDERS: 0x20,
        FLIES: 0x40,
        FLITS: 0x80,
        CAN_FLIT: 0x100,
        CONFUSED: 0x200,
        RUSTS: 0x400,
        HOLDS: 0x800,
        FREEZES: 0x1000,
        STEALS_GOLD: 0x2000,
        STEALS_ITEM: 0x4000,
        STINGS: 0x8000,
        DRAINS_LIFE: 0x10000,
        DROPS_LEVEL: 0x20000,
        SEEKS_GOLD: 0x40000,
        FREEZING_ROGUE: 0x80000,
        RUST_VANISHED: 0x100000,
        CONFUSES: 0x200000,
        IMITATES: 0x400000,
        FLAMES: 0x800000,
        STATIONARY: 0x1000000,
        NAPPING: 0x2000000,
        ALREADY_MOVED: 0x4000000
    };

    static definitions = {
        'A': { name: '水ごけの怪物', hp: 25, exp: 20, minLevel: 9, maxLevel: 18, damage: '0d0', flags: ['ASLEEP', 'WAKENS', 'WANDERS', 'RUSTS'] },
        'B': { name: '大こうもり', hp: 10, exp: 2, minLevel: 1, maxLevel: 8, damage: '1d3', flags: ['ASLEEP', 'WANDERS', 'FLITS'] },
        'C': { name: 'ケンタウロス', hp: 32, exp: 15, minLevel: 7, maxLevel: 16, damage: '3d3/2d5', flags: ['ASLEEP', 'WANDERS'] },
        'D': { name: 'ドラゴン', hp: 145, exp: 5000, minLevel: 21, maxLevel: 99, damage: '4d6/4d9', flags: ['ASLEEP', 'WAKENS', 'FLAMES'] },
        'E': { name: '大うずら', hp: 11, exp: 2, minLevel: 1, maxLevel: 7, damage: '1d3', flags: ['ASLEEP', 'WAKENS'] },
        'F': { name: 'はえとりぐさ', hp: 73, exp: 91, minLevel: 12, maxLevel: 99, damage: '5d5', flags: ['HOLDS', 'STATIONARY'] },
        'G': { name: '翼ライオン', hp: 115, exp: 2000, minLevel: 20, maxLevel: 99, damage: '5d5/5d5', flags: ['ASLEEP', 'WAKENS', 'WANDERS', 'FLIES'] },
        'H': { name: '小鬼', hp: 15, exp: 3, minLevel: 1, maxLevel: 10, damage: '1d3/1d2', flags: ['ASLEEP', 'WAKENS', 'WANDERS'] },
        'I': { name: '氷の怪物', hp: 15, exp: 5, minLevel: 2, maxLevel: 11, damage: '0d0', flags: ['ASLEEP', 'FREEZES'] },
        'J': { name: '巨大トカゲ', hp: 132, exp: 3000, minLevel: 21, maxLevel: 99, damage: '3d10/4d5', flags: ['ASLEEP', 'WANDERS'] },
        'K': { name: '大はやぶさ', hp: 10, exp: 2, minLevel: 1, maxLevel: 6, damage: '1d4', flags: ['ASLEEP', 'WAKENS', 'WANDERS', 'FLIES'] },
        'L': { name: '金持ち妖精', hp: 25, exp: 21, minLevel: 6, maxLevel: 16, damage: '0d0', flags: ['ASLEEP', 'STEALS_GOLD'] },
        'M': { name: 'メデューサ', hp: 97, exp: 250, minLevel: 18, maxLevel: 99, damage: '4d4/3d7', flags: ['ASLEEP', 'WAKENS', 'WANDERS', 'CONFUSES'] },
        'N': { name: 'ニンフ', hp: 25, exp: 39, minLevel: 10, maxLevel: 19, damage: '0d0', flags: ['ASLEEP', 'STEALS_ITEM'] },
        'O': { name: '欲ばり鬼', hp: 25, exp: 5, minLevel: 4, maxLevel: 13, damage: '1d6', flags: ['ASLEEP', 'WANDERS', 'WAKENS', 'SEEKS_GOLD'] },
        'P': { name: '幽霊', hp: 76, exp: 120, minLevel: 15, maxLevel: 24, damage: '5d4', flags: ['ASLEEP', 'INVISIBLE', 'WANDERS', 'FLITS'] },
        'Q': { name: '大つのじか', hp: 30, exp: 20, minLevel: 8, maxLevel: 17, damage: '3d5', flags: ['ASLEEP', 'WAKENS', 'WANDERS'] },
        'R': { name: 'がらがらへび', hp: 19, exp: 10, minLevel: 3, maxLevel: 12, damage: '2d5', flags: ['ASLEEP', 'WAKENS', 'WANDERS', 'STINGS'] },
        'S': { name: 'へび', hp: 8, exp: 2, minLevel: 1, maxLevel: 9, damage: '1d3', flags: ['ASLEEP', 'WAKENS', 'WANDERS'] },
        'T': { name: '巨人', hp: 75, exp: 125, minLevel: 13, maxLevel: 22, damage: '4d6/1d4', flags: ['ASLEEP', 'WAKENS', 'WANDERS'] },
        'U': { name: '一角獣', hp: 90, exp: 200, minLevel: 17, maxLevel: 26, damage: '4d10', flags: ['ASLEEP', 'WAKENS', 'WANDERS'] },
        'V': { name: 'バンパイア', hp: 55, exp: 350, minLevel: 19, maxLevel: 99, damage: '1d14/1d4', flags: ['ASLEEP', 'WAKENS', 'WANDERS', 'DRAINS_LIFE'] },
        'W': { name: '死霊', hp: 45, exp: 55, minLevel: 14, maxLevel: 23, damage: '2d8', flags: ['ASLEEP', 'WANDERS', 'DROPS_LEVEL'] },
        'X': { name: '物まねの怪物', hp: 42, exp: 110, minLevel: 16, maxLevel: 25, damage: '4d6', flags: ['ASLEEP', 'IMITATES'] },
        'Y': { name: '雪男', hp: 35, exp: 50, minLevel: 11, maxLevel: 20, damage: '3d6', flags: ['ASLEEP', 'WANDERS'] },
        'Z': { name: 'ゾンビ', hp: 21, exp: 8, minLevel: 5, maxLevel: 14, damage: '1d7', flags: ['ASLEEP', 'WAKENS', 'WANDERS'] },
    };

    /**
     * 指定された階層に出現可能なモンスターをランダムに選択
     * @param {number} floor - 現在の階層
     * @returns {string|null} - モンスタータイプ ('A'-'Z') または null
     */
    static getRandomMonster(floor) {
        const candidates = [];
        for (const [type, def] of Object.entries(Monster.definitions)) {
            if (floor >= def.minLevel && floor <= def.maxLevel) {
                candidates.push(type);
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * @param {string} type - 'A' to 'Z'
     * @param {number} x 
     * @param {number} y 
     */
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;

        let def = Monster.definitions[type];
        if (!def) {
            def = Monster.definitions['B']; // fallback
        }

        this.name = def.name;
        this.hp = def.hp;
        this.maxHp = def.hp;
        this.exp = def.exp;
        this.damage = def.damage; // string "1d3" etc
        this.symbol = type;

        // フラグ初期化
        this.flags = 0;
        if (def.flags) {
            def.flags.forEach(flagName => {
                if (Monster.FLAGS[flagName]) {
                    this.flags |= Monster.FLAGS[flagName];
                }
            });
        }

        // Placeholder properties consistent with previous implementation
        this.str = 0;
        this.speed = 1.0;
        this.lastMoveTime = 0;
        this.confusedTurns = 0;
        this.sleepTurns = 0;
        this.heldTurns = 0; // 金縛り用
        this.slowedToggle = false; // SLOWED時の行動スキップ用
        this.trow = null; // ターゲットY座標
        this.tcol = null; // ターゲットX座標
        this.lastX = null; // 直前の位置（通路追跡用）
        this.lastY = null;
    }

    hasFlag(flagVal) {
        return (this.flags & flagVal) !== 0;
    }

    setFlag(flagVal) {
        this.flags |= flagVal;
    }

    removeFlag(flagVal) {
        this.flags &= ~flagVal;
    }

    // オリジナルRogue monster.c の mon_sees() を移植
    canSeePlayer(player, level) {
        // プレイヤーの部屋番号を取得
        const playerRoom = level.getRoomAt ? level.getRoomAt(player.x, player.y) : null;
        const monsterRoom = level.getRoomAt ? level.getRoomAt(this.x, this.y) : null;

        // 同じ部屋にいる場合 (迷路部屋は未実装なので常にtrue)
        if (playerRoom && monsterRoom &&
            playerRoom.x === monsterRoom.x &&
            playerRoom.y === monsterRoom.y) {
            return true;
        }

        // 隣接している場合
        const rdif = player.y - this.y;
        const cdif = player.x - this.x;

        return (rdif >= -1 && rdif <= 1 && cdif >= -1 && cdif <= 1);
    }

    act(player, level, monsters = []) {
        // 混乱状態ならランダム移動
        if (this.hasFlag(Monster.FLAGS.CONFUSED)) {
            this.randomMove(level, monsters);
            return;
        }

        // STATIONARY (固定) なら動かない
        // 攻撃は processMonsterAction で別途処理されるため、ここに来るのは移動のみ
        if (this.hasFlag(Monster.FLAGS.STATIONARY)) {
            return;
        }

        // ふらふら移動 (FLITS) Check
        if (this.hasFlag(Monster.FLAGS.FLITS) && Math.random() < 0.47) {
            this.randomMove(level, monsters);
            return;
        }

        // 1. まずプレイヤーが見えるかチェック
        if (this.canSeePlayer(player, level)) {
            this.tcol = player.x;
            this.trow = player.y;
        }

        // 2. ターゲット地点到達チェック
        if (this.tcol === this.x && this.trow === this.y) {
            // 到達したがプレイヤーが見えていない場合、追跡継続を試みる
            // (部屋から通路に出た時や、通路を移動中)
            if (!this.canSeePlayer(player, level)) {
                this.continueChasing(level);
            }

            // それでもターゲットが変わらなければクリア（目的地到着）
            if (this.tcol === this.x && this.trow === this.y) {
                this.tcol = null;
                this.trow = null;
            }
        }

        // 3. 移動決定
        if (this.tcol !== null && this.trow !== null) {
            // ターゲットがあるならそこに向かう
            this.moveToTarget(this.tcol, this.trow, level, monsters, player);
        } else {
            // ターゲットがないならランダム徘徊 (WANDERS フラグ持ちのみ)
            if (this.hasFlag(Monster.FLAGS.WANDERS)) {
                this.randomMove(level, monsters);
            }
        }
    }

    // 視界外での追跡継続（通路を辿る、部屋を横断する）
    continueChasing(level) {
        const tile = level.getTile(this.x, this.y);

        // 部屋(.)にいる場合、他の出口を探す
        if (tile === '.') {
            this.findExitInRoom(level);
            return;
        }

        // ドア(+) または 通路(#) にいる場合のみ
        if (tile !== '+' && tile !== '#') return;

        const dirs = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        // ランダムにシャッフル
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        for (let d of dirs) {
            const nx = this.x + d.x;
            const ny = this.y + d.y;

            // 直前の位置には戻らない
            if (this.lastX !== null && nx === this.lastX && ny === this.lastY) {
                continue;
            }

            const nextTile = level.getTile(nx, ny);
            // 壁('-', '|') や 空白(' ') 以外なら進める（通路、ドア、床、階段、罠など）
            if (nextTile !== ' ' && nextTile !== '-' && nextTile !== '|') {
                this.tcol = nx;
                this.trow = ny;
                return;
            }
        }
    }

    // 部屋内の別の出口を探す
    findExitInRoom(level) {
        const room = level.getRoomAt(this.x, this.y);
        if (!room) return;

        const exits = [];
        // 部屋の境界（壁の位置）をスキャンしてドアを探す
        // room.x, room.y は床の開始位置。壁はその外側 (-1)

        // 上下辺
        for (let x = room.x; x < room.x + room.w; x++) {
            // 上壁: room.y, 下壁: room.y + room.h - 1
            if (level.getTile(x, room.y) === '+') exits.push({ x: x, y: room.y });
            if (level.getTile(x, room.y + room.h - 1) === '+') exits.push({ x: x, y: room.y + room.h - 1 });
        }
        // 左右辺
        for (let y = room.y; y < room.y + room.h; y++) {
            // 左壁: room.x, 右壁: room.x + room.w - 1
            if (level.getTile(room.x, y) === '+') exits.push({ x: room.x, y: y });
            if (level.getTile(room.x + room.w - 1, y) === '+') exits.push({ x: room.x + room.w - 1, y: y });
        }

        if (exits.length === 0) return;

        // 今入ってきたドア（直前の位置と一致するもの）を除外
        if (this.lastX !== null) {
            const filtered = exits.filter(e => {
                // ドア座標が lastX, lastY と一致するなら除外
                return (e.x !== this.lastX || e.y !== this.lastY);
            });

            // filteredがあればそちらを使う
            if (filtered.length > 0) {
                const target = filtered[Math.floor(Math.random() * filtered.length)];
                this.tcol = target.x;
                this.trow = target.y;
                return;
            }
        }

        // 入ってきたドアしか無い、またはlastXがない場合は適当に選ぶ
        const target = exits[Math.floor(Math.random() * exits.length)];
        this.tcol = target.x;
        this.trow = target.y;
    }

    // 旧メソッド (名前変更済み)
    continueChasingOld(level) {
        const tile = level.getTile(this.x, this.y);
        // ドア(+) または 通路(#) にいる場合のみ
        if (tile !== '+' && tile !== '#') return;

        const dirs = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        // ランダムにシャッフルして、毎回同じ方向ばかり選ばないようにする
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        for (let d of dirs) {
            const nx = this.x + d.x;
            const ny = this.y + d.y;

            // 直前の位置には戻らない
            if (this.lastX !== null && nx === this.lastX && ny === this.lastY) {
                continue;
            }

            const nextTile = level.getTile(nx, ny);
            // 通路(#) または ドア(+) へ進む
            if (nextTile === '#' || nextTile === '+') {
                this.tcol = nx;
                this.trow = ny;
                return;
            }
        }
    }

    // ターゲットに向かって移動
    moveToTarget(targetX, targetY, level, monsters = [], player = null) {
        const dx = Math.sign(targetX - this.x);
        const dy = Math.sign(targetY - this.y);

        // 移動に成功したら lastX/Y を更新するラッパー
        const tryMove = (newX, newY) => {
            if (this.canMoveTo(newX, newY, level, monsters, player)) {
                this.lastX = this.x;
                this.lastY = this.y;
                this.x = newX;
                this.y = newY;
                return true;
            }
            return false;
        };

        // まず斜め移動を試みる
        if (dx !== 0 && dy !== 0) {
            if (tryMove(this.x + dx, this.y + dy)) return;
        }

        // 斜めが無理ならX軸優先
        if (dx !== 0) {
            if (tryMove(this.x + dx, this.y)) return;
        }

        // Y軸を試す
        if (dy !== 0) {
            if (tryMove(this.x, this.y + dy)) return;
        }

        // どちらも無理なら...
        this.randomMove(level, monsters);
    }

    randomMove(level, monsters = []) {
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
        ];

        // 移動可能なマスをリストアップしてランダム選択
        const possibleMoves = [];

        for (const dir of directions) {
            const newX = this.x + dir.dx;
            const newY = this.y + dir.dy;
            if (this.canMoveTo(newX, newY, level, monsters)) {
                possibleMoves.push({ x: newX, y: newY });
            }
        }

        if (possibleMoves.length > 0) {
            const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            this.x = move.x;
            this.y = move.y;
        }
    }

    // 移動可能かチェック (monster.c mon_can_go() 移植)
    canMoveTo(x, y, level, monsters = [], player = null) {
        // 移動距離チェック（2マス以上は不可）
        const dr = Math.abs(this.y - y);
        const dc = Math.abs(this.x - x);
        if (dr >= 2 || dc >= 2) {
            return false;
        }

        // プレイヤーの位置には入らない
        if (player && x === player.x && y === player.y) {
            return false;
        }

        // 他のモンスターがいないかチェック
        if (monsters.some(m => m !== this && m.x === x && m.y === y)) {
            return false;
        }

        // 地形チェック
        if (!level.isWalkable(x, y)) {
            return false;
        }

        // 斜め移動でドアを通過しようとしている場合は不可
        // (monster.c mon_can_go: 斜め移動 AND (目的地 OR 現在地がドア) → NG)
        const isDiagonal = (this.x !== x && this.y !== y);
        if (isDiagonal) {
            const targetTile = level.getTile(x, y);
            const currentTile = level.getTile(this.x, this.y);
            if (targetTile === '+' || currentTile === '+') {
                return false;
            }
        }

        // TODO: SCARE_MONSTER 巻物のチェック（未実装）

        return true;
    }

    attack() {
        // ダメージ計算: 定義文字列をパース
        // "1d3" or "3d3/2d5" (multiple attacks)
        // 簡易実装として最初のダイスのみ使用
        let diceStr = this.damage;
        if (diceStr.includes('/')) {
            diceStr = diceStr.split('/')[0];
        }

        const parts = diceStr.split('d');
        if (parts.length === 2) {
            const count = parseInt(parts[0]);
            const faces = parseInt(parts[1]);
            let total = 0;
            for (let i = 0; i < count; i++) {
                total += Math.floor(Math.random() * faces) + 1;
            }
            return total;
        }
        return 1; // fallback
    }

    takeDamage(damage) {
        this.hp -= damage;
        // 攻撃を受けたら目を覚ます
        if (this.hasFlag(Monster.FLAGS.ASLEEP)) {
            this.removeFlag(Monster.FLAGS.ASLEEP);
        }
        // 擬態解除
        if (this.hasFlag(Monster.FLAGS.IMITATES)) {
            this.removeFlag(Monster.FLAGS.IMITATES);
            this.symbol = this.type;
        }
    }

    isDead() {
        return this.hp <= 0;
    }
}
