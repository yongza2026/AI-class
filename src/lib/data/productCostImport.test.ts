import "fake-indexeddb/auto";
import { afterAll, describe, expect, it } from "vitest";
import readExcelFile from "read-excel-file/node";
import ExcelJS from "exceljs";
import { emptyDataset } from "./migration";
import { mergeProductCostWorkbook, parseProductCostSheets, parseProductCostWorkbook } from "./productCostImport";
import { calculateProductCost } from "../costing";
import { calculateInventory } from "../calculations";
import { db, readDataset, replaceDataset } from "./database";
import { validateDataset } from "./schema";

const date = "2026-10-20";
const sheets = () => [
  { sheet: "제품목록", data: [["제품코드", "제품명", "제품분류", "판매가"], ["P-001", "시그니처 라떼", "커피", 6500]] },
  { sheet: "재료단가", data: [["재료명", "단위", "구매용량", "구매가격(VAT 제외)", "단위당원가", "분류", "비고"], ["우유", "ml", 1000, 2500, 2.5, "식재료", ""], ["원두", "g", 1000, 28000, 28, "식재료", ""]] },
  { sheet: "레시피입력", data: [["제품코드", "제품명", "재료명", "1개당 사용량", "단위"], ["P-001", "시그니처 라떼", "우유", 180, "ml"], ["P-001", "시그니처 라떼", "원두", 18, "g"]] },
];
const parsed = () => parseProductCostSheets(sheets(), date);

describe("제품 원가 엑셀 가져오기", () => {
  it("제품·재료·레시피를 연결하고 원가 954원, 원가율 14.7%를 계산한다", () => {
    const before = emptyDataset(date);
    const merged = mergeProductCostWorkbook(before, parsed());
    expect(merged.issues).toEqual([]);
    expect(merged.productsAdded).toBe(1);
    expect(merged.materialsAdded).toBe(2);
    expect(merged.recipeLines).toBe(2);
    const cost = calculateProductCost(merged.data, merged.menuIds[0]);
    expect(cost?.unitCost).toBe(954);
    expect(cost?.costRate?.toFixed(1)).toBe("14.7");
    expect(before.menus).toHaveLength(0);
    expect(validateDataset(merged.data).issues).toEqual([]);
  });

  it("같은 파일을 다시 올려도 ID·레시피·가격 이력이 늘어나지 않는다", () => {
    const first = mergeProductCostWorkbook(emptyDataset(date), parsed());
    const second = mergeProductCostWorkbook(first.data, parsed());
    expect(second.data).toEqual(first.data);
    expect(second.productsAdded).toBe(0);
    expect(second.materialsAdded).toBe(0);
  });

  it("레시피를 바꿔도 과거 판매·재고 차감은 기존 버전을 유지한다", () => {
    const first = mergeProductCostWorkbook(emptyDataset(date), parsed());
    const menuId = first.menuIds[0];
    const materialId = first.data.materials[0].materialId;
    first.data.sales = [{ saleId: "S1", menuId, date, quantity: 2, channel: "매장", recipeVersion: first.data.menus[0].recipeVersion, unitFoodCostSnapshot: 954 }];
    first.data.openingInventory = [{ materialId, date, quantity: 1000, unit: "ml" }];
    const beforeInventory = calculateInventory(first.data);
    const nextSheets = sheets();
    nextSheets[2].data[1][3] = 300;
    nextSheets[1].data[1][3] = 3000;
    const merged = mergeProductCostWorkbook(first.data, parseProductCostSheets(nextSheets, date));
    expect(merged.issues).toEqual([]);
    expect(merged.data.menus[0].recipeVersion).not.toBe(first.data.menus[0].recipeVersion);
    expect(merged.data.recipes).toEqual(expect.arrayContaining(first.data.recipes));
    expect(merged.data.sales).toEqual(first.data.sales);
    expect(calculateInventory(merged.data).map((row) => row.current)).toEqual(beforeInventory.map((row) => row.current));
    expect(merged.data.priceHistory).toHaveLength(2);
    expect(calculateProductCost(merged.data, menuId)?.unitCost).toBe(1404);
  });

  it.each([null, "", -1, "가격 미정", Infinity])("빈 가격·잘못된 가격을 0원으로 저장하지 않는다: %s", (price) => {
    const input: Array<{ sheet: string; data: unknown[][] }> = sheets();
    input[1].data[1][3] = price;
    const data = emptyDataset(date);
    const result = mergeProductCostWorkbook(data, parseProductCostSheets(input, date));
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.data).toBe(data);
  });

  it("0원은 명시하면 정상적으로 허용하고 쉼표 포함 숫자를 읽는다", () => {
    const input = sheets();
    input[1].data[1][3] = 0;
    input[0].data[1][3] = "6,500";
    const result = mergeProductCostWorkbook(emptyDataset(date), parseProductCostSheets(input, date));
    expect(result.issues).toEqual([]);
    expect(calculateProductCost(result.data, result.menuIds[0])?.unitCost).toBe(504);
  });

  it("중복 행, 모르는 제품, 단위 불일치, 레시피 누락은 전체 저장을 막는다", () => {
    for (const change of [
      (input: ReturnType<typeof sheets>) => input[2].data.push([...input[2].data[1]]),
      (input: ReturnType<typeof sheets>) => { input[2].data[1][0] = "P-999"; },
      (input: ReturnType<typeof sheets>) => { input[2].data[1][4] = "g"; },
      (input: ReturnType<typeof sheets>) => { input[2].data.splice(1); },
      (input: ReturnType<typeof sheets>) => input[0].data.push([...input[0].data[1]]),
    ]) {
      const input = sheets(); change(input);
      const data = emptyDataset(date);
      const result = mergeProductCostWorkbook(data, parseProductCostSheets(input, date));
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.data).toBe(data);
    }
  });

  it("같은 이름·단위의 기존 품목이 여러 개면 임의로 선택하지 않는다", () => {
    const first = mergeProductCostWorkbook(emptyDataset(date), parsed()).data;
    first.materials.push({ ...first.materials[0], materialId: "DUPLICATE" });
    expect(mergeProductCostWorkbook(first, parsed()).issues.some((issue) => issue.message.includes("여러 개"))).toBe(true);
  });

  it("실제 제공하는 양식을 채워 읽고 저장·다시 읽기·백업 검사를 통과한다", async () => {
    const templatePath = "public/templates/POCO_제품원가_업로드양식.xlsx";
    const blank = await readExcelFile(templatePath);
    expect(parseProductCostSheets(blank, date).products).toHaveLength(0);
    const workbook = new ExcelJS.Workbook();
    for (const source of sheets()) {
      const sheet = workbook.addWorksheet(source.sheet);
      sheet.addRow(source.data[0]);
      source.data.slice(1).forEach((row, index) => row.forEach((cell, col) => { sheet.getCell(index + 2, col + 1).value = cell; }));
    }
    const bytes = await workbook.xlsx.writeBuffer();
    const filled = await readExcelFile(Buffer.from(bytes));
    const imported = parseProductCostSheets(filled, date);
    expect(imported.issues).toEqual([]);
    const merged = mergeProductCostWorkbook(emptyDataset(date), imported);
    await replaceDataset(merged.data);
    const stored = await readDataset();
    expect(stored?.menus[0].importCode).toBe("P-001");
    expect(validateDataset(stored).data?.menus[0].importCode).toBe("P-001");
    expect(calculateProductCost(stored!, merged.menuIds[0])?.unitCost).toBe(954);
  });

  it("파일 형식과 용량 제한을 읽기 전에 검사한다", async () => {
    expect((await parseProductCostWorkbook(new File(["x"], "wrong.csv"), date)).issues[0].message).toContain(".xlsx");
    expect((await parseProductCostWorkbook(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.xlsx"), date)).issues[0].message).toContain("10MB");
  });
});

afterAll(async () => db.delete());
