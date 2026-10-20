import type { CafeDataset, DataRow, ImportIssue } from "./types";

type SheetRows = { sheet: string; data: unknown[][] };

export type ProductCostProduct = {
  code: string;
  name: string;
  category: string;
  price: number;
  row: number;
};

export type ProductCostMaterial = {
  name: string;
  unit: string;
  packQuantity: number;
  packPrice: number;
  category: string;
  note?: string;
  effectiveDate: string;
  row: number;
};

export type ProductCostRecipe = {
  productCode: string;
  productName: string;
  materialName: string;
  quantity: number;
  unit: string;
  row: number;
};

export type ProductCostImportResult = {
  products: ProductCostProduct[];
  materials: ProductCostMaterial[];
  recipes: ProductCostRecipe[];
  issues: ImportIssue[];
};

export type ProductCostMergeResult = {
  data: CafeDataset;
  issues: ImportIssue[];
  menuIds: string[];
  productsAdded: number;
  productsUpdated: number;
  materialsAdded: number;
  materialsUpdated: number;
  recipeLines: number;
};

const text = (value: unknown) => String(value ?? "").trim();
const normalized = (value: unknown) => text(value).replace(/\s+/g, " ").toLocaleLowerCase("ko");
const headerText = (value: unknown) => normalized(value).replace(/[\s_*()（）[\]【】·/\-.]/g, "");
const number = (value: unknown) => value == null || text(value) === "" || typeof value === "boolean" ? NaN : typeof value === "number" ? value : Number(text(value).replaceAll(",", "").replace(/원$/, ""));

function findColumn(headers: unknown[], names: string[]): number {
  const wanted = names.map(headerText);
  return headers.findIndex((header) => wanted.includes(headerText(header)));
}

function findSheet(sheets: SheetRows[], name: string, identifyingHeaders: string[]): SheetRows | undefined {
  return sheets.find((sheet) => sheet.sheet === name) ?? sheets.find((sheet) => sheet.data.some((row) => identifyingHeaders.some((header) => row.some((cell) => headerText(cell) === headerText(header)))));
}

function headerRowIndex(sheet: SheetRows, identifyingHeaders: string[]): number {
  return sheet.data.findIndex((row) => identifyingHeaders.some((header) => row.some((cell) => headerText(cell) === headerText(header))));
}

function dateText(value: unknown, fallback: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const match = text(value).match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : fallback;
}

export async function parseProductCostWorkbook(file: File, fallbackDate: string): Promise<ProductCostImportResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) return emptyResult([{ sheet: "파일", message: ".xlsx 파일만 가져올 수 있습니다." }]);
  if (file.size > 10 * 1024 * 1024) return emptyResult([{ sheet: "파일", message: "파일이 10MB보다 큽니다." }]);
  try {
    const readExcelFile = (await import("read-excel-file/browser")).default;
    const sheets = await readExcelFile(file) as SheetRows[];
    return parseProductCostSheets(sheets, fallbackDate);
  } catch {
    return emptyResult([{ sheet: "파일", message: "제품 원가 파일을 읽지 못했습니다. 암호를 해제한 .xlsx 파일인지 확인해 주세요." }]);
  }
}

export function parseProductCostSheets(sheets: SheetRows[], fallbackDate: string): ProductCostImportResult {
  const issues: ImportIssue[] = [];
  const products: ProductCostProduct[] = [];
  const materials: ProductCostMaterial[] = [];
  const recipes: ProductCostRecipe[] = [];
  const productSheet = findSheet(sheets, "제품목록", ["제품명", "메뉴명"]);
  const materialSheet = findSheet(sheets, "재료단가", ["재료명", "품목명"]);
  const recipeSheet = findSheet(sheets, "레시피입력", ["1개당 사용량", "사용량"]);
  if (!productSheet) issues.push({ sheet: "제품목록", message: "제품목록 시트를 찾지 못했습니다." });
  if (!materialSheet) issues.push({ sheet: "재료단가", message: "재료단가 시트를 찾지 못했습니다." });
  if (!recipeSheet) issues.push({ sheet: "레시피입력", message: "레시피입력 시트를 찾지 못했습니다." });
  if (issues.length) return { products, materials, recipes, issues };

  const productHeaderRow = headerRowIndex(productSheet!, ["제품명", "메뉴명"]);
  const productHeaders = productSheet!.data[productHeaderRow] ?? [];
  const productCodeIndex = findColumn(productHeaders, ["제품코드", "메뉴ID", "제품ID"]);
  const productNameIndex = findColumn(productHeaders, ["제품명", "메뉴명"]);
  const productCategoryIndex = findColumn(productHeaders, ["제품분류", "분류", "카테고리"]);
  const productPriceIndex = findColumn(productHeaders, ["판매가", "판매기준가", "가격"]);
  for (const [index, label] of [[productNameIndex, "제품명"], [productPriceIndex, "판매가"]] as const) {
    if (index < 0) issues.push({ sheet: productSheet!.sheet, row: productHeaderRow + 1, column: label, message: `${label} 열을 찾지 못했습니다.` });
  }
  if (productNameIndex >= 0 && productPriceIndex >= 0) {
    for (let index = productHeaderRow + 1; index < productSheet!.data.length; index += 1) {
      const row = productSheet!.data[index] ?? [];
      const name = text(row[productNameIndex]);
      const code = productCodeIndex >= 0 ? text(row[productCodeIndex]) : "";
      if (!name && !code) continue;
      const price = number(row[productPriceIndex]);
      if (!name || !Number.isFinite(price) || price < 0) {
        issues.push({ sheet: productSheet!.sheet, row: index + 1, value: name || code, message: "제품명과 0원 이상의 판매가를 확인해 주세요." });
        continue;
      }
      products.push({ code, name, category: productCategoryIndex >= 0 ? text(row[productCategoryIndex]) || "기타" : "기타", price, row: index + 1 });
    }
  }

  const materialHeaderRow = headerRowIndex(materialSheet!, ["재료명", "품목명"]);
  const materialHeaders = materialSheet!.data[materialHeaderRow] ?? [];
  const materialNameIndex = findColumn(materialHeaders, ["재료명", "품목명"]);
  const materialUnitIndex = findColumn(materialHeaders, ["단위", "기준단위"]);
  const packQuantityIndex = findColumn(materialHeaders, ["구매용량", "사이즈", "포장용량"]);
  const packPriceIndex = findColumn(materialHeaders, ["구매가격(VAT 제외)", "구매가격", "매입가", "공급가액"]);
  const materialCategoryIndex = findColumn(materialHeaders, ["분류", "카테고리"]);
  const materialNoteIndex = findColumn(materialHeaders, ["비고", "메모"]);
  const effectiveDateIndex = findColumn(materialHeaders, ["적용일", "갱신일", "날짜"]);
  for (const [index, label] of [[materialNameIndex, "재료명"], [materialUnitIndex, "단위"], [packQuantityIndex, "구매용량"], [packPriceIndex, "구매가격(VAT 제외)"]] as const) {
    if (index < 0) issues.push({ sheet: materialSheet!.sheet, row: materialHeaderRow + 1, column: label, message: `${label} 열을 찾지 못했습니다.` });
  }
  if ([materialNameIndex, materialUnitIndex, packQuantityIndex, packPriceIndex].every((index) => index >= 0)) {
    for (let index = materialHeaderRow + 1; index < materialSheet!.data.length; index += 1) {
      const row = materialSheet!.data[index] ?? [];
      const name = text(row[materialNameIndex]);
      if (!name) continue;
      const unit = text(row[materialUnitIndex]);
      const packQuantity = number(row[packQuantityIndex]);
      const packPrice = number(row[packPriceIndex]);
      if (!unit || !Number.isFinite(packQuantity) || packQuantity <= 0 || !Number.isFinite(packPrice) || packPrice < 0) {
        issues.push({ sheet: materialSheet!.sheet, row: index + 1, value: name, message: "단위·구매용량·VAT 제외 구매가격을 확인해 주세요." });
        continue;
      }
      materials.push({ name, unit, packQuantity, packPrice, category: materialCategoryIndex >= 0 ? text(row[materialCategoryIndex]) || "미분류" : "미분류", note: materialNoteIndex >= 0 ? text(row[materialNoteIndex]) || undefined : undefined, effectiveDate: effectiveDateIndex >= 0 ? dateText(row[effectiveDateIndex], fallbackDate) : fallbackDate, row: index + 1 });
    }
  }

  const recipeHeaderRow = headerRowIndex(recipeSheet!, ["1개당 사용량", "사용량"]);
  const recipeHeaders = recipeSheet!.data[recipeHeaderRow] ?? [];
  const recipeCodeIndex = findColumn(recipeHeaders, ["제품코드", "메뉴ID", "제품ID"]);
  const recipeProductNameIndex = findColumn(recipeHeaders, ["제품명", "메뉴명"]);
  const recipeMaterialNameIndex = findColumn(recipeHeaders, ["재료명", "품목명"]);
  const recipeQuantityIndex = findColumn(recipeHeaders, ["1개당 사용량", "개당사용량", "사용량"]);
  const recipeUnitIndex = findColumn(recipeHeaders, ["단위", "기준단위"]);
  for (const [index, label] of [[recipeMaterialNameIndex, "재료명"], [recipeQuantityIndex, "1개당 사용량"], [recipeUnitIndex, "단위"]] as const) {
    if (index < 0) issues.push({ sheet: recipeSheet!.sheet, row: recipeHeaderRow + 1, column: label, message: `${label} 열을 찾지 못했습니다.` });
  }
  if (recipeCodeIndex < 0 && recipeProductNameIndex < 0) issues.push({ sheet: recipeSheet!.sheet, row: recipeHeaderRow + 1, message: "제품코드 또는 제품명 열이 필요합니다." });
  if ([recipeMaterialNameIndex, recipeQuantityIndex, recipeUnitIndex].every((index) => index >= 0) && (recipeCodeIndex >= 0 || recipeProductNameIndex >= 0)) {
    for (let index = recipeHeaderRow + 1; index < recipeSheet!.data.length; index += 1) {
      const row = recipeSheet!.data[index] ?? [];
      const productCode = recipeCodeIndex >= 0 ? text(row[recipeCodeIndex]) : "";
      const productName = recipeProductNameIndex >= 0 ? text(row[recipeProductNameIndex]) : "";
      const materialName = text(row[recipeMaterialNameIndex]);
      if (!productCode && !productName && !materialName) continue;
      const quantity = number(row[recipeQuantityIndex]);
      const unit = text(row[recipeUnitIndex]);
      if ((!productCode && !productName) || !materialName || !unit || !Number.isFinite(quantity) || quantity <= 0) {
        issues.push({ sheet: recipeSheet!.sheet, row: index + 1, value: materialName, message: "제품코드(또는 제품명)·재료명·0보다 큰 사용량·단위를 확인해 주세요." });
        continue;
      }
      recipes.push({ productCode, productName, materialName, quantity, unit, row: index + 1 });
    }
  }

  duplicateIssues(products, materials, recipes, issues);
  if (!products.length) issues.push({ sheet: "제품목록", message: "가져올 제품이 없습니다." });
  if (!recipes.length) issues.push({ sheet: "레시피입력", message: "가져올 레시피가 없습니다." });
  return { products, materials, recipes, issues };
}

function duplicateIssues(products: ProductCostProduct[], materials: ProductCostMaterial[], recipes: ProductCostRecipe[], issues: ImportIssue[]) {
  const productCodes = new Set<string>();
  const productNames = new Set<string>();
  for (const item of products) {
    const code = normalized(item.code);
    const name = normalized(item.name);
    if (code && productCodes.has(code)) issues.push({ sheet: "제품목록", row: item.row, value: item.code, message: "제품코드가 파일 안에서 중복되었습니다." });
    if (productNames.has(name)) issues.push({ sheet: "제품목록", row: item.row, value: item.name, message: "제품명이 파일 안에서 중복되었습니다." });
    if (code) productCodes.add(code);
    productNames.add(name);
  }
  const materialKeys = new Set<string>();
  for (const item of materials) {
    const key = `${normalized(item.name)}|${normalized(item.unit)}`;
    if (materialKeys.has(key)) issues.push({ sheet: "재료단가", row: item.row, value: item.name, message: "같은 재료명과 단위가 파일 안에서 중복되었습니다." });
    materialKeys.add(key);
  }
  const recipeKeys = new Set<string>();
  for (const item of recipes) {
    const key = `${normalized(item.productCode || item.productName)}|${normalized(item.materialName)}|${normalized(item.unit)}`;
    if (recipeKeys.has(key)) issues.push({ sheet: "레시피입력", row: item.row, value: item.materialName, message: "같은 제품·재료·단위가 레시피에서 중복되었습니다." });
    recipeKeys.add(key);
  }
}

export function mergeProductCostWorkbook(data: CafeDataset, imported: ProductCostImportResult): ProductCostMergeResult {
  const issues = [...imported.issues];
  if (issues.length) return unchanged(data, issues);
  const materials = [...data.materials];
  const priceHistory = [...data.priceHistory];
  const menus = [...data.menus];
  const recipes = [...data.recipes];
  const supplierId = "SUP-PRODUCT-COST";
  const suppliers = data.suppliers.some((row) => row.supplierId === supplierId) ? [...data.suppliers] : [...data.suppliers, { supplierId, name: "제품 원가 엑셀", dataClass: "실제" }];
  let materialsAdded = 0;
  let materialsUpdated = 0;
  let productsAdded = 0;
  let productsUpdated = 0;

  const materialMap = new Map<string, string>();
  for (const item of imported.materials) {
    const matches = materials.filter((row) => normalized(row.name) === normalized(item.name) && normalized(row.unit) === normalized(item.unit));
    if (matches.length > 1) { issues.push({ sheet: "재료단가", row: item.row, value: item.name, message: "홈페이지에 같은 이름·단위의 재료가 여러 개라 자동으로 고를 수 없습니다." }); continue; }
    const existing = matches[0];
    const materialId = text(existing?.materialId) || `MAT-XLSX-${stableHash(`${normalized(item.name)}|${normalized(item.unit)}`)}`;
    if (item.effectiveDate > data.meta.asOf) { issues.push({ sheet: "재료단가", row: item.row, value: item.name, message: "적용일이 매장 기준일보다 늦습니다. 기준일 이전 날짜를 입력해 주세요." }); continue; }
    const next: DataRow = { ...(existing ?? {}), materialId, name: item.name, unit: text(existing?.unit) || item.unit, packQuantity: item.packQuantity, basePackPrice: item.packPrice, supplierId: text(existing?.supplierId) || supplierId, category: item.category, note: item.note ?? existing?.note ?? "", updatedAt: item.effectiveDate, leadDays: Number(existing?.leadDays ?? 0), safetyDays: Number(existing?.safetyDays ?? 0) };
    if (existing) { materials[materials.indexOf(existing)] = next; materialsUpdated += 1; } else { materials.push(next); materialsAdded += 1; }
    materialMap.set(`${normalized(item.name)}|${normalized(item.unit)}`, materialId);
    const priceRow = { materialId, effectiveDate: item.effectiveDate, packPrice: item.packPrice, packQuantity: item.packQuantity };
    const priceIndex = priceHistory.findIndex((row) => text(row.materialId) === materialId && text(row.effectiveDate) === item.effectiveDate);
    if (priceIndex >= 0) priceHistory[priceIndex] = priceRow; else priceHistory.push(priceRow);
  }

  const productMap = new Map<string, string>();
  const resolvedProductIds = new Set<string>();
  for (const item of imported.products) {
    const codeMatches = item.code ? menus.filter((row) => normalized(row.menuId) === normalized(item.code) || normalized(row.importCode) === normalized(item.code)) : [];
    const nameMatches = menus.filter((row) => normalized(row.name) === normalized(item.name));
    const matches = codeMatches.length ? codeMatches : nameMatches;
    if (matches.length > 1) { issues.push({ sheet: "제품목록", row: item.row, value: item.name, message: "홈페이지에 같은 제품코드 또는 제품명이 여러 개라 자동으로 고를 수 없습니다." }); continue; }
    const existing = matches[0];
    const menuId = text(existing?.menuId) || `M-XLSX-${stableHash(normalized(item.code || item.name))}`;
    if (resolvedProductIds.has(menuId)) { issues.push({ sheet: "제품목록", row: item.row, value: item.name, message: "두 제품이 홈페이지의 같은 제품에 연결됩니다. 제품코드와 제품명을 확인해 주세요." }); continue; }
    resolvedProductIds.add(menuId);
    const next: DataRow = { ...(existing ?? {}), menuId, name: item.name, price: item.price, category: item.category, recipeVersion: text(existing?.recipeVersion) || "v1", ...(item.code ? { importCode: item.code } : {}) };
    if (existing) { menus[menus.indexOf(existing)] = next; productsUpdated += 1; } else { menus.push(next); productsAdded += 1; }
    if (item.code) productMap.set(`code:${normalized(item.code)}`, menuId);
    productMap.set(`name:${normalized(item.name)}`, menuId);
  }

  const resolvedRecipes: Array<{ menuId: string; materialId: string; quantity: number; unit: string; row: number }> = [];
  for (const item of imported.recipes) {
    const menuId = (item.productCode ? productMap.get(`code:${normalized(item.productCode)}`) : undefined)
      ?? (!item.productCode && item.productName ? productMap.get(`name:${normalized(item.productName)}`) : undefined);
    if (!menuId) issues.push({ sheet: "레시피입력", row: item.row, value: item.productCode || item.productName, message: "제품목록 시트에 없는 제품입니다. 제품코드 또는 제품명을 확인해 주세요." });
    const materialKey = `${normalized(item.materialName)}|${normalized(item.unit)}`;
    const materialId = materialMap.get(materialKey) ?? resolveExistingMaterial(materials, item, issues);
    if (menuId && materialId) {
      const price = priceHistory.filter((row) => row.materialId === materialId && text(row.effectiveDate) <= data.meta.asOf).sort((a, b) => text(b.effectiveDate).localeCompare(text(a.effectiveDate)))[0];
      if (!price || !(Number(price.packQuantity) > 0) || !Number.isFinite(Number(price.packPrice))) issues.push({ sheet: "레시피입력", row: item.row, value: item.materialName, message: "기준일에 적용할 재료 단가가 없습니다. 재료단가 시트에 구매용량과 가격을 입력해 주세요." });
      if (resolvedRecipes.some((row) => row.menuId === menuId && row.materialId === materialId)) issues.push({ sheet: "레시피입력", row: item.row, value: item.materialName, message: "같은 제품의 재료가 중복되었습니다. 한 줄로 합쳐 주세요." });
      resolvedRecipes.push({ menuId, materialId, quantity: item.quantity, unit: text(materials.find((row) => row.materialId === materialId)?.unit), row: item.row });
    }
  }

  const importedMenuIds = [...new Set(resolvedRecipes.map((row) => row.menuId))];
  for (const product of imported.products) {
    const menuId = (product.code ? productMap.get(`code:${normalized(product.code)}`) : undefined) ?? productMap.get(`name:${normalized(product.name)}`);
    if (menuId && !importedMenuIds.includes(menuId)) issues.push({ sheet: "레시피입력", value: product.name, message: "이 제품에 연결된 레시피가 없습니다." });
  }
  if (issues.length) return unchanged(data, issues);

  for (const menuId of importedMenuIds) {
    const lines = resolvedRecipes.filter((row) => row.menuId === menuId).sort((a, b) => `${a.materialId}|${a.unit}|${a.quantity}`.localeCompare(`${b.materialId}|${b.unit}|${b.quantity}`));
    const recipeVersion = `xlsx-${stableHash(lines.map((row) => `${row.materialId}|${row.quantity}|${row.unit}`).join(";"))}`;
    const menuIndex = menus.findIndex((row) => text(row.menuId) === menuId);
    menus[menuIndex] = { ...menus[menuIndex], recipeVersion };
    for (const line of lines) {
      const next: DataRow = { recipeVersion, menuId, materialId: line.materialId, quantity: line.quantity, unit: line.unit, channelOnly: null };
      const existingIndex = recipes.findIndex((row) => text(row.recipeVersion) === recipeVersion && text(row.menuId) === menuId && text(row.materialId) === line.materialId);
      if (existingIndex >= 0) recipes[existingIndex] = next; else recipes.push(next);
    }
  }

  return { data: { ...data, suppliers, materials, priceHistory, menus, recipes }, issues: [], menuIds: importedMenuIds, productsAdded, productsUpdated, materialsAdded, materialsUpdated, recipeLines: resolvedRecipes.length };
}

function resolveExistingMaterial(materials: DataRow[], item: ProductCostRecipe, issues: ImportIssue[]): string | undefined {
  const matches = materials.filter((row) => normalized(row.name) === normalized(item.materialName) && normalized(row.unit) === normalized(item.unit));
  if (matches.length === 1) return text(matches[0].materialId);
  issues.push({ sheet: "레시피입력", row: item.row, value: item.materialName, message: matches.length ? "같은 이름·단위의 재료가 여러 개라 자동으로 고를 수 없습니다." : "재료단가 시트 또는 홈페이지에서 재료를 찾지 못했습니다." });
  return undefined;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36).toUpperCase();
}

function emptyResult(issues: ImportIssue[]): ProductCostImportResult { return { products: [], materials: [], recipes: [], issues }; }
function unchanged(data: CafeDataset, issues: ImportIssue[]): ProductCostMergeResult { return { data, issues, menuIds: [], productsAdded: 0, productsUpdated: 0, materialsAdded: 0, materialsUpdated: 0, recipeLines: 0 }; }
