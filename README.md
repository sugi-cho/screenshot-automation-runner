# screenshot-automation-runner

Electronアプリ本体を改修せず、README用スクリーンショットを自動取得する共通CLIです。

## 前提
- Node.js 22 以上
- CDP 連携で実行する場合は、対象 Electron を `--remote-debugging-port=<port>` 付きで起動できること

## コマンド
- `node dist/src/cli/index.js validate -c <config>`
- `node dist/src/cli/index.js list-steps -c <config>`
- `node dist/src/cli/index.js run -c <config> [--project-root <path>] [--dry-run] [--verbose]`

## 開発時検証
1. `npm run build`
2. `npm test`
3. `npm run e2e:min`

## CI
- GitHub Actions: `.github/workflows/screenshot-capture.yml`
- matrix: `windows-latest` / `macos-latest`
- artifact 出力先: `docs/artifacts/**`

## サンプル設定
- `.sar/udp-obs-readme.json`
- `docs/examples/github-consumer-config.sample.json`

## GitHub経由で使う手順（他プロジェクト）
対象プロジェクト側に設定ファイル（例: `.sar/screenshot.json`）を置き、runnerを取得して実行します。

```powershell
# 1) 対象プロジェクトのルートへ移動
cd C:\path\to\your-electron-project

# 2) runner を tools 配下へ clone
git clone https://github.com/sugi-cho/screenshot-automation-runner.git .tools/screenshot-automation-runner

# 3) runner をビルド
npm --prefix .tools/screenshot-automation-runner ci
npm --prefix .tools/screenshot-automation-runner run build

# 4) 設定検証
node .tools/screenshot-automation-runner/dist/src/cli/index.js validate -c .sar/screenshot.json

# 5) dry-run
node .tools/screenshot-automation-runner/dist/src/cli/index.js run -c .sar/screenshot.json --project-root . --dry-run --verbose

# 6) 実撮影
node .tools/screenshot-automation-runner/dist/src/cli/index.js run -c .sar/screenshot.json --project-root . --verbose
```

## トラブルシュート
1. `CDP_CONNECT_FAILED (21)` になる
- `launch.command` に `--remote-debugging-port=<config.automation.cdpPort>` が含まれているか確認する
- そのポートが他プロセスで使用中でないか確認する
- `connectTimeoutMs` を短くしすぎていないか確認する

2. `INVALID_CONFIG (10)` になる
- `version: 1`、`launch`、`automation`、`output`、`scenario.steps` が定義されているか確認する
- `scenario.steps[].type` が `wait|click|input|key|screenshot` のいずれかであることを確認する
- まず `node dist/src/cli/index.js validate -c <config>` を実行し、表示されるパスを修正する

3. CI で `No files were found ... artifacts` と出る
- `run --project-root .` を付けて、`output.dir` の解決基準をリポジトリルートに揃える
- `output.dir` をリポジトリ外パスにしない
- 失敗時も `docs/artifacts/**` が出るよう、`run.jsonl` が生成されているか確認する

4. Windows / Mac で起動差異が出る
- `launch.type=command` の場合、`shell` は Windows で `powershell`、Mac で `bash` を使う
- `cwd` と `binary path` は絶対パスまたは `--project-root` 基準の相対パスで統一する
- パス区切りは設定で `/` を使い、実行時に解決させる
