import type { BackupEnvelope } from "./types";
import { datasetSchema, validateDataset } from "./schema";

export function createBackup(data: BackupEnvelope["data"]): BackupEnvelope {
  return { backupFormat: "cafe-operations-backup", schemaVersion: 1, createdAt: new Date().toISOString(), appVersion: "0.1.0", data };
}

export function parseBackup(input: unknown) {
  if (!input || typeof input !== "object") return { issues: [{ sheet: "백업", message: "JSON 백업 형식이 아닙니다." }] };
  const value = input as Partial<BackupEnvelope>;
  if (value.backupFormat !== "cafe-operations-backup") return { issues: [{ sheet: "백업", message: "이 프로그램에서 만든 전체 백업 파일이 아닙니다." }] };
  if (value.schemaVersion !== 1) return { issues: [{ sheet: "백업", message: "지원하지 않는 백업 버전입니다." }] };
  if (!datasetSchema.safeParse(value.data).success) return validateDataset(value.data);
  return validateDataset(value.data);
}
