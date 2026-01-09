# ダンジョン生成処理のオリジナル準拠化

## 📋 実装計画

### 現状の問題点
現在のrogueC2UIのダンジョン生成は、オリジナルRogueと比較して以下の点で異なっている:

1. **グリッド定数が動的計算** → オリジナルは固定値 (`ROW1=7, ROW2=15, COL1=26, COL2=52`)
2. **通路描画が1回のみ** → オリジナルは4%の確率で繰り返し描画
3. **隠し通路の生成がない** → オリジナルは`hide_boxed_passage()`で通路の一部を隠す
4. **迷路生成がない** → オリジナルは`add_mazes()`で`R_NOTHING`の部屋を迷路に変換
5. **デッドエンド生成がない** → オリジナルは`fill_out_level()`で`R_NOTHING`や`R_CROSS`を`R_DEADEND`に変換

### 実装手順

#### Phase 1: 定数の修正
- [ ] `ROW1`, `ROW2`, `COL1`, `COL2`を固定値に変更
- [ ] `MIN_ROW`を1に設定(メッセージライン用)

#### Phase 2: `connect_rooms`の修正
- [ ] 通路描画を4%の確率で繰り返すように修正
  ```javascript
  do {
      draw_simple_passage(row1, col1, row2, col2, dir);
  } while (Math.random() < 0.04);
  ```

#### Phase 3: `hide_boxed_passage`の実装
- [ ] 通路の一部を隠す処理を実装
- [ ] `HIDE_PERCENT` (12%)の確率で隠し通路を生成

#### Phase 4: `add_mazes`の実装
- [ ] `R_NOTHING`の部屋を迷路に変換する処理を実装
- [ ] `make_maze`関数を実装(再帰的迷路生成)
- [ ] レベルに応じた迷路生成確率の調整

#### Phase 5: `fill_out_level`の実装
- [ ] `R_NOTHING`や`R_CROSS`の部屋を`R_DEADEND`に変換
- [ ] `fill_it`関数を実装
- [ ] `recursive_deadend`関数を実装

#### Phase 6: その他の細かい調整
- [ ] `put_door`の隠しドア判定を`HIDE_PERCENT`に変更
- [ ] `mix_random_rooms`の実装(ランダム部屋順序のシャッフル)

### オリジナルのアルゴリズム概要

```
make_level() {
    1. 必須部屋を決定 (must_exist1, must_exist2, must_exist3)
    2. 各部屋を生成 (make_room)
    3. 迷路を追加 (add_mazes)
    4. ランダム順序で部屋を接続 (connect_rooms)
       - 右隣 (i+1)
       - 下隣 (i+3)
       - 2つ飛ばし (i+2, i+6) ※間の部屋がR_NOTHINGの場合
    5. 空き部屋を埋める (fill_out_level)
       - R_NOTHINGやR_CROSSをR_DEADENDに変換
       - 再帰的に通路を伸ばす
}
```

### 参考: オリジナルの定数

```c
#define ROW1 7
#define ROW2 15
#define COL1 26
#define COL2 52
#define MIN_ROW 1
#define HIDE_PERCENT 12

#define ROGUE_LINES 24
#define ROGUE_COLUMNS 80
```

### 実装優先度

1. **Phase 1 & 2**: 定数修正と通路繰り返し描画 (基本的な見た目の改善)
2. **Phase 3**: 隠し通路の実装 (探索要素の追加)
3. **Phase 4 & 5**: 迷路とデッドエンド生成 (ダンジョンのバリエーション増加)
4. **Phase 6**: 細かい調整

## 🎯 期待される効果

- オリジナルRogueと同等のダンジョン生成
- より複雑で探索しがいのあるダンジョン
- 迷路やデッドエンドによるバリエーションの増加
- 隠し通路による探索要素の追加
