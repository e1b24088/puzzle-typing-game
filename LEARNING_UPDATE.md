# 学習につながるゲームへの更新

## 導入

TitleView.vue、style.css、Docker設定、Java側は更新しません。
変更するのはゲーム2画面、統合用App、科目データ、ロジック、テスト。裏側の説明画面を追加します。
作業ブランチ内でgit statusを確認し、ZIPをDownloadsに保存してプロジェクトのPowerShellで実行します。

```powershell
$learningBackup = Join-Path $env:TEMP ('puzzle-learning-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $learningBackup
Copy-Item frontend\src -Destination $learningBackup -Recurse
Copy-Item frontend\tests -Destination $learningBackup -Recurse
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\puzzle-typing-game-learning-update.zip" -DestinationPath . -Force
Copy-Item frontend\src\App.integration.vue -Destination frontend\src\App.vue -Force
docker compose up -d
docker compose exec frontend npm run build
docker compose exec frontend node --test tests/gameLogic.test.js
```

http://localhost:5173 で確認します。App.integration.vueをApp.vueへコピーして初めて統合が有効になります。
独自の変更はバックアップから必要に応じて戻してください。

## 改善したこと

- タイトルの重複見出しと開発用API表示を除去。API確認結果は裏側の画面へ。
- タイトルの余白・ボタン間隔を縮小。画面遷移時にスクロールを先頭へ戻す。
- 科目24件。正式な授業名ではなく内容の見本。
- プルダウンを廃止。コマを選び、右パネルから科目を選択。画面幅900px以下では下に表示。
- 科目検索・分野フィルター・授業の説明・このゲームとの関係を表示。
- 固定科目と登録済み科目は別コマで選択不可。変更・解除後は他のコマで再使用可能。
- 採点側でも重複を除外。
- 結果に関連科目のひとこと学習。直前と同じ文章を避ける。
- タイピングに科目名・用語の意味・ゲームとの関係を表示。
- 24科目に用語1問と文章1問ずつ。通しプレイは選択科目のみ。
- 正確率・正解文字/分・ノーミス連続問題数で文章チャレンジを解放。
- 結果から、入力した用語を振り返れる。
- 開発の裏側を説明する画面を追加。

## 仮仕様

- 正式科目名、属性、固定科目、開講コマ、単位、クリア点はシラバスと要照合。
- 仮時間割は全科目を各コマの候補にする。実際の履修登録の再現ではない。
- 元のクリア点12・10・10、全属性ボーナス10を維持。重複なしでも達成可能。
- 得点は属性点合計＋ボーナス。超過点だけを得点にする方式は未採用。
- 単位90秒、タイピング60秒。説明・結果閲覧を含む3分は実機で調整。
- 文章は開始10秒経過・3問連続ノーミス・正確率90%以上・正解90文字/分以上を満たした問題完了時に解放。
- 解放後は4問ごとに文章。表示の␣は空白入力。得点は1入力1点。
- 条件はgameData.jsonのsettings.sentenceChallengeで変更。
- ミス表示は仮の赤枠と文章。shi/siなど別ローマ字入力は未対応。
- DB・保存・ランキングは未実装。

## 実機チェック

1. 展示PCの解像度と拡大率でタイトルの全ボタンが見えるか。
2. 3ルートの遷移、固定科目、二重履修、解除後の再選択。
3. タイピングの科目名が履修科目に含まれるか。
4. 誤入力で得点・位置が進まないか。IMEはオフ。
5. 文章問題、空白入力、時間切れ、結果、再プレイ。
6. ひとこと学習の関連性と実際の授業内容。

## 検証範囲

ロジックテスト10件とVue/Vite統合ビルド成功。タイトルは代替コンポーネントで検証。
Chromium取得に失敗したため、視覚・実ブラウザ操作は未検証。
JavaとDockerは既存環境を利用。バックエンドは従来のhealth確認のみ。
