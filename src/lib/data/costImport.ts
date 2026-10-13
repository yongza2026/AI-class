import type { CafeDataset, DataRow, ImportIssue } from "./types";

export type CostLedgerItem = {
  name: string;
  category: string;
  unit: string;
  packQuantity: number;
  packPrice: number;
  effectiveDate: string;
  note?: string;
  row: number;
};

export type CostImportItem = CostLedgerItem;

export type CostImportResult = {
  items: CostLedgerItem[];
  issues: ImportIssue[];
  sheet?: string;
};

const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => typeof value === "number" ? value : Number(String(value ?? "").replaceAll(",", ""));

function dateText(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const valueText = text(value);
  const match = valueText.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : new Date().toISOString().slice(0, 10);
}

export async function parseCostLedger(file: File): Promise<CostImportResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { items: [], issues: [{ sheet: "파일", message: ".xlsx 파일만 가져올 수 있습니다." }] };
  if (file.size > 10 * 1024 * 1024) return { items: [], issues: [{ sheet: "파일", message: "파일이 10MB보다 큽니다." }] };
  try {
    const readExcelFile = (await import("read-excel-file/browser")).default;
    const sheets = await readExcelFile(file) as Array<{ sheet: string; data: unknown[][] }>;
    const target = sheets.find((sheet) => sheet.sheet === "원가용 재료목록") ?? sheets.find((sheet) => sheet.data[0]?.some((cell) => text(cell) === "재료명"));
    if (!target) return { items: [], issues: [{ sheet: "원가용 재료목록", message: "재료명·가격이 있는 원장 시트를 찾지 못했습니다." }] };
    const headers = target.data[0] ?? [];
    const indexOf = (name: string) => headers.findIndex((header) => text(header) === name);
    const nameIndex = indexOf("재료명");
    const unitIndex = indexOf("단위");
    const sizeIndex = indexOf("사이즈");
    const priceIndex = indexOf("가격(원)(부가세미포함)");
    const categoryIndex = indexOf("분류");
    const updatedIndex = indexOf("갱신일시");
    const noteIndex = indexOf("구매링크및 비고");
    const requiredCandidates: Array<[number, string]> = [[nameIndex, "재료명"], [unitIndex, "단위"], [sizeIndex, "사이즈"], [priceIndex, "가격(원)(부가세미포함)"]];
    const required = requiredCandidates.filter((entry) => Number(entry[0]) < 0);
    if (required.length) return { items: [], sheet: target.sheet, issues: required.map(([, name]) => ({ sheet: target.sheet, row: 1, column: name as string, message: `${name} 열을 찾지 못했습니다.` })) };
    const issues: ImportIssue[] = [];
    const items: CostLedgerItem[] = [];
    let category = "미분류";
    for (let i = 1; i < target.data.length; i += 1) {
      const row = target.data[i] ?? [];
      const name = text(row[nameIndex]);
      if (!name) continue;
      const nextCategory = text(row[categoryIndex]);
      if (nextCategory) category = nextCategory;
      const packQuantity = number(row[sizeIndex]);
      const packPrice = number(row[priceIndex]);
      if (!text(row[unitIndex]) || !Number.isFinite(packQuantity) || packQuantity <= 0 || !Number.isFinite(packPrice) || packPrice < 0) {
        issues.push({ sheet: target.sheet, row: i + 1, value: name, message: "단위·구매용량·부가세 제외 가격을 확인해 주세요." });
        continue;
      }
      items.push({ name, category, unit: text(row[unitIndex]), packQuantity, packPrice, effectiveDate: dateText(row[updatedIndex]), note: text(row[noteIndex]) || undefined, row: i + 1 });
    }
    return { items, issues, sheet: target.sheet };
  } catch {
    return { items: [], issues: [{ sheet: "파일", message: "원가 원장을 읽지 못했습니다. 암호를 해제한 .xlsx 파일인지 확인해 주세요." }] };
  }
}

function stableId(value: string): string {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `MAT-${hash.toString(36).toUpperCase()}`;
}

export function mergeCostLedger(data: CafeDataset, items: CostLedgerItem[]): { data: CafeDataset; added: number; updated: number } {
  const materials = [...data.materials];
  const priceHistory = [...data.priceHistory];
  const supplierId = "SUP-COST-LEDGER";
  const suppliers = data.suppliers.some((row) => row.supplierId === supplierId) ? [...data.suppliers] : [...data.suppliers, { supplierId, name: "발주처 원가 원장", dataClass: "실제" }];
  let added = 0;
  let updated = 0;
  for (const item of items) {
    const existing = materials.find((row) => row.name === item.name && row.unit === item.unit && Number(row.packQuantity) === item.packQuantity);
    const materialId = String(existing?.materialId ?? stableId(`${item.name}|${item.unit}|${item.packQuantity}`));
    const next: DataRow = { ...(existing ?? {}), materialId, name: item.name, unit: item.unit, packQuantity: item.packQuantity, basePackPrice: item.packPrice, supplierId, category: item.category, note: item.note, updatedAt: item.effectiveDate, leadDays: Number(existing?.leadDays ?? 0), safetyDays: Number(existing?.safetyDays ?? 0) };
    if (existing) { const index = materials.indexOf(existing); materials[index] = next; updated += 1; } else { materials.push(next); added += 1; }
    const hasPrice = priceHistory.some((row) => row.materialId === materialId && row.effectiveDate === item.effectiveDate && Number(row.packPrice) === item.packPrice && Number(row.packQuantity) === item.packQuantity);
    if (!hasPrice) priceHistory.push({ materialId, effectiveDate: item.effectiveDate, packPrice: item.packPrice, packQuantity: item.packQuantity });
  }
  return { data: { ...data, suppliers, materials, priceHistory }, added, updated };
}
