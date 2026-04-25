import json
import os
import subprocess
import fnmatch
from typing import Dict, List, Set, Optional

class CoChangeAnalyzer:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.last_hash: Optional[str] = None
        self.file_to_id: Dict[str, int] = {}
        self.id_to_file: List[str] = []
        # dict[int, dict[int, int]]
        self.counts: Dict[int, Dict[int, int]] = {}
        self.ignore_patterns: List[str] = []

    def load_ignore_patterns(self, ignore_file: str):
        if not os.path.exists(ignore_file):
            return
        with open(ignore_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    self.ignore_patterns.append(line)

    def is_ignored(self, filename: str) -> bool:
        for pattern in self.ignore_patterns:
            # ディレクトリ指定（build/）などの簡易対応
            if pattern.endswith("/") and filename.startswith(pattern):
                return True
            if fnmatch.fnmatch(filename, pattern):
                return True
        return False

    def get_id(self, filename: str) -> int:
        if filename not in self.file_to_id:
            file_id = len(self.id_to_file)
            self.file_to_id[filename] = file_id
            self.id_to_file.append(filename)
            return file_id
        return self.file_to_id[filename]

    def update_counts(self, files: List[str]):
        # ファイル名をIDに変換
        ids = sorted(list(set(self.get_id(f) for f in files)))
        
        # 全ペアのカウントを更新
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                id1, id2 = ids[i], ids[j]
                if id1 not in self.counts:
                    self.counts[id1] = {}
                self.counts[id1][id2] = self.counts[id1].get(id2, 0) + 1

    def save_data(self):
        data = {
            "last_hash": self.last_hash,
            "file_to_id": self.file_to_id,
            "id_to_file": self.id_to_file,
            "counts": self.counts
        }
        with open(self.data_path, "w") as f:
            json.dump(data, f, indent=2)

    def load_data(self):
        if not os.path.exists(self.data_path):
            return
        
        with open(self.data_path, "r") as f:
            data = json.load(f)
            self.last_hash = data.get("last_hash")
            self.file_to_id = data.get("file_to_id", {})
            self.id_to_file = data.get("id_to_file", [])
            
            # JSONから読み込むとキーが文字列になるので、整数に戻す
            raw_counts = data.get("counts", {})
            self.counts = {}
            for k1, v1 in raw_counts.items():
                k1_int = int(k1)
                self.counts[k1_int] = {int(k2): v2 for k2, v2 in v1.items()}

    def handle_rename(self, old_file: str, new_file: str):
        if old_file in self.file_to_id:
            old_id = self.file_to_id[old_file]
            # 新しい名前がまだ登録されていないか、既に登録されている場合でも
            # 同じ ID を共有するようにする
            self.file_to_id[new_file] = old_id
            self.id_to_file[old_id] = new_file
            # 元の名前は削除する（新しい名前で管理するため）
            # ただし、過去のコミットで old_file が出てくる場合もあるが、
            # 常に最新の名前で集計したい場合はこれで良い
            del self.file_to_id[old_file]
        else:
            # 古い名前の ID がない場合は、新しい名前として登録
            self.get_id(new_file)

    def parse_name_status(self, output: str) -> List[str]:
        changed_files = set()
        lines = output.strip().split("\n")
        
        for line in lines:
            if not line:
                continue
            
            parts = line.split("\t")
            status = parts[0]
            
            if status.startswith("R"):
                # R100\told_name\tnew_name
                if len(parts) >= 3:
                    old_name, new_name = parts[1], parts[2]
                    # 除外判定（新しい名前で判定）
                    if not self.is_ignored(new_name):
                        self.handle_rename(old_name, new_name)
                        changed_files.add(new_name)
            elif status in ("M", "A", "D"):
                # M\tfilename, A\tfilename, D\tfilename
                if len(parts) >= 2:
                    filename = parts[1]
                    if not self.is_ignored(filename):
                        changed_files.add(filename)
                    
        return list(changed_files)

    def update_with_git(self, since: Optional[str] = None, max_commits: Optional[int] = None):
        # 最終ハッシュからの差分を取得
        range_spec = "HEAD"
        if self.last_hash and not since and not max_commits:
            range_spec = f"{self.last_hash}..HEAD"
            
        # --pretty=format:"COMMIT:%H" でコミットの区切りを明示
        cmd = ["git", "log", "--pretty=format:COMMIT:%H", "--name-status", "-M"]
        
        if since:
            cmd.append(f"--since={since}")
        if max_commits:
            cmd.extend(["-n", str(max_commits)])
            
        cmd.append(range_spec)
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error running git log: {result.stderr}")
            return

        commits = result.stdout.split("COMMIT:")
        newest_hash = None
        
        for commit_block in commits:
            if not commit_block.strip():
                continue
                
            lines = commit_block.strip().split("\n")
            commit_hash = lines[0]
            
            # 最初のコミット（最新）を記録
            if newest_hash is None:
                newest_hash = commit_hash
                
            # 残りの行（ファイルリスト）をパース
            name_status_block = "\n".join(lines[1:])
            files = self.parse_name_status(name_status_block)
            
            if len(files) >= 2:
                self.update_counts(files)

        # 常に最新のハッシュを保存する（次回の --update のため）
        if newest_hash:
            self.last_hash = newest_hash

    def report(self):
        # 共同変更数が多いペアを Top 10 表示
        all_pairs = []
        for id1, connected in self.counts.items():
            for id2, count in connected.items():
                all_pairs.append((count, id1, id2))
        
        # 降順ソート
        all_pairs.sort(key=lambda x: x[0], reverse=True)
        
        print("\nTop 10 Co-change File Pairs:")
        print("-" * 60)
        for i, (count, id1, id2) in enumerate(all_pairs[:10]):
            f1 = self.id_to_file[id1]
            f2 = self.id_to_file[id2]
            print(f"{i+1:2d}. {count:4d} changes: {f1} <-> {f2}")
        print("-" * 60)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Git Co-change Analyzer")
    parser.add_argument("--data", default="co-change.json", help="Path to data JSON file")
    parser.add_argument("--reset", action="store_true", help="Reset all data (removes the file)")
    parser.add_argument("--update", "-u", action="store_true", help="Incremental update from existing results")
    parser.add_argument("--since", help="Analyze commits since a date (e.g., '1 year ago')")
    parser.add_argument("--max-commits", type=int, help="Limit to N most recent commits")
    args = parser.parse_args()

    if args.reset and os.path.exists(args.data):
        os.remove(args.data)

    analyzer = CoChangeAnalyzer(args.data)

    # --update のときだけ既存データを読み込む
    if args.update:
        if args.since or args.max_commits:
            print("Error: --since and --max-commits cannot be used with --update")
            exit(1)
        if os.path.exists(args.data):
            print(f"Loading existing data from {args.data} for incremental update...")
            analyzer.load_data()
        else:
            print(f"Warning: {args.data} not found. Starting fresh analysis...")
    else:
        print(f"Starting fresh analysis (will overwrite {args.data})...")

    # 除外設定の読み込み
    ignore_file = ".cochangeignore"
    if os.path.exists(ignore_file):
        print(f"Loading ignore patterns from {ignore_file}...")
        analyzer.load_ignore_patterns(ignore_file)

    print(f"Analyzing repository at {os.getcwd()}...")
    if args.since:
        print(f"Filtering commits since: {args.since}")
    if args.max_commits:
        print(f"Limiting to max commits: {args.max_commits}")

    analyzer.update_with_git(since=args.since, max_commits=args.max_commits)
    analyzer.save_data()

    analyzer.report()
    print(f"\nData saved to {args.data}")
