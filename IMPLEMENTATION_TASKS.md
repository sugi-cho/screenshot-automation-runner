# screenshot-automation-runner 実装タスク分解

## 1. 進め方
1. タスクは `MVP 完了` を最短にする順で並べる。
2. 各タスクは `1 PR = 1〜2 タスク` を目安に実施する。
3. 完了条件を満たしたら次タスクへ進む。

## 2. タスク一覧（MVP）
| ID | タスク | 主な実装内容 | 成果物 | 依存 | 見積 |
|---|---|---|---|---|---|
| T001 | プロジェクト初期化 | TypeScript, ビルド, lint, test の土台作成 | `package.json`, `tsconfig.json`, `src/` 雛形 | なし | 0.5日 |
| T002 | CLI エントリ作成 | `sar` コマンドと `run/validate/list-steps` の雛形実装 | `src/cli/index.ts` | T001 | 0.5日 |
| T003 | 終了コード定義 | 仕様書の終了コードを enum 化し共通利用 | `src/logging/error-codes.ts` | T001 | 0.25日 |
| T004 | 設定スキーマ定義 | RunnerConfig の JSON Schema と TS 型を整備 | `schemas/runner-config.schema.json`, `src/config/schema.ts` | T001 | 0.5日 |
| T005 | 設定ロード実装 | YAML/JSON 読込、相対パス解決、環境変数展開 | `src/config/load.ts` | T004 | 0.5日 |
| T006 | 設定バリデーション実装 | AJV 等で検証し、エラー位置を人間可読化 | `src/config/validate.ts` | T004, T005 | 0.5日 |
| T007 | `sar validate` 実装 | validate コマンドで schema チェック実行 | `src/cli/commands/validate.ts` | T002, T006 | 0.25日 |
| T008 | プロセスマネージャ実装 | `command/binary` 起動、PID管理、stdout/stderr 収集 | `src/launcher/process-manager.ts` | T001 | 0.75日 |
| T009 | クリーンアップ実装 | Windows/Mac の子プロセス終了と例外時 finally | `src/utils/cleanup.ts` | T008 | 0.5日 |
| T010 | Playwright CDP 接続 | `--remote-debugging-port` へ接続、ページ取得 | `src/adapter/playwright-cdp.ts` | T008 | 0.75日 |
| T011 | Viewport/接続待機 | viewport 適用、接続タイムアウト処理 | `src/adapter/playwright-cdp.ts` | T010 | 0.5日 |
| T012 | Step 実行基盤 | StepContext, 実行ループ, 実行結果モデル | `src/engine/step-engine.ts` | T003, T006, T010 | 0.75日 |
| T013 | Wait step 実装 | `windowTitle/text/selector/timeout` の待機実装 | `src/engine/step-executors/wait.ts` | T012 | 0.75日 |
| T014 | Click/Input/Key 実装 | UI 操作 3 種の executor 実装 | `click.ts`, `input.ts`, `key.ts` | T012 | 0.75日 |
| T015 | Screenshot 実装 | 命名テンプレート解決、PNG 保存、上書き制御 | `screenshot.ts`, `src/utils/naming.ts` | T012 | 0.75日 |
| T016 | Retry/Timeout 共通化 | step 単位 retry/backoff/timeout wrapper | `src/utils/retry.ts`, `src/utils/timeout.ts` | T012 | 0.5日 |
| T017 | 条件分岐（MVP 範囲） | `when` と `onError(continue/abort)` 実装 | `src/engine/step-engine.ts` | T012, T016 | 0.5日 |
| T018 | startupWait 実装 | シナリオ開始前待機の評価 | `src/engine/step-engine.ts` | T013 | 0.25日 |
| T019 | ログ基盤実装 | console + JSONL の二重出力 | `src/logging/logger.ts` | T003 | 0.5日 |
| T020 | 失敗時アーティファクト | 失敗スクショ/HTML/JSONL の保存 | `src/artifacts/artifact-manager.ts` | T015, T019 | 0.5日 |
| T021 | `sar run` 統合 | 起動→接続→steps→終了まで接続 | `src/cli/commands/run.ts` | T007〜T020 | 0.75日 |
| T022 | `sar list-steps` 実装 | 設定から steps 一覧を出力 | `src/cli/commands/list-steps.ts` | T006 | 0.25日 |
| T023 | `--dry-run` 実装 | 実操作なしの検証実行 | `run.ts`, `step-engine.ts` | T021 | 0.25日 |
| T024 | Unit テスト実装 | config, naming, retry, timeout, error code | `test/unit/*` | T003〜T017 | 1.0日 |
| T025 | Integration テスト実装 | モック UI で step 実行の結合テスト | `test/integration/*` | T013〜T021 | 1.0日 |
| T026 | UDP-OBS サンプル設定 | README 用 4 画面を撮る YAML 提供 | `.sar/udp-obs-readme.yaml` | T006, T021 | 0.5日 |
| T027 | GitHub Actions 作成 | Win/Mac 実行、artifact upload | `.github/workflows/screenshot-capture.yml` | T021, T024, T025 | 0.75日 |
| T028 | README/運用ドキュメント | 使い方、失敗時調査、既知制約を明記 | `README.md`, `docs/*` | T021, T027 | 0.5日 |

## 3. 拡張タスク（MVP後）
| ID | タスク | 内容 | 見積 |
|---|---|---|---|
| X001 | `if/else` step | Step Union に条件分岐ブロックを追加 | 1.0日 |
| X002 | Adapter プラグイン化 | CDP 以外の自動化手段を差し替え可能にする | 1.5日 |
| X003 | 複数シナリオ実行 | config で scenario 配列対応、順次実行 | 1.0日 |
| X004 | 実行レポート生成 | HTML サマリ（成功率、失敗step、添付画像） | 1.0日 |
| X005 | 画像差分検証 | 既存スクショとの差分チェック機能 | 1.5日 |

## 4. Definition of Done（共通）
1. 実装コードに型エラーがない。
2. 対象タスクに対応するテストが追加され、ローカルで通過する。
3. エラー時の終了コードが仕様通りである。
4. ログに `runId` と `stepId` が出る。
5. 例外系でもプロセスが残留しない。
6. ドキュメント更新が PR に含まれる。

## 5. 1週間実行計画（タスク対応）
1. Day 1: T001〜T007
2. Day 2: T008〜T011
3. Day 3: T012〜T018
4. Day 4: T019〜T023
5. Day 5: T024
6. Day 6: T025〜T026
7. Day 7: T027〜T028

## 6. 推奨チケット分割（PR単位）
1. PR-1: T001〜T007
2. PR-2: T008〜T011
3. PR-3: T012〜T018
4. PR-4: T019〜T023
5. PR-5: T024〜T026
6. PR-6: T027〜T028
