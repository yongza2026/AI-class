"use client";

import { useEffect, useState } from "react";
import { readDataset, replaceDataset } from "@/lib/data/database";
import { auditRow } from "@/lib/data/migration";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { numberOf, qty, valueOf, won } from "@/lib/format";
import { useCafeData } from "./DataProvider";

export function PurchaseLedger(){
  const {refresh}=useCafeData();const [data,setData]=useState<CafeDataset|null>(null);const [message,setMessage]=useState("");useEffect(()=>{void readDataset().then(setData);},[]);
  async function complete(lot:DataRow){if(!data)return;const text=prompt("부가세를 포함한 구매 총액을 입력하세요.","");if(text==null)return;const amount=Number(text);if(!Number.isFinite(amount)||amount<0){setMessage("구매금액은 0 이상의 숫자로 입력해 주세요.");return;}const event=data.inventoryEvents.find((row)=>row.eventId===lot.eventId);if(!event){setMessage("연결된 입고 기록을 찾지 못했습니다.");return;}const quantity=numberOf(lot,"baseQuantity");const updatedLot={...lot,purchaseAmount:amount,costStatus:"확정"};const updatedEvent={...event,purchaseAmount:amount,costStatus:"확정",unitCost:amount/(quantity||1)};const next={...data,purchaseLots:data.purchaseLots.map((row)=>row.lotId===lot.lotId?updatedLot:row),inventoryEvents:data.inventoryEvents.map((row)=>row.eventId===event.eventId?updatedEvent:row),priceHistory:[...data.priceHistory.filter((row)=>!(row.materialId===lot.materialId&&row.effectiveDate===lot.date)),{materialId:lot.materialId,effectiveDate:lot.date,packPrice:amount,packQuantity:quantity,sourceLotId:lot.lotId}],auditLog:[...data.auditLog,auditRow("금액 보완","purchaseLots",valueOf(lot,"lotId"),lot,updatedLot,"입고 후 구매금액 입력")]};await replaceDataset(next);setData(next);setMessage("구매금액과 해당 일자의 재료 단가를 함께 갱신했습니다.");await refresh();}
  if(!data?.purchaseLots.length)return null;
  const rows=[...data.purchaseLots].sort((a,b)=>valueOf(b,"date").localeCompare(valueOf(a,"date")));
  return <section className="page purchase-section"><div className="section-heading"><div><p className="eyebrow">입고와 자동 연결</p><h2>매입 기록</h2><p>입고 때 입력한 구매금액은 여기에서 현금 지출로 확인하고, 재료 단가 이력에 한 번만 반영합니다.</p></div></div>{message&&<div className="notice info" role="status"><span>{message}</span></div>}<div className="card table-card"><div className="table-wrap"><table className="data-table"><thead><tr><th>입고일 / 로트</th><th>품목</th><th>입고량</th><th>공급처</th><th>구매금액</th><th>상태</th><th>관리</th></tr></thead><tbody>{rows.map((row)=><tr key={valueOf(row,"lotId")}><td>{row.date}<small>{row.lotCode||row.lotId}</small></td><td>{data.materials.find((item)=>item.materialId===row.materialId)?.name}</td><td>{qty(numberOf(row,"baseQuantity"),valueOf(data.materials.find((item)=>item.materialId===row.materialId)??{},"unit"))}</td><td>{data.suppliers.find((item)=>item.supplierId===row.supplierId)?.name||"미입력"}</td><td>{row.purchaseAmount==null?"-":won(numberOf(row,"purchaseAmount"))}</td><td><span className={`badge ${row.costStatus==="확정"?"verified":"pending"}`}>{row.costStatus}</span></td><td>{row.costStatus!=="확정"&&<button className="button secondary compact" onClick={()=>void complete(row)}>금액 보완</button>}</td></tr>)}</tbody></table></div></div></section>;
}
