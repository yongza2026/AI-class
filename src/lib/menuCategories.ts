import type { DataRow } from "./data/types";

const GENERIC_DRINK_CATEGORIES = new Set(["음료", "drink", "drinks", "beverage", "beverages"]);

const includesAny = (value: string, keywords: string[]) => keywords.some((keyword) => value.includes(keyword));

export function displayMenuCategory(menu: DataRow): string {
  const savedCategory = String(menu.category ?? "").trim();
  if (savedCategory && !GENERIC_DRINK_CATEGORIES.has(savedCategory.toLowerCase())) return savedCategory;

  const name = String(menu.name ?? "").toLowerCase().replaceAll(" ", "");
  if (includesAny(name, ["에이드", "주스", "juice", "ade", "레모네이드", "lemonade"])) return "에이드·주스";
  if (includesAny(name, ["말차", "녹차", "초콜릿", "초코", "딸기", "고구마", "밀크티", "matcha", "chocolate", "strawberry", "milktea"])) return "논커피";
  if (includesAny(name, ["아메리카노", "에스프레소", "카페라떼", "바닐라라떼", "카푸치노", "마키아토", "플랫화이트", "콜드브루", "모카", "americano", "espresso", "cafelatte", "vanillalatte", "cappuccino", "macchiato", "flatwhite", "coldbrew"])) return "커피";
  if (includesAny(name, ["티", "차", "tea"])) return "티";
  return savedCategory || "미분류";
}

export function menusByDisplayCategory(menus: DataRow[]) {
  const grouped = new Map<string, DataRow[]>();
  for (const menu of menus) {
    const category = displayMenuCategory(menu);
    grouped.set(category, [...(grouped.get(category) ?? []), menu]);
  }
  return [...grouped.entries()]
    .map(([category, rows]) => ({ category, menus: rows.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "ko")) }))
    .sort((a, b) => a.category.localeCompare(b.category, "ko"));
}
