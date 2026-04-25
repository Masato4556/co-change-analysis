export interface AnalysisData {
  lastHash: string | null;
  fileToId: Record<string, number>;
  idToFile: string[];
  counts: Record<string, Record<string, number>>;
}
