export type DataRow = Record<string, string | number | boolean | null | undefined>;

export interface CafeDataset {
  meta: {
    datasetId: string;
    version: string;
    dataClass: string;
    storeName: string;
    startDate: string;
    asOf: string;
    currency: string;
    amountBasis: string;
    source: string;
    seed: number;
  };
  suppliers: DataRow[];
  materials: DataRow[];
  menus: DataRow[];
  recipes: DataRow[];
  priceHistory: DataRow[];
  calendar: DataRow[];
  sales: DataRow[];
  openingInventory: DataRow[];
  inventoryEvents: DataRow[];
  expenses: DataRow[];
  monthlyExpensePlan: DataRow[];
  settings: DataRow[];
}

export type DatasetTable = Exclude<keyof CafeDataset, "meta">;

export interface DatasetSummary {
  storeName: string;
  dataClass: string;
  asOf: string;
  counts: Record<DatasetTable, number>;
  totalRecords: number;
}

export interface BackupEnvelope {
  backupFormat: "cafe-operations-backup";
  schemaVersion: 1;
  createdAt: string;
  appVersion: string;
  data: CafeDataset;
}

export interface ImportIssue {
  sheet: string;
  row?: number;
  column?: string;
  value?: unknown;
  message: string;
}
