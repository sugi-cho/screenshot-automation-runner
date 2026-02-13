# screenshot-automation-runner

Electronアプリ本体を改修せず、README用スクリーンショットを自動取得する共通CLIです。

## コマンド
- `node dist/src/cli/index.js validate -c <config>`
- `node dist/src/cli/index.js list-steps -c <config>`
- `node dist/src/cli/index.js run -c <config> [--dry-run] [--verbose]`

## 開発時検証
1. `npm run build`
2. `npm test`
3. `npm run e2e:min`

## サンプル設定
- `.sar/udp-obs-readme.json`

## Issue登録
`gh auth login` 後に以下を実行:

```powershell
pwsh ./scripts/create-issues.ps1 -Repo <owner/repo>
```
