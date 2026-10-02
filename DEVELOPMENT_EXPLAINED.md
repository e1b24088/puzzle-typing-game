# このゲームの開発の裏側

## 最初に伝えること

このゲームはHTML・CSS・JavaScriptとVueで画面を作り、ブラウザで動かしています。
科目と問題はJSONにまとめ、科目IDでつなげています。
入力判定、採点、出題の絞り込みは現在ブラウザ側で処理します。
Java 21とSpring Bootのバックエンドは、現在は接続確認APIを提供しています。
Docker Composeでフロントとバックの開発環境をまとめて起動します。

## 言語・フレームワーク・実行環境を区別する

|技術|分類|このゲームでの役割|
|---|---|---|
|HTML|マークアップ言語|見出し・説明・ボタンの構造|
|CSS|スタイル言語|配置・色・余白・アニメーション|
|JavaScript|プログラミング言語|入力判定・採点・出題・状態変更|
|Vue|JavaScriptフレームワーク|画面の部品化とデータ変化に応じた表示更新|
|Vite|開発・ビルドツール|開発中のフロント配信、本番用ファイルへの変換|
|Node.js|JavaScript実行環境|コンテナでViteなどの開発ツールを動かす|
|JSON|データ形式|科目・問題・解説・設定を保持|
|Java 21|言語と利用バージョン|バックエンドのコード|
|Spring Boot|Javaフレームワーク|APIを起動し、HTTPに応答する環境を用意|
|Spring MVC|Webフレームワーク|URLとJavaの処理を対応づける|
|組み込みTomcat|Webサーバー／Servletコンテナ|HTTP要求を受けてJavaのWeb処理へつなぐ|
|JVM|Javaの実行環境|Javaのバイトコードを実行|
|Eclipse Temurin|JDKの配布|Dockerfileで利用するJava環境|
|Maven|Javaのビルド・依存管理ツール|pom.xmlに基づくライブラリ管理と起動|
|Docker|コンテナ実行環境|各PCでフロントとバックの環境をそろえる|
|Compose|複数コンテナの構成・起動ツール|compose.yamlからまとめて起動|
|Git・GitHub|履歴管理・共有サービス|コミット、ブランチ、PR|

VueがHTML/CSS/JavaScriptを置き換えるのではなく、.vueファイルにまとめて書きます。
Node.jsで開発ツールを動かし、配信されたJavaScriptはブラウザで動きます。
JavaScriptとJavaは別の言語です。
「エンジン」の意味は文脈により異なります。ゲームエンジン（Unity等）は使っていません。
Javaの実行環境ならJVM、HTTP要求の受付ならTomcat、コンテナ起動ならDockerと答えます。

## 単位選択から画面が変わるまで

1. コマのボタンを押すと、CourseGameView.vueのactiveSlotにコマを保存。
2. 科目一覧を表示し、canSelectSubjectで固定科目・他コマとの重複を確認。
3. selections[コマID]に選択科目IDを保存。
4. computedでscorePuzzleを再計算し、Vueが属性点を表示し直す。
5. 終了時はemit('finish', 結果)でApp.vueへ通知。
6. App.vueがリザルトへ切り替え、選択科目IDをタイピング画面へ渡す。

採点側のnormalizeSelectionsでも重複を防ぐため、無効ボタンだけに依存しません。

## タイピングの処理

1. selectQuestionsで科目IDに一致する問題だけを残す（通しプレイ）。
2. ブラウザがkeydownイベントを受け取る。
3. checkTypingKeyで入力文字とromaji[位置]を比較。
4. 正解時だけ得点と位置を進める。誤入力はミス回数を増やす。
5. 完了したら次の問題を選ぶ。
6. Date.nowと開始時刻の差で時間を計算。setIntervalは表示更新を促す。
7. Vueが得点・残り時間・入力位置を画面に反映。

C/Javaで学んだif・配列・ループ・関数の考え方をJavaScriptでも使っています。
正確率＝正解入力数÷（正解入力数＋誤入力数）×100。
正解文字/分＝正解入力数÷経過秒×60。画面では整数表示。

## Java APIの実際の経路

ブラウザ → localhost:5173/api/health → Viteのproxy → backend:8080/api/health → Tomcat/Spring MVC → GameApplication.health() → JSON → ブラウザ。

@RestControllerはHTTP応答を返すクラス、@GetMappingはGETのURLと処理の対応を表します。
Map.of("status", "ok")がJSON応答になります。
backendはDocker Compose内のサービス名です。ブラウザから直接backendへアクセスするわけではありません。
localhostはアクセスしているそのPC。5173・8080は待ち受けポートです。
会場ネットワークを使わなくても、同じPCのブラウザとサーバーは通信できます。

現在、採点・問題抽出・タイピング判定はJavaへ送っていません。DBも未使用です。

## この構成を使う理由

- Vue：既存Web環境を利用し、画面とイベントを部品にまとめる。
- JSON：小規模な科目・問題・説明を素早く編集する。
- Java/Spring Boot：Javaを希望するチーム方針に合わせたAPI環境。
- Docker：Node/Javaのバージョンと依存関係をそろえる。
- DB：固定問題と一時的なゲーム結果には現在不要。保存やランキングを作る場合に検討。

## 授業との対応（正式名称はシラバスで確認）

|学習領域|ゲームで見せる具体例|
|---|---|
|プログラミング|条件分岐・配列・関数・採点|
|Web技術|HTML/CSS/JavaScript・画面更新|
|ネットワーク|HTTP・URL・ポート・API|
|データベース|IDとデータの関連づけ、JSONとDBの違い（DBは未使用）|
|ソフトウェア設計|データ・採点・表示の分割、propsとemit|
|品質・テスト|重複・境界条件・誤入力の確認|
|チーム開発|履歴管理・ブランチ・PR|
|統計・データ分析|正確率・入力速度|

Vue/Docker自体を授業で扱わない場合は、授業の基礎知識の応用として紹介します。
実際のシラバスを確認し、学べる内容を断定する前に対応を確定してください。

## 確認用の公式資料とコード

- https://vuejs.org/guide/introduction.html
- https://vite.dev/guide/
- https://docs.spring.io/spring-boot/reference/web/servlet.html
- App.vue、gameLogic.js、GameApplication.java、vite.config.js、Dockerfile、compose.yaml。
