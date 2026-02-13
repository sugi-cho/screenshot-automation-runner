# screenshot-automation-runner 開発仕様書（MVP→拡張）

## 1. 背景とゴール
- 背景  
Electron アプリの README 用スクリーンショット作成を手作業で行うと、再現性が低く工数が高いです。  
各アプリ本体に撮影用コードを入れる方式は保守負荷が増えるため避けます。
- ゴール  
`Node.js + TypeScript` 製の共通 CLI で、**アプリ本体改修なし**にスクリーンショットを自動生成します。  
設定ファイルのみを各プロジェクト側に持ち、Windows/Mac のローカル実行と GitHub Actions 実行を両立します。
- 前提（合理的補完）  
対象アプリは既存 UI 上で識別可能な `selector` または `text` を持つものとします。  
Electron へは起動コマンドで `--remote-debugging-port` を渡せる前提とします（不可の場合は拡張で Desktop 操作アダプタを追加）。

## 2. スコープ（MVP / 非スコープ）
| 区分 | 内容 |
|---|---|
| MVP | 設定ファイル読込、バリデーション、アプリ起動（command/binary）、wait/click/input/key/screenshot 実行、失敗時アーティファクト保存、終了コード、ログ、リトライ、タイムアウト、プロセスクリーンアップ |
| MVP | `playwright-cdp` アダプタ（Electron レンダラー DOM 操作） |
| MVP | README 用の連番命名と出力先制御 |
| 非スコープ | OCR/画像認識ベース操作、動画録画、画像差分承認フロー、アプリ内部 API 連携 |
| 拡張 | 条件分岐ステップ（if/else）、複数シナリオ並列、プラグイン式アダプタ、リモート実行レポート |

## 3. 全体アーキテクチャ
- 構成要素  
`CLI`、`Config Loader/Validator`、`Process Manager`、`Automation Adapter`、`Step Engine`、`Artifact Manager`、`Logger`。
- 実行フロー  
1. CLI が設定ファイルを読込・スキーマ検証  
2. Process Manager が対象アプリを起動  
3. Adapter が CDP 接続しページハンドル取得  
4. Step Engine が steps を順次実行（wait/retry/timeout/when）  
5. screenshot step で命名規則に従って保存  
6. 失敗時は fail スクショ・ログ・エラーコードを出力  
7. 最後に必ず子プロセスを終了（正常/異常共通）

## 4. ディレクトリ構成案
```text
screenshot-automation-runner/
  src/
    cli/
      index.ts
      commands/
        run.ts
        validate.ts
    config/
      schema.ts
      load.ts
      validate.ts
    launcher/
      process-manager.ts
    adapter/
      playwright-cdp.ts
      types.ts
    engine/
      step-engine.ts
      step-executors/
        click.ts
        input.ts
        key.ts
        wait.ts
        screenshot.ts
    logging/
      logger.ts
      error-codes.ts
    artifacts/
      artifact-manager.ts
    utils/
      retry.ts
      timeout.ts
      naming.ts
      cleanup.ts
  schemas/
    runner-config.schema.json
  test/
    unit/
    integration/
    e2e/
  bin/
    sar.js
```

## 5. 設定ファイルスキーマ（TypeScript 型定義）
```ts
export type LaunchConfig =
  | {
      type: "command";
      command: string;          // 例: "npm run dev:electron -- --remote-debugging-port=9222"
      cwd?: string;
      env?: Record<string, string>;
      shell?: "powershell" | "bash";
    }
  | {
      type: "binary";
      executable: string;       // 例: "/Applications/MyApp.app/Contents/MacOS/MyApp"
      args?: string[];
      cwd?: string;
      env?: Record<string, string>;
    };

export type WaitCondition =
  | { kind: "windowTitle"; contains: string }
  | { kind: "text"; contains: string; selector?: string }
  | { kind: "selector"; selector: string; state?: "attached" | "visible" | "hidden" | "detached" }
  | { kind: "timeout"; ms: number };

export type ConditionExpr =
  | { op: "exists"; selector: string }
  | { op: "textContains"; text: string; selector?: string }
  | { op: "not"; expr: ConditionExpr };

export type RetryPolicy = {
  attempts: number;             // 1以上
  intervalMs: number;           // 待機間隔
  backoff?: "fixed" | "exponential";
};

export type BaseStep = {
  id: string;
  timeoutMs?: number;
  retry?: RetryPolicy;
  when?: ConditionExpr;         // false の場合 step を skip
  onError?: "abort" | "continue";
};

export type Step =
  | (BaseStep & { type: "wait"; until: WaitCondition })
  | (BaseStep & { type: "click"; selector: string; button?: "left" | "right"; clickCount?: number })
  | (BaseStep & { type: "input"; selector: string; value: string; clear?: boolean })
  | (BaseStep & { type: "key"; keys: string[] }) // 例: ["Control", "A"]
  | (BaseStep & { type: "screenshot"; name: string; fullPage?: boolean });

export type Scenario = {
  name: string;
  description?: string;
  startupWait?: WaitCondition[];
  steps: Step[];
  outputDir?: string;
};

export type RunnerConfig = {
  version: 1;
  project: string;
  launch: LaunchConfig;
  automation: {
    adapter: "playwright-cdp";
    cdpPort: number;
    connectTimeoutMs: number;
    viewport: { width: number; height: number };
    headless?: boolean;
  };
  output: {
    dir: string; // 例: "docs/screenshots"
    fileNameTemplate: "{index:02}-{name}.png";
    overwrite: boolean;
  };
  defaults?: {
    stepTimeoutMs?: number;
    retry?: RetryPolicy;
    globalTimeoutMs?: number;
  };
  scenario: Scenario;
};
```

### UDP-OBS-Rec-and-Play-Tool 向けサンプル設定（YAML）
```yaml
version: 1
project: UDP-OBS-Rec-and-Play-Tool

launch:
  type: command
  command: npm run dev:electron -- --remote-debugging-port=9222
  cwd: ../UDP-OBS-Rec-and-Play-Tool
  shell: powershell
  env:
    NODE_ENV: development

automation:
  adapter: playwright-cdp
  cdpPort: 9222
  connectTimeoutMs: 30000
  viewport:
    width: 1280
    height: 1280
  headless: false

output:
  dir: docs/screenshots
  fileNameTemplate: "{index:02}-{name}.png"
  overwrite: true

defaults:
  stepTimeoutMs: 10000
  retry:
    attempts: 2
    intervalMs: 800
    backoff: fixed
  globalTimeoutMs: 180000

scenario:
  name: readme-main
  startupWait:
    - kind: windowTitle
      contains: UDP-OBS
    - kind: selector
      selector: "role=tab[name='PLAY']"
      state: visible
  steps:
    - id: s01
      type: screenshot
      name: play-initial

    - id: s02
      type: click
      selector: "role=button[name='PRELOAD']"

    - id: s03
      type: wait
      until:
        kind: text
        contains: PRELOADED

    - id: s04
      type: screenshot
      name: play-preloaded

    - id: s05
      type: click
      selector: "role=button[name='PLAY']"
      onError: continue

    - id: s06
      type: wait
      until:
        kind: text
        contains: PLAYING
      onError: continue

    - id: s07
      type: screenshot
      name: play-playing
      onError: continue

    - id: s08
      type: click
      selector: "role=tab[name='REC']"

    - id: s09
      type: wait
      until:
        kind: selector
        selector: "text=REC"
        state: visible

    - id: s10
      type: screenshot
      name: rec-initial
```

## 6. CLI仕様（コマンド、引数、終了コード）
- コマンド  
`sar run -c <config> [--scenario <name>] [--project-root <path>] [--dry-run] [--verbose]`  
`sar validate -c <config>`  
`sar list-steps -c <config>`
- 主な引数  
`-c, --config`: 設定ファイルパス（必須）  
`--scenario`: 将来複数シナリオ対応時に使用（MVP では単一でも受理）  
`--project-root`: 相対パス解決の基準  
`--dry-run`: 実操作せず解決結果のみ確認  
`--verbose`: 詳細ログ
- 終了コード  
`0`: 成功  
`10`: 設定ファイル不正  
`20`: アプリ起動失敗  
`21`: CDP接続失敗/タイムアウト  
`30`: wait タイムアウト  
`31`: step 実行失敗  
`32`: screenshot 保存失敗  
`40`: クリーンアップ失敗  
`50`: 予期しない例外

## 7. ステップ実行エンジン仕様（待機・再試行・分岐）
- 実行順  
設定順に逐次実行。並列実行は拡張扱い。
- 待機  
`wait` step は `until` 条件を評価。`timeoutMs` 超過で失敗。  
`windowTitle/text/selector/timeout` を統一 API で処理。
- 再試行  
step 単位で `retry.attempts` 回まで再試行。  
待機間隔は `intervalMs`、`exponential` の場合 `intervalMs * 2^(n-1)`。
- 分岐（MVP）  
`when` が false の step は `skipped`。  
`onError: continue` は失敗しても次へ進む。  
`onError: abort` は即時終了（既定値）。
- 分岐（拡張）  
`if` step（then/else steps）を追加可能な設計にする（Step Union 追加で実現）。

## 8. エラーハンドリングとログ設計
- ログ形式  
標準出力は人間向け、`artifacts/<runId>/run.jsonl` は機械可読。  
1行1イベントで `timestamp, level, runId, stepId, event, durationMs, errorCode` を記録。
- 失敗時アーティファクト  
`artifacts/<runId>/failed/<stepId>.png`  
`artifacts/<runId>/failed/<stepId>.html`（取得可能な場合）  
`artifacts/<runId>/run.jsonl`
- クリーンアップ  
正常/異常ともに `finally` で子プロセス終了。  
Windows: `taskkill /T /F /PID`、Mac: プロセスグループ kill。  
ポート解放確認を最大5秒待機し、失敗時は exit code `40`。

## 9. テスト戦略（unit/e2e/CI）
- Unit  
設定バリデーション、命名テンプレート、retry/backoff、timeout、error code マッピング。
- Integration  
モック UI（Playwright で起動する簡易 HTML）に対して step 実行検証。
- E2E  
サンプル対象（UDP-OBS-Rec-and-Play-Tool）で `run` を実行し、期待ファイル4枚以上生成を確認。
- CI  
`validate` と `unit/integration` は毎 PR。  
`e2e` は `workflow_dispatch` と `main` へのマージ時に実行。

## 10. GitHub Actions実行例（artifact保存まで）
```yaml
name: screenshot-capture

on:
  workflow_dispatch:
  push:
    branches: [ main ]
    paths:
      - ".sar/**"
      - ".github/workflows/screenshot-capture.yml"

jobs:
  capture:
    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npx playwright install chromium

      - name: Run screenshot runner
        run: npx sar run -c .sar/udp-obs-readme.yaml --verbose

      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        with:
          name: screenshots-${{ matrix.os }}
          path: |
            docs/screenshots/**
            artifacts/**
```

## 11. セキュリティと運用上の注意
- 設定ファイルは「信頼済みリポジトリのみ」で実行します（任意コマンド実行を含むため）。
- `env` の機密値はログにマスクし、標準出力へ平文出力しません。
- 出力先パスはプロジェクト配下に正規化し、パストラバーサルを拒否します。
- CI 実行時は専用ブランチ/権限制限されたトークンを使用します。
- README 用撮影前に個人情報や API キーが UI に表示されないことをチェックします。

## 12. 受け入れ基準（Given/When/Then）
1. Given 正しい設定ファイルがある When `sar validate` を実行 Then exit code が `0` になる。  
2. Given 必須項目欠落の設定 When `sar validate` を実行 Then exit code `10` とエラー箇所が表示される。  
3. Given `launch.type=command` 設定 When `sar run` 実行 Then 対象アプリが起動される。  
4. Given `startupWait` が満たされる UI When 実行 Then step 実行が開始される。  
5. Given `wait.selector` が timeout 超過 When 実行 Then exit code `30` と失敗スクショが保存される。  
6. Given `onError=continue` の step When step が失敗 Then 後続 step が継続実行される。  
7. Given screenshot step が4件ある When 実行成功 Then `01-...` から `04-...` の PNG が出力される。  
8. Given `fileNameTemplate` を設定 When 実行 Then 指定テンプレートで命名される。  
9. Given step に retry 設定がある When 一時失敗が発生 Then 指定回数で再試行される。  
10. Given 実行中に例外が発生 When run が終了 Then 子プロセスが残らず終了する。  
11. Given `--dry-run` 実行 When コマンド実行 Then step 解決のみ行いスクショは生成しない。  
12. Given GitHub Actions 実行 When job 成功 Then `docs/screenshots` と `artifacts` が artifact として保存される。

## 13. 実装優先順位（1週間計画）
1. Day 1: CLI 骨格、設定読込、スキーマバリデーション、終了コード定義。  
2. Day 2: Process Manager（command/binary 起動・停止）、timeout、cleanup 実装。  
3. Day 3: Playwright CDP アダプタ、viewport 適用、基本 wait 実装。  
4. Day 4: step engine（click/input/key/wait/screenshot）、retry、onError、when 実装。  
5. Day 5: ログ/アーティファクト設計実装、失敗時スクショと JSONL 出力。  
6. Day 6: unit/integration テスト整備、UDP-OBS 向けサンプル設定で e2e 検証。  
7. Day 7: GitHub Actions 作成、README（利用手順・トラブルシュート）整備、MVP リリースタグ作成。  

以上で、MVP を1週間で実装可能な粒度に落とし込み、拡張余地を残した仕様になります。
