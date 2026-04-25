import unittest
import os
import json
import tempfile
from co_change_analyzer import CoChangeAnalyzer

class TestCoChangeAnalyzer(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.data_path = os.path.join(self.temp_dir.name, "co-change.json")
        self.analyzer = CoChangeAnalyzer(self.data_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_get_id(self):
        # ファイル名のインデックス化
        id1 = self.analyzer.get_id("app/root.tsx")
        id2 = self.analyzer.get_id("package.json")
        id3 = self.analyzer.get_id("app/root.tsx")
        
        self.assertEqual(id1, 0)
        self.assertEqual(id2, 1)
        self.assertEqual(id1, id3)
        self.assertEqual(self.analyzer.id_to_file[0], "app/root.tsx")

    def test_update_counts(self):
        # 共同変更のカウント（ID順ソート、二重持ち防止）
        files = ["a.py", "b.py", "c.py"]
        self.analyzer.update_counts(files)
        
        # ID順にソートして a-b, a-c, b-c がカウントされるはず
        id_a = self.analyzer.get_id("a.py")
        id_b = self.analyzer.get_id("b.py")
        id_c = self.analyzer.get_id("c.py")
        
        # IDの小さい方をキーにする（a < b < c と仮定）
        self.assertEqual(self.analyzer.counts[id_a][id_b], 1)
        self.assertEqual(self.analyzer.counts[id_a][id_c], 1)
        self.assertEqual(self.analyzer.counts[id_b][id_c], 1)
        
        # 二度目の更新
        self.analyzer.update_counts(["a.py", "b.py"])
        self.assertEqual(self.analyzer.counts[id_a][id_b], 2)

    def test_save_load(self):
        # 保存と読み込み
        self.analyzer.get_id("a.py")
        self.analyzer.update_counts(["a.py", "b.py"])
        self.analyzer.last_hash = "abcdef"
        self.analyzer.save_data()
        
        new_analyzer = CoChangeAnalyzer(self.data_path)
        new_analyzer.load_data()
        
        self.assertEqual(new_analyzer.last_hash, "abcdef")
        self.assertEqual(new_analyzer.file_to_id["a.py"], 0)
        self.assertEqual(new_analyzer.counts[0][1], 1) # キーを整数に戻しているはず

    def test_parse_git_log(self):
        # git log --name-status -M の出力内容をシミュレーション
        # commit 1
        # R100 a.py b.py
        # M c.py
        #
        # commit 2
        # A a.py
        # M c.py
        
        # まず a.py と c.py を作成
        id_a = self.analyzer.get_id("a.py")
        id_c = self.analyzer.get_id("c.py")
        
        # リネーム a.py -> b.py
        self.analyzer.handle_rename("a.py", "b.py")
        
        # b.py は a.py と同じ ID になっているはず
        self.assertEqual(self.analyzer.file_to_id["b.py"], id_a)
        
        # さらに b.py と c.py の更新をカウント
        self.analyzer.update_counts(["b.py", "c.py"])
        self.assertEqual(self.analyzer.counts[id_a][id_c], 1)

    def test_parse_name_status(self):
        # --name-status 出力のパース
        # まず a.py を登録しておく
        id_a = self.analyzer.get_id("a.py")
        
        output = "R100\ta.py\tb.py\nM\tc.py\n\nA\td.py\n"
        files = self.analyzer.parse_name_status(output)
        
        # a.py は b.py にリネームされ、IDが引き継がれているはず
        self.assertEqual(self.analyzer.file_to_id["b.py"], id_a)
        self.assertIn("b.py", files)
        self.assertIn("c.py", files)
        self.assertIn("d.py", files)
        self.assertNotIn("a.py", files) # リネーム後の名前でカウントするはず

    def test_ignore_patterns(self):
        # 除外パターンのテスト
        self.analyzer.ignore_patterns = ["package-lock.json", "node_modules/*", "build/"]
        
        self.assertTrue(self.analyzer.is_ignored("package-lock.json"))
        self.assertTrue(self.analyzer.is_ignored("node_modules/abc/def.py"))
        self.assertTrue(self.analyzer.is_ignored("build/index.html"))
        
        self.assertFalse(self.analyzer.is_ignored("app/root.tsx"))
        self.assertFalse(self.analyzer.is_ignored("package.json"))

    def test_parse_name_status_with_ignore(self):
        # 除外設定がある場合のパース
        self.analyzer.ignore_patterns = ["package-lock.json"]
        output = "M\tpackage.json\nM\tpackage-lock.json\nM\tapp/root.tsx\n"
        files = self.analyzer.parse_name_status(output)
        
        # package-lock.json は除外されるはず
        self.assertIn("package.json", files)
        self.assertIn("app/root.tsx", files)
        self.assertNotIn("package-lock.json", files)

if __name__ == "__main__":
    unittest.main()
