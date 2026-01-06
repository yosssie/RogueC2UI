# Rogue Web 実装タスクリスト

## 重要: 参考リポジトリ
実装に迷ったり、仕様を確認したい場合は必ず以下を参照すること。
**https://github.com/suzukiiichiro/Rogue2.Official**
(特に `src/monster.c`, `src/init.c`, `src/fight.c` など)

---

## 現在の実装状況 (2026/01/06 更新)

### 最新の追加機能 (本日実装)
*   **ゲーム中デバッグモード**: `D`キーで切り替え（壁判定無効、全体表示、全モンスター表示）
*   **死亡時確認待ち**: 死亡メッセージ表示後、Aボタンで墓石画面へ遷移
*   **UI改善**: サブメニュー位置をインベントリパネルに合わせて調整
*   **モンスター発生修正**: `Monster.getRandomMonster` 静的メソッド実装、発生システム正常化

### 🟢 完了・実装済み（オリジナルRogue準拠）
*   **モンスターデータ**: 全26種 (HP, Exp, Level, Damage)
*   **モンスターAI**: `mon_sees()` 完全移植。部屋/隣接判定、斜め移動対応
*   **戦闘システム**: `hit.c` / `fight.c` 完全移植（命中、ダメージ、STR/武器補正）
*   **投擲システム**: `throw.c` 準拠（軌道計算、弓矢ボーナス）。外れたら落ちる処理も実装
*   **アイテム操作**:
    *   **拾う/使う/置く/投げる**: 基本動作実装済み
    *   **杖 (Wand)**: `zap.c` ほぼ移植完了（詳細な効果実装済み）
    *   **指輪 (Ring)**: `ring.c` データ移植完了（装備/解除UI含む）
    *   **スタック処理**: `pack.c` 準拠（矢などのスタック、武器の一括ドロップ、薬の個別ドロップ）
*   **アイテムデータ**: 武器、防具、薬、巻物、食料、杖、指輪の定義と識別名生成
*   **デバッグ環境**: デバッグレベル、アイテム配置、詳細ステータス表示
*   **ダンジョン・視界**: 3x3グリッド生成、視界透過処理
*   **空腹度**: 減算と状態変化、回復

### � 簡易実装・調整中
*   **罠 (Trap)**: `trap.c` データ定義は完了、配置と発動は簡易実装（落とし穴等はまだ）
*   **探索 (Search)**: `s`キー探索（隠し扉発見など）は未実装

### 🔴 未実装
*   **セーブ/ロード**: `save.c`
*   **スコア**: `score.c`
*   **階層移動時の保持**: 現状は階段を降りると完全に新しいレベルになる（モンスターやアイテムの状態保存が必要な場合があるか検討）

---

## 次の優先タスク



## アイテム効果と状態異常
- [x] プレイヤーの状態異常の実装 (Confused, Blind, Hallucination, etc.)
- [x] ターン経過による状態回復
- [x] アイテム使用効果の実装 (use.c相当)
    - [x] ポーション
        - [x] 回復 (Heal, Extra Heal), 筋力 (Gain/Restore, Poison), レベルアップ
        - [x] 状態異常付与 (Confused, Blind, Hallucination, Levitation, Haste, SeeInvisible)
        - [x] 怪物感知 (Detect Monster)
        - [ ] **未実装**: アイテム感知 (Detect Objects - マップ表示機能待ち)
    - [x] 巻物
        - [x] 識別, テレポート, 解呪, 睡眠, 恐怖(読む), 激怒, 金縛り
        - [x] 装備強化 (Enchant Weapon/Armor), 防具保護 (Protect Armor)
        - [ ] **未実装**: モンスター召喚 (Create Monster - 召喚ロジック待ち)
        - [ ] **未実装**: 地図作成 (Magic Mapping - マップ開示ロジック待ち)
- [x] スタック問題の修正 (識別状態に関わらずID一致でスタック)

## 杖 (Wand)
- [x] 杖の定義と出現 ('/')
- [x] 方向選択UIの実装 (Throw/Zap共通)
- [x] 杖の効果実装
    - [x] 瞬間移動 (Teleport Away)
    - [x] 鈍化 (Slow Monster), 加速 (Haste Monster)
    - [x] 混乱 (Confuse Monster), 睡眠 (Put to Sleep)
    - [x] 透明化 (Invisibility), 無効化 (Cancellation)
    - [x] 変身 (Polymorph)
    - [x] 魔法の矢 (Magic Missile)
    - [x] 何もしない (Do Nothing)
    - [ ] **未実装**: 照明 (Light), 生命力吸収 (Drain Life), 属性攻撃 (Cold/Fire/Lightning/Striking)

## モンスターAIと特殊能力
- [x] モンスターの特殊攻撃 (spechit.c相当)の実装
    - [x] 錆び攻撃 (Rust Armor - Aquator)
    - [x] 毒攻撃 (Sting - Rattlesnake)
    - [x] 生命力吸収 (Drain Life MaxHP - Vampire)
    - [x] 吸精 (Drop Level - Wraith)
    - [x] 盗み (Steal Gold/Item - Leprechaun, Nymph)
    - [x] 凍結 (Freeze - Ice Monster)
    - [x] 締め付け (Hold - Venus Flytrap)
- [x] デバッグモードでモンスターがスリープ状態で開始する
- [ ] モンスターの速度 (Hasted/Slowed) の行動回数への反映
*   [ ] 関連する薬・巻物の効果実装
*   [ ] `trap.c` の各罠の効果実装

### 3. 探索と隠し要素 (`search.c`)
*   [ ] 隠し扉 / 隠し通路の生成ロジック
*   [ ] 探索コマンド (`s`) の実装

### 4. UI/UX 改善
*   [x] ゲーム中デバッグモード（壁無視、全体表示、モンスター全表示）
*   [x] サブメニュー位置調整（インベントリパネルに合わせて配置）
*   [x] 死亡時の確認待ち（メッセージ表示後、Aボタンで墓石へ）
*   [ ] メッセージ履歴のログ表示機能
*   [ ] キーボード操作の完全化（viキーバインドなどの調整）

---

## オリジナルソースコード移植状況 (rogue-reference/src)

### ✅ 実装完了 (Implemented)
| ファイル | 内容 | 備考 |
| :--- | :--- | :--- |
| `monster.c` | モンスターAI | 完全移植 (視界判定 `isLineOfSight` 実装済み) |
| `init.c` | 初期化・生成 | 完全移植 (時間経過湧き `spawnWanderingMonster` 実装済み) |
| `random.c` | 乱数生成 | 完全移植 (`js/random.js` 32bit互換実装) |
| `object.c` | アイテム定義 | 完全移植 |
| `throw.c` | 投擲 | 完全移植 |
| `hit.c` / `fight.c` | 戦闘 | 完全移植 |
| `zap.c` | 杖 | 効果実装済み |
| `pack.c` | インベントリ | スタック処理実装済み |
| `move.c` | 移動 | 完全移植 (`one_move_rogue`, `multiple_move_rogue`, 斜め制限) |
| `play.c` | ゲーム進行 | レベルアップ処理(XPテーブル, HP上昇) 準拠 |

### 🚧 作業中 / 順次対応 (In Progress)
| ファイル | 内容 | 残タスク |
| :--- | :--- | :--- |
| `use.c` | アイテム効果 | 一部未実装 (マップ関連: `Magic Mapping`, `Detect Objects`) |
| `ring.c` | 指輪 | 効果計算ロジック連携待ち |
| `trap.c` | 罠 | 基本実装済み (各罠の効果詳細は一部Todo) |
| `spechit.c` | 特殊攻撃 | 実装済み |

### ✅ 実装完了 (Implemented) / 対応不要
| ファイル | 内容 | 備考 |
| :--- | :--- | :--- |
| `save.c` | セーブ | ユーザー要望により無効化 (不要) |
| `score.c` | スコア | 簡易実装 (所持金スコア、オンメモリ保存) |

### ❌ 未対応 (Not Started)
| ファイル | 内容 |
| :--- | :--- |
| `search.c` | 探索 |
