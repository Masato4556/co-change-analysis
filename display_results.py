import json
import os
import argparse
from typing import Dict, List, Tuple, Optional

def filter_pairs(
    counts: Dict, 
    id_to_file: List[str], 
    top_n: Optional[int] = None, 
    filter_file: Optional[str] = None
) -> List[Tuple[int, str, str]]:
    all_pairs = []
    
    # ファイル名からIDを逆引き（フィルタ用）
    filter_id = None
    if filter_file:
        try:
            filter_id = id_to_file.index(filter_file)
        except ValueError:
            # 指定されたファイルが存在しない場合は空リスト
            return []

    for id1_raw, connected in counts.items():
        id1 = int(id1_raw)
        for id2_raw, count in connected.items():
            id2 = int(id2_raw)
            
            # フィルタ（どちらかのIDが一致するか）
            if filter_id is not None and id1 != filter_id and id2 != filter_id:
                continue
                
            f1 = id_to_file[id1]
            f2 = id_to_file[id2]
            all_pairs.append((count, f1, f2))
    
    # 降順ソート
    all_pairs.sort(key=lambda x: x[0], reverse=True)
    
    if top_n:
        return all_pairs[:top_n]
    return all_pairs

def format_pairs(pairs: List[Tuple[int, str, str]], mode: str = "cli"):
    if not pairs:
        print("No pairs found.")
        return

    if mode == "markdown":
        print("| Rank | Changes | File 1 | File 2 |")
        print("|------|---------|--------|--------|")
        for i, (count, f1, f2) in enumerate(pairs):
            print(f"| {i+1} | {count} | `{f1}` | `{f2}` |")
    else:
        # CLI Table
        max_f1 = max(len(p[1]) for p in pairs)
        header = f"{'Rank':>4} | {'Count':>5} | {'File 1':<{max_f1}} | {'File 2'}"
        print(header)
        print("-" * len(header))
        for i, (count, f1, f2) in enumerate(pairs):
            print(f"{i+1:4d} | {count:5d} | {f1:<{max_f1}} | {f2}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Display Co-change Analysis Results")
    parser.add_argument("--data", default="co-change.json", help="Path to data JSON file")
    parser.add_argument("--top", type=int, default=20, help="Show top N pairs")
    parser.add_argument("--filter", help="Filter by filename")
    parser.add_argument("--markdown", action="store_true", help="Output in Markdown format")
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"Error: {args.data} not found.")
        exit(1)

    with open(args.data, "r") as f:
        data = json.load(f)
    
    counts = data.get("counts", {})
    id_to_file = data.get("id_to_file", [])
    
    pairs = filter_pairs(counts, id_to_file, top_n=args.top, filter_file=args.filter)
    
    mode = "markdown" if args.markdown else "cli"
    
    print(f"\nCo-change Analysis Results (Total pairs: {len(pairs)})")
    if args.filter:
        print(f"Filtered by: {args.filter}")
    print("-" * 40)
    
    format_pairs(pairs, mode=mode)
