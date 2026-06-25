# QiitaCache — オフライン対応型 Qiita 記事マネージャー

## 概要

通信環境に左右されず、エンジニアがいつでも知識を閲覧・記録できるオフラインファーストな記事管理ツールです。

## ファイル構成

```
qiita-pwa/
├── index.html      # メインアプリ（UI + ロジック）
├── sw.js           # Service Worker（オフライン制御）
├── manifest.json   # Web App Manifest（PWA定義）
└── README.md       # このファイル
```

## ローカル起動方法

Service Worker は HTTPS または localhost でのみ動作します。

### 方法1: Python
```bash
cd qiita-pwa
python3 -m http.server 8080
# http://localhost:8080 でアクセス
```

### 方法2: Node.js (serve)
```bash
npx serve qiita-pwa -p 8080
# http://localhost:8080 でアクセス
```

### 方法3: VS Code Live Server
- Live Server 拡張をインストール
- index.html を右クリック → "Open with Live Server"

## 機能一覧

### ✅ 実装済み機能

| 機能 | 説明 |
|------|------|
| 記事閲覧（ハイブリッド） | オンライン: Qiita API → オフライン: IndexedDB |
| オフラインキャッシュ | 最新10件を自動保存（IndexedDB） |
| 定時キャッシュ | 指定時刻に自動取得（JavaScriptタイマー） |
| 検索（統合） | オンライン: API検索 / オフライン: filter()+includes() |
| 記事執筆 | Markdownエディタ（ツールバー付き） |
| 下書き保存 | IndexedDB に永続保存 |
| 投稿待ちキュー | オフライン投稿 → 復帰後に自動同期 |
| いいね操作 | オフライン時はキューに追加 |
| フォロー操作 | ユーザーフォローのオフライン予約 |
| 記事保存 | 個別記事を IndexedDB に保存 |
| PWAインストール | ホーム画面追加対応 |
| Service Worker | キャッシュファーストで静的リソース配信 |
| ネット状態検知 | online/offline イベントで自動切替 |
| トースト通知 | 操作フィードバック |

### ストレージ設計

| データ | ストレージ | 内容 |
|--------|-----------|------|
| キャッシュ記事 | IndexedDB `articles` | 最新10件 |
| 保存済み記事 | IndexedDB `saved` | ユーザーが個別保存 |
| 下書き | IndexedDB `drafts` | 執筆中記事 |
| 送信キュー | IndexedDB `queue` | オフライン操作 |
| アクセストークン | localStorage | Qiita API認証 |
| キャッシュ日時 | localStorage | 鮮度表示 |
| いいね済みID | localStorage | UI状態 |
| スケジュール設定 | localStorage | 定時キャッシュ設定 |

## Qiita アクセストークン取得

1. https://qiita.com/settings/tokens/new にアクセス
2. スコープ: `read_qiita` + `write_qiita` にチェック
3. 発行されたトークンをアプリの右パネルに貼り付け

## Service Worker の動作

- **静的リソース**: Cache First（キャッシュ優先）
- **Qiita API**: Network First（ネットワーク優先）
- **Background Sync**: `sync` イベントで保留アクションを自動同期
- **オフライン**: IndexedDB からキャッシュデータを返却

## PWAとしてのインストール

Chrome / Edge:
- アドレスバー右端のインストールアイコンをクリック
- または 設定 → 「QiitaCacheをインストール」

Safari (iOS):
- 共有ボタン → 「ホーム画面に追加」

## 技術スタック

- HTML5 / CSS3 / JavaScript ES6+
- IndexedDB（記事・下書き・キュー）
- localStorage（設定・認証）
- Cache API（静的リソース）
- Service Worker（オフライン制御）
- Web App Manifest（PWA）
- Qiita API v2
