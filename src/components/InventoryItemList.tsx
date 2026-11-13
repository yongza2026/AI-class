"use client";
import type { InventoryRow } from "@/lib/calculations";
import type { DataRow } from "@/lib/data/types";
import { qty } from "@/lib/format";

type Props = { rows: InventoryRow[]; materials: DataRow[]; settings: boolean; onDetail: (id: string) => void; onEdit: (id: string) => void; onRecord: (id: string) => void };
export function InventoryItemList({ rows, materials, settings, onDetail, onEdit, onRecord }: Props) {
  const byId = new Map(materials.map((item) => [item.materialId, item]));
  const status = (row: InventoryRow) => <span className={`badge ${row.shortage ? "shortage" : "verified"}`}>{row.shortage ? "부족 주의" : "적정"}</span>;
  const title = (row: InventoryRow, material: DataRow) => <button className="table-link" aria-label={`${row.name} 상세`} onClick={() => onDetail(row.materialId)}><strong>{row.name}</strong><small>{material.brand ? `${material.brand} · ` : ""}{row.materialId}</small></button>;
  return <>
    <div className="card table-card inventory-desktop-list"><div className="table-wrap"><table className="data-table inventory-unified-table"><thead><tr><th>품목</th>{settings ? <><th>분류</th><th>조달 방식</th><th>기준 단위</th><th>구매 규격</th><th>위치</th><th>사용 상태</th></> : <><th className="num">현재 잔량</th><th>재고 상태</th><th className="num">사용 가능 일수</th><th>위치</th></>}<th>작업</th></tr></thead><tbody>{rows.map((row) => {
      const material = byId.get(row.materialId)!;
      return <tr key={row.materialId}><td>{title(row, material)}{!settings && <small>{material.category || "미분류"}{material.active === false ? " · 비활성" : ""}</small>}</td>{settings ? <><td>{material.category || "미분류"}</td><td>{material.sourceType || "미설정"}</td><td>{row.unit}</td><td>{qty(Number(material.packageCapacity ?? material.packQuantity), String(material.purchaseUnit || row.unit))}</td><td>{material.location || "미입력"}</td><td>{material.active === false ? "비활성" : "사용 중"}</td></> : <><td className={`num ${row.current < 0 ? "negative" : ""}`}>{qty(row.current, row.unit)}</td><td>{status(row)}</td><td className="num">{row.daysLeft === null ? "자료 부족" : `${row.daysLeft.toFixed(1)}일`}</td><td>{material.location || "미입력"}</td></>}<td><button className="button secondary compact" aria-label={`${row.name} ${settings ? "수정" : "기록"}`} onClick={() => settings ? onEdit(row.materialId) : onRecord(row.materialId)}>{settings ? "수정" : "기록"}</button></td></tr>;
    })}</tbody></table></div></div>
    <div className="inventory-mobile-list">{rows.map((row) => {
      const material = byId.get(row.materialId)!;
      return <article className="card inventory-item-card" key={row.materialId}><div className="inventory-card-head">{title(row, material)}{status(row)}</div><dl><div><dt>{settings ? "구매 규격" : "현재 잔량"}</dt><dd>{settings ? qty(Number(material.packageCapacity ?? material.packQuantity), String(material.purchaseUnit || row.unit)) : qty(row.current, row.unit)}</dd></div><div><dt>{settings ? "분류·조달" : "사용 가능 일수"}</dt><dd>{settings ? `${material.category || "미분류"} · ${material.sourceType || "미설정"}` : row.daysLeft === null ? "자료 부족" : `${row.daysLeft.toFixed(1)}일`}</dd></div><div><dt>위치·사용 상태</dt><dd>{material.location || "미입력"} · {material.active === false ? "비활성" : "사용 중"}</dd></div></dl><button className="button secondary" onClick={() => settings ? onEdit(row.materialId) : onRecord(row.materialId)} aria-label={`${row.name} ${settings ? "수정" : "기록"}`}>{settings ? "기준정보 수정" : "재고 기록"}</button></article>;
    })}</div>
  </>;
}
