## 概要
アプリ起動・停止と自動化アダプタ接続の責務を分離実装する。

## 対応タスク
- T008 プロセスマネージャ実装
- T009 クリーンアップ実装
- T010 Playwright CDP接続
- T011 Viewport/接続待機

## 完了条件
- `launch.command` / `launch.binary` の起動経路が実装される
- 異常終了時でも cleanup が必ず呼ばれる
- adapter 接続失敗時に `21` を返す
- `npm run build`, `npm test`, `npm run e2e:min` が成功する
