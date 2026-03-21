// eval-dataset - Version-controlled eval dataset manager for LLM testing
export { createDataset, loadDataset } from './dataset.js';
export type {
  TestCase,
  Dataset,
  SplitConfig,
  SplitResult,
  SampleOptions,
  DedupOptions,
  ExportFormat,
  ExportOptions,
  DatasetStats,
  ValidationResult,
  CreateOptions,
  LoadOptions,
} from './types.js';
