import type { DataRow } from "./data/types";
import { numberOf, valueOf } from "./format";

export type DailyMenuSales = {
  key: string;
  date: string;
  menuId: string;
  records: DataRow[];
  quantity: number;
  normalSales: number;
  discount: number;
  netSales: number;
  fees: number;
};

export function groupSalesByDayAndMenu(sales: DataRow[]): DailyMenuSales[] {
  const grouped = new Map<string, DailyMenuSales>();
  for (const sale of sales) {
    const date = valueOf(sale, "date");
    const menuId = valueOf(sale, "menuId");
    const key = `${date}|${menuId}`;
    const row = grouped.get(key) ?? { key, date, menuId, records: [], quantity: 0, normalSales: 0, discount: 0, netSales: 0, fees: 0 };
    row.records.push(sale);
    row.quantity += numberOf(sale, "quantity");
    row.normalSales += numberOf(sale, "unitPrice") * numberOf(sale, "quantity");
    row.discount += numberOf(sale, "discountAmount");
    row.netSales += numberOf(sale, "netSales");
    row.fees += numberOf(sale, "paymentFee");
    grouped.set(key, row);
  }
  return [...grouped.values()].map((row) => ({
    ...row,
    records: row.records.sort((a, b) => valueOf(b, "saleId").localeCompare(valueOf(a, "saleId"))),
  })).sort((a, b) => b.date.localeCompare(a.date) || b.menuId.localeCompare(a.menuId));
}
