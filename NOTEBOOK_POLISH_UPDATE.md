# 時計の回転・ノートと机の見た目修正

- 針は残り時間の角度ではなく経過時間の角度を使い、0→360度へ時計回りに進む。
- 60秒設定なら上（開始）→右（15秒経過）→下（30秒）→左（45秒）→上（終了）。45〜60の目盛りと背景範囲を赤くする。
- 時計の下の「残りN秒」は維持。針が経過時間、数字が残り時間を表す。
- 緑の内枠を廃止。ベージュの表紙が紙よりわずかに外へ出る構成へ変更。
- ノートは幅約78vw→74vw、最大幅1280→1180px。上下も少し縮小。
- 罫線を30px間隔から22px間隔へ変更し、行数を増やす。
- 机に曲がりのある木目と節、板の継ぎ目をCSS・SVGで追加。
- 腕時計のベルトを文字盤より細くする。
- 残り15秒の案内を「ラストスパート！」へ変更。
- 詳しいルールのボタンとダイアログを削除。開始前の基本3手順は維持。
- ページめくり0.24秒、演出中の入力、F9による開発用停止は維持。

## 導入：プロジェクト直下のPowerShell
```powershell
$polishBackup = Join-Path $env:TEMP ('puzzle-polish-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $polishBackup
Copy-Item frontend\src -Destination $polishBackup -Recurse
Copy-Item frontend\tests -Destination $polishBackup -Recurse
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\puzzle-typing-game-notebook-polish.zip" -DestinationPath . -Force
& .\INSTALL_NOTEBOOK_UI.ps1
docker compose up -d
docker compose exec frontend npm run build
docker compose exec frontend node --test tests/gameClock.test.js tests/pageTurn.test.js tests/romajiInput.test.js
git diff --check
```
ブラウザをCtrl+F5で更新。結果画面が接続済みならスクリプトはApp.vueを変更しない。

科目データ・タイトル・単位ゲーム・既存gameLogic.js・JavaはZIPに含めない。
こちらの既知の構成では27ロジックテストと新画面のVueコンパイルが成功。実ブラウザの見た目は未確認。時計の向きと赤い目盛り、緑枠がないこと、罫線の増加、長文と結果が収まるかを確認する。
