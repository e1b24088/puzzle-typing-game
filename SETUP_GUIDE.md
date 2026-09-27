# 開発環境のセットアップ

このフォルダは既存の Git リポジトリに追加します。既存の README.md は上書きしません。

## 各メンバーのPCに必要

- Git、VS Code、Docker Desktop（Windows は WSL 2 / Linux コンテナ）
- GitHub のリポジトリ閲覧権限
- Java の補完を PC 側の VS Code で使う場合は JDK 21。Docker コンテナ内でビルド・実行するだけなら PC 側への Java・Maven・Node.js のインストールは不要。

VS Code で開くと推奨拡張機能が表示されます。`Vue - Official` と `Extension Pack for Java` をインストールしてください。

## 起動

Docker Desktop を起動し、リポジトリ直下（compose.yaml があるフォルダ）で以下を実行します。

```powershell
docker info --format '{{.OSType}}'
docker compose up --build
```

最初の結果が `linux` と表示されることを確認します。次に http://localhost:5173 を開き、`Java API: 接続済み` と表示されれば、フロントとバックの接続確認が完了です。

終了時は Ctrl+C。バックグラウンドで実行した場合は `docker compose down`。

## 展示前の注意

現在の Compose は開発用です。初回ビルドにはインターネット接続が必要です。展示用には、最終版のイメージを事前にビルドし、PCをネットから切った状態で全画面・時間制限・全画面遷移を実測して確認します。

今は PostgreSQL を使いません。別のプロジェクトが 5432 番を使っていても、この構成とは競合しません。将来 DB を追加する際はポートを確認します。
