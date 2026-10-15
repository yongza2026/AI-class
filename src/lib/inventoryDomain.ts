import Decimal from "decimal.js";
import type { DataRow } from "./data/types";

export const MATERIAL_CATEGORIES = ["주류", "식재료", "발효액", "코디얼", "제조 베이스", "소모품"] as const;
export const BASE_UNITS = ["ml", "g", "개"] as const;
export const WASTE_REASONS = ["변질", "파손", "유통기한 경과", "제조 실패", "서비스 제공", "기타"] as const;

export function seoulToday(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}

export function convertToBase(quantity: number, unit: string, baseUnit: string): number {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("수량은 0 이상의 숫자여야 합니다.");
  if (unit === baseUnit) return quantity;
  const key = `${unit}:${baseUnit}`;
  if (key === "L:ml" || key === "kg:g") return new Decimal(quantity).mul(1000).toNumber();
  if (key === "ml:L" || key === "g:kg") return new Decimal(quantity).div(1000).toNumber();
  throw new Error(`${unit}와 ${baseUnit}는 자동 환산할 수 없습니다.`);
}

export function packageReceipt(packCount: number, packageCapacity: number, purchaseUnit: string, baseUnit: string) {
  if (!Number.isInteger(packCount) || packCount <= 0) throw new Error("구매 포장 수는 1 이상의 정수여야 합니다.");
  if (!Number.isFinite(packageCapacity) || packageCapacity <= 0) throw new Error("포장 용량은 0보다 커야 합니다.");
  return new Decimal(convertToBase(packageCapacity, purchaseUnit, baseUnit)).mul(packCount).toNumber();
}

export function precisionStep(material: DataRow): number {
  if (String(material.unit) !== "개") return 0.01;
  return material.allowFraction === true ? 0.01 : 1;
}

export function duplicateCandidates(materials: DataRow[], input: { name: string; brand?: string; packageCapacity?: number }) {
  const normalize = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, "").toLocaleLowerCase("ko");
  return materials.filter((row) => {
    const sameName = normalize(row.name) === normalize(input.name);
    const sameBrand = !input.brand || normalize(row.brand) === normalize(input.brand);
    return sameName && sameBrand;
  }).map((row) => ({ ...row, exactSize: Number(row.packageCapacity ?? row.packQuantity) === Number(input.packageCapacity) }));
}

export function validateInventoryQuantity(value: number, material: DataRow) {
  if (!Number.isFinite(value)) return "수량을 숫자로 입력해 주세요.";
  if (value < 0) return "수량은 0 이상이어야 합니다.";
  if (String(material.unit) === "개" && material.allowFraction !== true && !Number.isInteger(value)) return "이 품목은 낱개 단위이므로 소수를 입력할 수 없습니다.";
  return "";
}
