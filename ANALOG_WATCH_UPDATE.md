# アナログ腕時計・開発用F9・ページめくり調整

## 変更
- 腕時計を机の右上に配置。SVGの針が残り時間を示すアナログカウントダウン。
- 上が制限時間、右が残り時間の4分の1、下が半分、左が4分の3。60秒設定では60・15・30・45。針は残り時間に合わせて戻る。
- 残り15秒に対応する目盛りと範囲を赤く表示。15秒以下で時計の縁がゆっくり脈動し、問題の下に短い注意文。5秒以下でさらに注意文を変える。
- 読み取り補助として、腕時計の下に「残りN秒」の短い数字表示も残す。
- 開発サーバーでF9を押すと時計・入力を一時停止。再度F9で再開。停止中の時間を残り時間と文字/分の計算から除く。終了済みのゲームは再開しない。
- F9はimport.meta.env.DEVで有効化。npm run buildで作る本番版には開発用の一時停止を出さない。展示でViteの開発サーバーをそのまま使う場合にはF9が有効なので注意する。
- めくりは0.1秒から0.24秒へ。次の問題は即時表示し、演出中も入力可能。
- 鉛筆の形を細くし、「結果を見る →」を表示。見た目が細くてもクリック・Tab操作の領域は確保。
- 固定画面とページ高さを調整し、通常のプレイと結果はスクロールなし。狭い画面では時計を上部に移して小物を省く。
- 画像・外部フォント・追加npmパッケージは不要。

## 導入（プロジェクト直下のPowerShell）
```powershell
$analogBackup = Join-Path $env:TEMP ('puzzle-analog-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $analogBackup
Copy-Item frontend\src -Destination $analogBackup -Recurse
Copy-Item frontend\tests -Destination $analogBackup -Recurse
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\puzzle-typing-game-analog-watch.zip" -DestinationPath . -Force
& .\INSTALL_NOTEBOOK_UI.ps1
docker compose up -d
docker compose exec frontend npm run build
docker compose exec frontend node --test tests/gameClock.test.js tests/pageTurn.test.js tests/romajiInput.test.js
git diff --check
```
ブラウザでCtrl+F5。インストール用スクリプトはノートの結果画面が既に接続されていればApp.vueを変更しない。構成が想定と違えば停止する。
更新するのはノート系画面・部品と時計等の独立モジュール。科目データ、gameLogic.js、タイトル、単位ゲーム、JavaはZIPに含めない。

## 動作確認
- 右上の針と残り秒数が一致する。
- F9で秒数が止まり、文字入力も採点されない。再度F9で停止位置から再開する。
- ノート以外のボタンにフォーカスしていてもF9が動く。
- 15秒以下と5秒以下の見た目・短文。動きを減らす設定では脈動を止める。
- めくりの最中も入力でき、速く連続で解いても演出が残らない。
- 時間切れ・鉛筆終了・結果への移動。

想定は1280×720以上の横長PC、表示倍率100%。実際の展示PCで内容が切れていないか確認する。極端に長い独自の解説・問題や小さい画面は個別調整が必要。
配布側では27ロジックテスト成功（時計4、めくり4、ローマ字3、既存16）、新画面のVueコンパイル成功。実ブラウザでの描画・キー操作・体感は未確認。
