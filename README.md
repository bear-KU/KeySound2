# Keysound2

キー入力に合わせて音を再生する，Electron 製のデスクトップアプリ．

## 機能

- キーボードの打鍵に合わせた音声再生
- 再生する音声ファイルの変更
- キーボードごとに音声を再生するか設定可能(Wayland 環境)

## Requirements

- Node.js: 24.4.0
- npm: 11.12.1
- Wayland 環境では，対象の`/dev/input/event*`を読み取る権限が必要．
  必要に応じて，ユーザを`input`グループに追加して設定する．

## セットアップ

1. パッケージのインストール．

```bash
npm install
```

2. キーボード検出・入力監視用のネイティブアドオンのビルド．

```bash
npm run build:native
```

## 起動

```bash
npm run dev
```

## Build

Windows・macOSでの動作は未確認です．

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## 現在の制限

- Wayland 環境でのホールド再生は，文字入力とのリピート周期の調整が必要なため保留中です．
