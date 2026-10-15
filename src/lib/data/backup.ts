import type { BackupEnvelope } from "./types";
import { validateDataset } from "./schema";
import { migrateDataset } from "./migration";

export function createBackup(data: BackupEnvelope["data"]): BackupEnvelope {
  return { backupFormat: "cafe-operations-backup", schemaVersion: 2, createdAt: new Date().toISOString(), appVersion: "0.2.0", data };
}

export function parseBackup(input: unknown) {
  if (!input || typeof input !== "object") return { issues: [{ sheet: "백업", message: "JSON 백업 형식이 아닙니다." }] };
  const value = input as Partial<BackupEnvelope>;
  if (value.backupFormat !== "cafe-operations-backup") return { issues: [{ sheet: "백업", message: "이 프로그램에서 만든 전체 백업 파일이 아닙니다." }] };
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) return { issues: [{ sheet: "백업", message: "지원하지 않는 백업 버전입니다." }] };
  return validateDataset(migrateDataset(value.data));
}
