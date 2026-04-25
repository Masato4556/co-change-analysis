import unittest
from display_results import filter_pairs, format_pairs

class TestDisplayResults(unittest.TestCase):
    def setUp(self):
        # サンプルデータ
        self.id_to_file = ["a.py", "b.py", "c.py", "d.py"]
        self.counts = {
            0: {1: 10, 2: 5}, # a-b: 10, a-c: 5
            1: {2: 8, 3: 2},  # b-c: 8, b-d: 2
            2: {3: 4}         # c-d: 4
        }

    def test_filter_all_pairs(self):
        # フィルタなしで全ペアを取得
        pairs = filter_pairs(self.counts, self.id_to_file)
        self.assertEqual(len(pairs), 5)
        # 降順ソートされているはず
        self.assertEqual(pairs[0][0], 10) # 10 (a-b)
        self.assertEqual(pairs[0][1], "a.py")
        self.assertEqual(pairs[0][2], "b.py")

    def test_filter_by_file(self):
        # b.py が含まれるペアのみ
        pairs = filter_pairs(self.counts, self.id_to_file, filter_file="b.py")
        self.assertEqual(len(pairs), 3) # a-b, b-c, b-d
        for count, f1, f2 in pairs:
            self.assertTrue(f1 == "b.py" or f2 == "b.py")

    def test_top_n(self):
        # Top 3
        pairs = filter_pairs(self.counts, self.id_to_file, top_n=3)
        self.assertEqual(len(pairs), 3)
        self.assertEqual(pairs[0][0], 10)
        self.assertEqual(pairs[1][0], 8)
        self.assertEqual(pairs[2][0], 5)

if __name__ == "__main__":
    unittest.main()
