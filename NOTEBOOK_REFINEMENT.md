# 腕時計タイマー・紙らしいノート・高速めくり

## 今回の変更
- ノート内の残り時間を外し、問題と同じ高さの右側の腕時計にデジタル表示。10秒以下は色でも注意を示す。
- ノート幅を約88vwから約78vwに縮小。左に9vw、右に13vwの机の余白を確保し、腕時計がノートに重ならない配置。
- 紙の層、柔らかい左右ページ、薄い青い罫線、赤い余白線、中央の綴じ目と綴じ糸を追加。硬い板状の枠を弱める。
- めくりは約0.1秒。次の問題は入力完了時に即座に用意する。演出中も次の問題を入力でき、文字は演出より手前に表示。
- 連続して問題を終えても古い演出タイマーが残らず、終了時も取り消す。
- 付箋版は実装していない。

CSS・SVGのみで実装。前回のノートUIが未適用でも必要な部品を含む。科目データ・既存gameLogic.js・タイトル・単位ゲームはZIPに含めない。
前回ドキュメントの「めくり中は採点しない」は廃止。今回からめくり中も通常どおり採点する。

## 導入：プロジェクト直下のPowerShell
```powershell
$refineBackup = Join-Path $env:TEMP ('puzzle-notebook-refine-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $refineBackup
Copy-Item frontend\src -Destination $refineBackup -Recurse
Copy-Item frontend\tests -Destination $refineBackup -Recurse
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\puzzle-typing-game-notebook-refinement.zip" -DestinationPath . -Force
& .\INSTALL_NOTEBOOK_UI.ps1
docker compose up -d
docker compose exec frontend npm run build
docker compose exec frontend node --test tests/pageTurn.test.js tests/romajiInput.test.js
git diff --check
```
INSTALL_NOTEBOOK_UI.ps1はノートの結果画面が接続済みならApp.vueを変更しない。構成が想定と違う場合は停止する。エラーが出たらその出力を共有する。
ブラウザをCtrl+F5で更新。

## 確認
腕時計の秒数が減る／10秒以下の注意色／入力完了直後に次の問題が入力できる／高速に2問完了しても演出が残らない／演出途中の時間切れと鉛筆終了／長文の折り返し／結果の復習ページ送り。
想定：横長PC、1280×720以上、倍率100%。小さい画面では腕時計を上に移動し、ペンと消しゴムを省く。
配布側では23ロジックテスト成功（めくり用4、ローマ字用3、従来16）、新画面のVueコンパイル成功。実ブラウザの見た目・サイズ・体感は未確認。

## 付箋案
短い単語を1つずつ見せる画面なら、付箋は軽く、問題の交換も直感的。一方、長文・開始説明・学習記録には面積が必要で、付箋を大きくするとノートより読みにくくなる可能性がある。現在の主画面はノートを維持し、将来付箋を使うなら「ひとこと学習」の小さな部品から試す案を推奨。今回はまだ追加しない。
