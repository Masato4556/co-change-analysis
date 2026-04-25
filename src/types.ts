export interface AnalysisData {
  lastHash: string | null;
  fileToId: Record<string, number>;
  idToFile: string[];
  counts: Record<string, Record<string, number>>;
}

export interface FilePair {
  count: number;
  file1: string;
  file2: string;
}
