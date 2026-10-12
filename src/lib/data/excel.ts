import type { CafeDataset, DataRow, ImportIssue } from "./types";
import { mapRow } from "./normalize";
import { validateDataset } from "./schema";

type Cell = string | number | boolean | Date | null;
type Column = { header: string; key: string };
type SheetConfig = { sheet: string; section: keyof Omit<CafeDataset, "meta">; columns: Column[] };

export const sheetConfigs: SheetConfig[] = [
  { sheet: "공급사", section: "suppliers", columns: [["공급사ID","supplierId"],["공급사명","name"],["데이터구분","dataClass"]].map(([header,key])=>({header,key})) },
  { sheet: "재료", section: "materials", columns: [["재료ID","materialId"],["재료명","name"],["기준단위","unit"],["구매용량","packQuantity"],["최초구매가격","basePackPrice"],["납기영업일","leadDays"],["안전재고영업일","safetyDays"],["공급사ID","supplierId"]].map(([header,key])=>({header,key})) },
  { sheet: "메뉴", section: "menus", columns: [["메뉴ID","menuId"],["메뉴명","name"],["판매기준가","price"],["분류","category"],["레시피버전","recipeVersion"]].map(([header,key])=>({header,key})) },
  { sheet: "레시피", section: "recipes", columns: [["레시피버전","recipeVersion"],["메뉴ID","menuId"],["재료ID","materialId"],["개당사용량","quantity"],["단위","unit"],["적용채널","channelOnly"]].map(([header,key])=>({header,key})) },
  { sheet: "재료가격이력", section: "priceHistory", columns: [["재료ID","materialId"],["적용시작일","effectiveDate"],["구매가격","packPrice"],["구매용량","packQuantity"]].map(([header,key])=>({header,key})) },
  { sheet: "영업달력", section: "calendar", columns: [["일자","date"],["영업여부","isOpen"],["마감여부","recordComplete"],["날씨","weather"],["메모","note"]].map(([header,key])=>({header,key})) },
  { sheet: "판매기록", section: "sales", columns: [["판매ID","saleId"],["일자","date"],["메뉴ID","menuId"],["판매채널","channel"],["판매수량","quantity"],["판매당시단가","unitPrice"],["할인금액","discountAmount"],["순매출","netSales"],["결제수수료","paymentFee"],["레시피버전","recipeVersion"],["개당식재료원가","unitFoodCostSnapshot"],["개당포장원가","unitPackagingCostSnapshot"]].map(([header,key])=>({header,key})) },
  { sheet: "초기재고", section: "openingInventory", columns: [["재료ID","materialId"],["기준일","date"],["재고수량","quantity"],["단위","unit"]].map(([header,key])=>({header,key})) },
  { sheet: "재고기록", section: "inventoryEvents", columns: [["기록ID","eventId"],["일자","date"],["재료ID","materialId"],["유형","eventType"],["증감수량","quantity"],["단위","unit"],["사유","reason"],["입고단위원가","unitCost"],["공급사ID","supplierId"],["실측수량","countedQuantity"]].map(([header,key])=>({header,key})) },
  { sheet: "월비용계획", section: "monthlyExpensePlan", columns: [["귀속월","month"],["비용항목","category"],["월금액","amount"]].map(([header,key])=>({header,key})) },
  { sheet: "비용기록", section: "expenses", columns: [["비용ID","expenseId"],["귀속일","date"],["비용항목","category"],["금액","amount"],["배분기준","recognition"]].map(([header,key])=>({header,key})) },
  { sheet: "자료정보", section: "settings", columns: [["구분","group"],["항목","key"],["값","value"]].map(([header,key])=>({header,key})) },
];

const metaKeys: Record<string, string> = { dataset_id: "datasetId", version: "version", data_class: "dataClass", store_name: "storeName", start_date: "startDate", as_of: "asOf", currency: "currency", amount_basis: "amountBasis", source: "source", seed: "seed" };

function cellValue(value: Cell | undefined): string | number | boolean | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return value === undefined || value === "" ? null : value;
}

export async function parseExcel(file: File): Promise<{ data?: CafeDataset; issues: ImportIssue[]; ignoredSheets: string[] }> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { issues: [{ sheet: "파일", message: ".xlsx 파일만 가져올 수 있습니다." }], ignoredSheets: [] };
  if (file.size > 10 * 1024 * 1024) return { issues: [{ sheet: "파일", message: "파일이 10MB보다 큽니다. 기록을 나누거나 불필요한 내용을 지워 주세요." }], ignoredSheets: [] };
  try {
    const readExcelFile = (await import("read-excel-file/browser")).default;
    const sheets = await readExcelFile(file) as Array<{ sheet: string; data: Cell[][] }>;
    const byName = new Map(sheets.map((x) => [x.sheet, x.data]));
    const issues: ImportIssue[] = [];
    const sections: Record<string, DataRow[]> = {};
    const meta: Record<string, unknown> = {};
    const settings: DataRow[] = [];
    for (const config of sheetConfigs) {
      const rows = byName.get(config.sheet);
      if (!rows) { issues.push({ sheet: config.sheet, message: "필수 시트가 없습니다." }); continue; }
      const headers = (rows[0] ?? []).map(String);
      config.columns.forEach((column, index) => { if (headers[index] !== column.header) issues.push({ sheet: config.sheet, row: 1, column: column.header, value: headers[index], message: `열 이름과 순서가 달라요. ${index + 1}번째 열은 '${column.header}'이어야 합니다.` }); });
      if (issues.some((issue) => issue.sheet === config.sheet && issue.row === 1)) continue;
      const parsed = rows.slice(1).filter((row) => row.some((value) => value !== null && value !== "")).map((row) => Object.fromEntries(config.columns.map((column, index) => [column.key, cellValue(row[index])]))) as DataRow[];
      if (config.sheet === "자료정보") {
        parsed.forEach((row) => {
          if (row.group === "meta" && typeof row.key === "string") meta[metaKeys[row.key] ?? row.key] = cellValue(row.value as Cell);
          if (row.group === "settings" && typeof row.key === "string") settings.push({ key: row.key, value: row.value });
        });
      } else sections[config.section] = parsed.map((row) => mapRow(row, config.section));
    }
    if (issues.length) return { issues, ignoredSheets: [] };
    const candidate = { meta: mapRow(meta, "meta"), ...sections, settings };
    const checked = validateDataset(candidate);
    const required = new Set(sheetConfigs.map((x) => x.sheet));
    return { ...checked, ignoredSheets: sheets.map((x) => x.sheet).filter((name) => !required.has(name)) };
  } catch {
    return { issues: [{ sheet: "파일", message: "파일이 손상되었거나 암호가 설정되어 읽을 수 없습니다." }], ignoredSheets: [] };
  }
}

export async function downloadExcelTemplate(): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "카페 운영관리";
  const guide = workbook.addWorksheet("데이터안내");
  guide.addRows([["카페 운영자료 가져오기 양식"], ["작성 방법"], ["각 시트의 첫 행 이름과 순서를 바꾸지 마세요."], ["날짜 예시: 2026-10-12 / 영업여부 예시: TRUE"], ["예시는 이 안내 시트에만 있으며 운영자료로 가져오지 않습니다."]]);
  guide.getColumn(1).width = 72;
  for (const config of sheetConfigs) {
    const sheet = workbook.addWorksheet(config.sheet);
    sheet.addRow(config.columns.map((x) => x.header));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C1810" } };
    config.columns.forEach((_column, index) => { sheet.getColumn(index + 1).width = 18; });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }
  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `카페운영_가져오기양식_${stampDate()}.xlsx`);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stampDate(date = new Date()) { return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", ""); }
