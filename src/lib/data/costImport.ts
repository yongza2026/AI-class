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
const headerText = (value: unknown) => text(value).replace(/[\s_*()（）[\]【】]/g, "").toLowerCase();

function findColumn(headers: unknown[], names: string[]): number {
  const wanted = names.map(headerText);
  return headers.findIndex((header) => wanted.includes(headerText(header)));
}

function unitFromSpec(value: unknown): string {
  const raw = text(value).replace(/[()（）]/g, "").trim();
  return raw || "개";
}

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
    const target = sheets.find((sheet) => sheet.sheet === "원가용 재료목록") ?? sheets.find((sheet) => sheet.data.some((row) => row.some((cell) => ["재료명", "품명", "상품명", "품목명"].map(headerText).includes(headerText(cell)))));
    if (!target) return { items: [], issues: [{ sheet: "원가용 재료목록", message: "재료명·품명·상품명이 있는 원장 시트를 찾지 못했습니다." }] };
    const headerRowIndex = target.data.findIndex((row) => row.some((cell) => ["재료명", "품명", "상품명", "품목명"].map(headerText).includes(headerText(cell))));
    const headers = target.data[headerRowIndex] ?? [];
    const nameIndex = findColumn(headers, ["재료명", "품명", "상품명", "품목명"]);
    const unitIndex = findColumn(headers, ["단위"]);
    const specIndex = findColumn(headers, ["사이즈", "규격", "포장단위"]);
    const priceIndex = findColumn(headers, ["가격(원)(부가세미포함)", "구매가격", "단가", "매입가", "공급가액"]);
    const quantityIndex = findColumn(headers, ["수량", "구매수량"]);
    const categoryIndex = findColumn(headers, ["분류", "품목분류", "카테고리"]);
    const updatedIndex = findColumn(headers, ["갱신일시", "날짜", "거래일", "작성일"]);
    const noteIndex = findColumn(headers, ["구매링크및 비고", "품목메모", "비고", "메모"]);
    const ledgerMode = findColumn(headers, ["품명", "상품명", "품목명"]) >= 0 || findColumn(headers, ["단가", "공급가액", "매입가"]) >= 0;
    const requiredCandidates: Array<[number, string]> = ledgerMode
      ? [[nameIndex, "품명/상품명"], [priceIndex, "단가/공급가액"]]
      : [[nameIndex, "재료명"], [unitIndex, "단위"], [specIndex, "사이즈"], [priceIndex, "가격(원)(부가세미포함)"]];
    const required = requiredCandidates.filter((entry) => Number(entry[0]) < 0);
    if (required.length) return { items: [], sheet: target.sheet, issues: required.map(([, name]) => ({ sheet: target.sheet, row: 1, column: name as string, message: `${name} 열을 찾지 못했습니다.` })) };
    const issues: ImportIssue[] = [];
    const items: CostLedgerItem[] = [];
    let category = "미분류";
    for (let i = headerRowIndex + 1; i < target.data.length; i += 1) {
      const row = target.data[i] ?? [];
      const name = text(row[nameIndex]);
      if (!name) continue;
      const nextCategory = text(row[categoryIndex]);
      if (nextCategory) category = nextCategory;
      const quantity = number(row[quantityIndex]);
      const unit = text(row[unitIndex]) || unitFromSpec(row[specIndex]);
      const rawPrice = number(row[priceIndex]);
      const packQuantity = ledgerMode ? 1 : number(row[specIndex]);
      const packPrice = ledgerMode && !Number.isFinite(rawPrice) && Number.isFinite(quantity) && quantity > 0 ? number(row[findColumn(headers, ["공급가액", "합계금액"])]) / quantity : (ledgerMode ? rawPrice : rawPrice);
      if (!unit || !Number.isFinite(packQuantity) || packQuantity <= 0 || !Number.isFinite(packPrice) || packPrice < 0) {
        issues.push({ sheet: target.sheet, row: i + 1, value: name, message: "단위·구매용량·부가세 제외 가격을 확인해 주세요." });
        continue;
      }
      items.push({ name, category, unit, packQuantity, packPrice, effectiveDate: dateText(row[updatedIndex]), note: text(row[noteIndex]) || undefined, row: i + 1 });
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
    const existing = materials.find((row) => row.name === item.name && row.unit === item.unit && Number(row.packQuantity) === item.packQuantity)
      ?? materials.find((row) => row.name === item.name && row.unit === item.unit);
    const materialId = String(existing?.materialId ?? stableId(`${item.name}|${item.unit}|${item.packQuantity}`));
    const next: DataRow = { ...(existing ?? {}), materialId, name: item.name, unit: item.unit, packQuantity: item.packQuantity, basePackPrice: item.packPrice, supplierId, category: item.category, note: item.note, updatedAt: item.effectiveDate, leadDays: Number(existing?.leadDays ?? 0), safetyDays: Number(existing?.safetyDays ?? 0) };
    if (existing) { const index = materials.indexOf(existing); materials[index] = next; updated += 1; } else { materials.push(next); added += 1; }
    const hasPrice = priceHistory.some((row) => row.materialId === materialId && row.effectiveDate === item.effectiveDate && Number(row.packPrice) === item.packPrice && Number(row.packQuantity) === item.packQuantity);
    if (!hasPrice) priceHistory.push({ materialId, effectiveDate: item.effectiveDate, packPrice: item.packPrice, packQuantity: item.packQuantity });
  }
  return { data: { ...data, suppliers, materials, priceHistory }, added, updated };
}
