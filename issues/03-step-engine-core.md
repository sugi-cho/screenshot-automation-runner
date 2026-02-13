## 概要
Step実行エンジンと各executorを実装する。

## 対応タスク
- T012 Step実行基盤
- T013 Wait step
- T014 Click/Input/Key
- T015 Screenshot
- T016 Retry/Timeout
- T017 条件分岐（when/onError）
- T018 startupWait

## 完了条件
- wait/click/input/key/screenshot が順次実行される
- retry/timeout がstep単位で機能する
- `onError: continue` と `when` が機能する
- `npm run build`, `npm test`, `npm run e2e:min` が成功する
