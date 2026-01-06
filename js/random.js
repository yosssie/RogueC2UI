// ===========================
// 乱数生成 (random.c 移植)
// ===========================

export class RogueRandom {
    constructor(seed = null) {
        // random.c rntb[]
        this.rntb = [
            3, 0x9a319039, 0x32d9c024, 0x9b663182, 0x5da1f342,
            0xde3b81e0, 0xdf0a6fb5, 0xf103bc02, 0x48f340fb, 0x7449e56b,
            0xbeb1dbb0, 0xab5c5918, 0x946554fd, 0x8c2e680f, 0xeb3d799f,
            0xb11ee0b7, 0x2d436b86, 0xda672e2a, 0x1588ca88, 0xe369735d,
            0x904f35f7, 0xd7158fd6, 0x6fa6f051, 0x616e6b96, 0xac94efdc,
            0x36413f93, 0xc622c298, 0xf5a42ab8, 0x8a88d77b, 0xf5ad9d0e,
            0x8999220b, 0x27fb47b9
        ];

        this.randType = 3;
        this.randDeg = 31;
        this.randSep = 3;

        // pointers as indices
        this.fptrIdx = 4;
        this.rptrIdx = 1;
        this.state = [...this.rntb]; // copy of rntb starting at index 0 (which is unused/padding in C somewhat?)
        // In C: static long *state = &rntb[1]; -> state[0] is rntb[1]
        // But let's manage state as a 0-indexed array of size 32, using strict indices.
        // Actually, C code: state = &rntb[1], fptr = &rntb[4] => fptr is state[3]
        // Let's adjust to match C logic:
        // state array will hold the values. we will use 0-based index relative to 'state'.

        // Re-mapping C logic to JS array:
        // rntb size 32.
        // state points to rntb[1]. So state[0] is rntb[1].
        // fptr points to rntb[4]. So fptr is state[3].
        // rptr points to rntb[1]. So rptr is state[0].
        // end_ptr points to rntb[32]. So end_ptr is state[31].
        // state size is 31 (rntb[1] to rntb[31]).

        this.state = new Int32Array(31);
        for (let i = 0; i < 31; i++) {
            this.state[i] = this.rntb[i + 1];
        }

        this.fptr = 3;
        this.rptr = 0;

        if (seed !== null) {
            this.srrandom(seed);
        } else {
            // Default seed (current time equivalent)
            this.srrandom(Math.floor(Date.now() / 1000));
        }
    }

    // srrandom(int x)
    srrandom(x) {
        this.state[0] = x;
        if (this.randType !== 0) {
            for (let i = 1; i < this.randDeg; i++) {
                // state[i] = 1103515245L * state[i - 1] + 12345;
                // JS integer multiplication might lose precision for large numbers > 2^53
                // But we need 32bit wrapping.
                // Math.imul gives 32bit result of multiplication.
                const prev = this.state[i - 1];
                this.state[i] = (Math.imul(1103515245, prev) + 12345) | 0;
            }
            this.fptr = this.randSep;
            this.rptr = 0;
            for (let i = 0; i < 10 * this.randDeg; i++) {
                this.rrandom();
            }
        }
    }

    // rrandom(void)
    rrandom() {
        let val;
        if (this.randType === 0) {
            // state[0] = (state[0] * 1103515245L + 12345) & 0x7fffffffL;
            const s = this.state[0];
            const next = (Math.imul(s, 1103515245) + 12345) | 0;
            this.state[0] = next;
            val = next & 0x7fffffff;
        } else {
            // *fptr += *rptr;
            // i = (*fptr >> 1) & 0x7fffffffL;

            const fVal = this.state[this.fptr];
            const rVal = this.state[this.rptr];

            const nextVal = (fVal + rVal) | 0; // 32bit add
            this.state[this.fptr] = nextVal;

            val = (nextVal >> 1) & 0x7fffffff;

            // Increment pointers
            this.fptr++;
            if (this.fptr >= 31) { // >= end_ptr relative to state
                this.fptr = 0;
                this.rptr++;
            } else {
                this.rptr++;
                if (this.rptr >= 31) {
                    this.rptr = 0;
                }
            }
        }
        return val; // always positive 0 to 0x7fffffff
    }

    // get_rand(int x, int y)
    getRand(x, y) {
        let min = x;
        let max = y;
        if (x > y) {
            min = y;
            max = x;
        }

        let lr = this.rrandom();
        lr &= 0x00007fff; // 下位15bitのみ使用 (Rogue仕様)

        const r = (lr % ((max - min) + 1)) + min;
        return r;
    }

    // rand_percent(int percentage)
    randPercent(percentage) {
        return this.getRand(1, 100) <= percentage;
    }

    // coin_toss(void)
    coinToss() {
        // ((rrandom() & 01) ? 1 : 0)
        return (this.rrandom() & 1) ? true : false;
    }
}
