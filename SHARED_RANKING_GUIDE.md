# 共有ランキングの導入・運用手順

## 今回の方式

Vueの画面 → 同じサーバーの `/api/rankings` → Spring Boot → H2ファイルDB、という構成です。通信形式はJSON、保存先はH2です。JSONファイルを各PCに置く方式ではなく、全PCが1つのDBを参照します。

| 状態 | 利用・保存 |
|---|---|
| 展示中 | サーバー役のPC1台とDockerを起動。スリープさせない。他のPCはブラウザーで接続 |
| ブラウザーだけ閉じる | 登録済みデータは残る。サーバーが動いていれば他PCも利用可能 |
| 全PCを終了する | 登録済みデータは残るが、その間ゲームとランキングへの接続はできない |
| 翌日起動する | 同じサーバーPC・同じDockerボリュームで起動すると記録を再利用できる |

保存先はDockerの名前付きボリューム `ranking_data` です。コンテナーを作り直しても残ります。**`docker compose down -v`、Dockerのボリューム削除・初期化はしないでください。** プロジェクトのフォルダー名を変えると別のボリュームを参照することがあります。登録完了前の名前・得点は保存されません。

## 動作と順位ルール

- タイトルと両ゲームのリザルトから、共通の「成績発表」画面へ移動できます。
- 履修登録・タイピング・通しプレイの3タブがあります。リザルトから開くと、そのモードを最初に表示します。
- 単独プレイはそのゲームの得点。通しプレイは両ゲームの得点合計です。
- 通しプレイの履修登録リザルトでは名前を入力して引き継ぎ、タイピング終了後に通し記録を登録します。途中結果を単独モードへ重複登録しません。
- 得点の高い順。同点は同順位で、例えば「1、2、2、4位」です。同点内の表示順は登録が早い順です。
- 上位10件を表示します。同点で10件を超える場合も表示は10件。自分が表示枠外なら、10件の下に自分の行を追加します。
- 1〜3位は金・銀・銅の王冠。同点なら同じ色。今回登録した記録は青い枠と「今回のあなた」で示します。
- 5秒ごとの自動更新と、手動更新があります。
- 名前は前後の空白を除いた1〜12文字。同じ名前でも別の記録として扱います。
- 登録記録IDとプレイIDはUUIDです。同じプレイでボタンを押し直しても1件だけ登録し、名前の修正はできます。新しいプレイを始めると名前と今回の強調表示をリセットします。
- 「今回のあなた」は現在のブラウザー内のプレイに対応します。再読み込み後や別PCで本人を識別するログイン機能はありません。

## メンバーの更新を先に取り込む

この差分は `main` の `f6a1d07895068e8d14a010e08a1d82e5ae7846a0` を基準に作成しました。メンバーが変更した後のmainに、以下の順で適用してください。こちらからリモートへはpushしていません。

PowerShellでリポジトリーのルートへ移動します。

```powershell
git status --short --branch
```

追跡対象ファイルに未コミット変更がある場合は先にその変更を確認・保存してください。`reset --hard` や `clean` で消さないでください。以前の未追跡メモ等を今回のコミットへ一括追加する必要はありません。

```powershell
git switch main
git pull --ff-only upstream main
git switch -c feature/shared-rankings
```

自分の環境で共同リポジトリーが `origin` なら、以降の `upstream` を `origin` に読み替えます。pullが失敗した場合はそこで停止し、出力を確認してください。

ZIPを展開して `INSTALL_RANKINGS.ps1` と `shared-rankings.patch` をリポジトリーのルートに置きます。

```powershell
& .\INSTALL_RANKINGS.ps1
```

スクリプトは追跡対象の未コミット変更を確認し、`git apply --check` に通ってから適用します。メンバーの変更と重なって適用できない場合は、上書きせず停止します。その場合はエラー出力と最新の該当ファイルを確認して統合する必要があります。ファイル全体を古い版へ戻さないでください。

## 起動・確認

Docker Desktopを起動してから実行します。

```powershell
docker compose up -d --build
docker compose logs --tail 80 backend
docker compose exec frontend npm run build
docker compose exec frontend node --test tests/ranking.test.js tests/romajiInput.test.js tests/gameClock.test.js tests/pageTurn.test.js
docker compose exec backend mvn test
git diff --check
```

バックエンド起動時にH2のテーブルを自動作成します。サーバーPCは `http://localhost:5173` を開きます。上記のNodeテストは今回と関係する範囲を指定しています。既存の全テストが通るという意味ではありません。

他PCでは、サーバーPCのIPv4アドレスを `ipconfig` で確認し、例として `http://192.168.1.20:5173` を開きます。他PCで `localhost` を開くとそのPC自身へ接続するため共有できません。他PCにDockerを起動する必要はありません。

同じLANを使い、サーバー側のプライベートネットワークでTCP 5173への接続を許可します。学校・会場のWi-Fiには端末間通信を禁止する設定がある場合があります。実機2台で事前確認してください。ViteがAPI通信をバックエンドへ中継するため、ブラウザー側に別PCのAPI URLを書く必要はありません。サーバーPCは電源接続し、展示中のスリープを無効にします。

展示前に次を実機で確認します。

1. 1台目で単独プレイを終了し名前を登録。2台目の同じタブに反映される。
2. 通しプレイを完了し、両得点の合計で登録される。
3. 同じリザルトで再登録して件数が増えない。
4. 上位10件と枠外の本人表示、戻る操作、名前のリセットを確認する。
5. `docker compose stop` 後、`docker compose up -d` で記録が残る。

## コミット・push

画面と実機接続を確認した後、今回のファイルを指定して追加します。インストーラーやパッチそのものは追加不要です。

```powershell
git add .gitignore compose.yaml backend/pom.xml backend/src/main/java/jp/ac/example/game/ranking backend/src/main/resources/application.properties backend/src/test frontend/src/App.vue frontend/src/views/TitleView.vue frontend/src/views/TypingResultView.vue frontend/src/views/RankingView.vue frontend/src/components/RankingEntryForm.vue frontend/src/utils/rankingApi.js frontend/tests/ranking.test.js SHARED_RANKING_GUIDE.md
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add shared rankings for three game modes"
git push -u upstream feature/shared-rankings
```

DB内の来場者名や得点はGitに含めません。push・pullで配るのはプログラムです。各PCから同じサーバーに接続することで、実際の記録を共有します。

## データ形式・説明用メモ

| 保存項目 | 意味 |
|---|---|
| id | サーバーが発行する記録ID |
| play_id | 1回のプレイを識別し、二重登録を防ぐID |
| mode | course / typing / sequential |
| name | 表示する名前 |
| score | 順位計算用の得点 |
| course_score / typing_score | 得点の内訳。対象外はnull |
| created_at | サーバーの登録日時。同点時の表示順に使用 |

順位は保存せず、SQLの `RANK()` で得点から求めます。10件の表示順には `ROW_NUMBER()` を使い、同順位と表示件数を区別します。GET `/api/rankings?mode=course&selfId=...` が上位・本人・総件数をJSONで返し、POST `/api/rankings` が登録します。名前の長さ、得点の整数・範囲、合計と内訳の整合性をサーバー側でも検査します。

## 停止・バックアップ

通常停止は `docker compose stop`、再開は `docker compose up -d` です。ブラウザーの終了だけではDockerは止まりません。

記録のバックアップは書き込みを止めてからコピーします。

```powershell
docker compose stop backend
$rankingContainer = docker compose ps -aq backend
docker cp "${rankingContainer}:/data/results.mv.db" .\ranking-backup.mv.db
docker compose start backend
```

登録が1度もない等でファイルがない場合や、コピーが失敗した場合は成功扱いにせず出力を確認してください。バックアップは個別に保管し、Gitへ追加しません。別サーバーへ移す際は、移行先のバックエンドを止め、既存DBを別名バックアップしてから移します。

## 実装時の確認範囲

- フロントの本番ビルド成功。追加ランキング・既存ローマ字・時計・ページ送りのNodeテスト18件成功。
- バックエンドのテスト6件成功。同点、10件外の本人、モード分離、同時再送の重複防止、API入力検査、ファイルDB再接続後の保存を確認。
- ブラウザー操作で各入口、モードの初期表示、名前引継ぎ、再登録、2つのブラウザー環境、通し得点、10件外の本人表示を確認。ブラウザー試験のAPIはモックを使用し、Java側APIはMockMvcで別途確認。
- この作業環境ではDockerと実際の会場LANでの接続は未実施。JavaのローカルテストはJDK17の互換オプションで実施し、既存DockerのJDK21指定は維持。

既存のゲームデータ・採点処理・ゲーム本体は変更していません。タイトルとリザルトは入口・名前欄の追加に限定しています。フロントから送信された得点を使う展示用LAN構成であり、インターネット公開向けの不正得点検証・アカウント認証は含みません。
