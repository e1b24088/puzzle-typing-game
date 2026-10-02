# ゲームバランス・説明・結果画面 更新

- 長文を含む全問題のローマ字から半角空白を削除。文章も続けて入力する。
- 単位ゲームの選択科目は18種類＋固定2種類。各選択科目が複数の時間に登場する。
- 各コマ3候補は維持。ただし属性の組み合わせは「技術2・管理1」「管理2・戦略1」「戦略2・技術1」。毎回全属性を選べない。
- 同一科目の重複不可、固定、解除・選び直しを維持。全属性クリアが可能な割り当てを探索するテストで確認。
- 単位リザルトに成績表、達成度バー、目標超過・不足単位、次の作戦、登録科目一覧を追加。
- 両ゲームの説明を目標→3手順→注意点→終了条件の順に整理。文章問題の解放条件も開いて読める。
- 以前のコンパクト画面、裏側図解、リザルトでのタイピング復習も含む。

## 適用：プロジェクト直下のPowerShell
Docker Desktopを起動し、ZIPをDownloadsに保存する。

```powershell
$balanceBackup = Join-Path $env:TEMP ('puzzle-balance-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $balanceBackup
Copy-Item frontend\src -Destination $balanceBackup -Recurse
Copy-Item frontend\tests -Destination $balanceBackup -Recurse
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\puzzle-typing-game-balance-update.zip" -DestinationPath . -Force
Copy-Item frontend\src\App.integration.vue -Destination frontend\src\App.vue -Force
docker compose up -d
docker compose exec frontend npm run build
docker compose exec frontend node --test tests/gameLogic.test.js
git diff --check
```

http://localhost:5173 をCtrl+F5で更新。

## 検証
ロジック13テスト成功。Vue画面のコンパイル成功（手元のTitleView.vueはZIPに含めず、検証時のみ仮タイトルを使用）。実ブラウザでの表示や難易度の体感は未確認。
確認：同じ科目の別コマ候補が登録後に選べなくなる、解除で再選択できる、各コマは2分野のみ、長文に空白がない、リザルトの達成度・不足数と得点が一致する。

科目データ44種類は残し、タイピング単体では全種類を利用。通しプレイは履修した科目だけ出題する。正式な授業名・単位との対応は大学のシラバスで確認する。
