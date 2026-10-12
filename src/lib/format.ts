export const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
export const qty = (value: number, unit: string) => `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value)}${unit}`;
export const rate = (value: number | null) => value === null ? "계산 불가" : `${value.toFixed(1)}%`;
export const valueOf = (row: Record<string, unknown>, key: string) => String(row[key] ?? "");
export const numberOf = (row: Record<string, unknown>, key: string) => Number(row[key] ?? 0);
