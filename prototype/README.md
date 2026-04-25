# Git Co-change Analysis Tool

このツールは、Gitリポジトリのコミット履歴を解析し、一緒に変更されることが多いファイルのペア（共起関係）を特定します。
依存関係の把握や、リファクタリングの影響範囲の調査に役立ちます。

## 構成
- `co_change_analyzer.py`: コミット履歴を解析し、結果をJSON形式で保存します。
- `display_results.py`: 解析結果を見やすく整形して表示します。
- `.cochangeignore`: 解析から除外するファイルのパターンを指定します。

## 使い方

### 1. 解析の実行

最初は、リポジトリ全体または特定の範囲を解析します。デフォルトでは既存のデータファイル（`co-change.json`）を上書きします。

```bash
# 直近 100 コミットを解析
python3 tools/co-change-analysis/co_change_analyzer.py --max-commits 100

# 1年前からの変更を解析
python3 tools/co-change-analysis/co_change_analyzer.py --since "1 year ago"

# 解析結果の保存先を指定
python3 tools/co-change-analysis/co_change_analyzer.py --data my-analysis.json
```

### 2. 増分更新（追加計測）

一度解析を行った後は、前回の続きから増分だけを効率的に計測できます。

```bash
# 前回の解析結果に、その後の新規コミット分を追記
python3 tools/co-change-analysis/co_change_analyzer.py --update
```

### 3. 結果の表示

集計されたデータを様々な条件で表示します。

```bash
# Top 20 のペアを表示
python3 tools/co-change-analysis/display_results.py

# 特定のファイルに関連するペアのみを表示
python3 tools/co-change-analysis/display_results.py --filter "app/root.tsx"

# マークダウン形式で出力（レポート用）
python3 tools/co-change-analysis/display_results.py --markdown --top 10
```

## 除外設定（.cochangeignore）

リポジトリ直下の `.cochangeignore` ファイルに、計測から除外したいパターンを記述できます。
`package-lock.json` や `node_modules/` など、共起分析においてノイズとなるファイルを指定してください。

```text
# パターンの例
package-lock.json
node_modules/
dist/
*.log
```

## 解析オプション詳細

### co_change_analyzer.py
- `--data`: データファイルのパス（デフォルト: `co-change.json`）
- `--reset`: 既存のデータファイルを削除してリセットします。
- `--update`, `-u`: 既存のデータに新規コミット分を追記します（範囲指定とは併用不可）。
- `--since`: 計測を開始する期間を指定します（例: "2023-01-01", "1 month ago"）。
- `--max-commits`: 計測する最大コミット数を指定します。

### display_results.py
- `--data`: 読み込むデータファイルのパス。
- `--top`: 表示する上位ペアの数（デフォルト: 20）。
- `--filter`: 指定したファイル名を含むペアのみを表示します。
- `--markdown`: 表形式ではなく、Markdown形式で出力します。
