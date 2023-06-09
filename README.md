# Figma API で SVG ファイル をダウンロードする

## 環境変数の準備

.env ファイル

```
FIGMA_ACCESS_TOKEN=figd_*********
FIGMA_FILE_ID=*********
FIGMA_DOWNLOAD_DIR=assets
```

### `FIGMA_ACCESS_TOKEN`

自分の figma アカウントのアクセストークンを指定する。

チーム開発の場合は .env ファイルとは別に git の監視対象から外した.env.local ファイルを作って、そっちで個人それぞれのアクセストークンを指定するのが良い。

### `FIGMA_FILE_ID`

ダウンロードしてくる Figma のファイルの ID。

Figma ファイルの URL でわかる。

### `FIGMA_DOWNLOAD_DIR`

ダウンロード先のフォルダー。

## スクリプトの実行

publish されているコンポーネント全てダウンロード。

```
yarn download-svg
```

figma 上にあるコンポーネントの名前を指定してダウンロード。スペース区切りで複数指定可能。

```
yarn download-svg AccountCircle ArrowRight
```

## 参考資料

- Figma のアクセストークン取得 https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens
- Fimga API https://www.figma.com/developers/api
