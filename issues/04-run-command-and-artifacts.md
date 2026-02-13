## 概要
`sar run` を統合し、ログとアーティファクト保存を実装する。

## 対応タスク
- T019 ログ基盤
- T020 失敗時アーティファクト
- T021 `sar run` 統合
- T022 `sar list-steps`
- T023 `--dry-run`

## 完了条件
- `sar run -c <config>` が実行できる
- 失敗時に artifacts 配下へスクショ/JSONLが出力される
- `sar list-steps` でステップ一覧が出力される
- `npm run build`, `npm test`, `npm run e2e:min` が成功する
