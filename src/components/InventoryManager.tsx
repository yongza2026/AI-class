"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { calculateInventory } from "@/lib/calculations";
import { deleteRecord, readDataset, saveRecord } from "@/lib/data/database";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { numberOf, qty, valueOf, won } from "@/lib/format";
import { useCafeData } from "./DataProvider";

type Form = { eventId?:string; eventType:"입고"|"폐기"|"실사조정"; date:string; materialId:string; amount:number; totalCost:string; supplierId:string; reason:string };

export function InventoryManager({ startOpen = false }: { startOpen?: boolean }) {
  const { refresh } = useCafeData();
  const [data, setData] = useState<CafeDataset | null>(null);
  const [query, setQuery] = useState("");
  const [shortOnly, setShortOnly] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => setData(await readDataset()), []);
  useEffect(() => {
    let ignore = false;
    readDataset().then((next) => {
      if (ignore) return;
      setData(next);
      const params = new URLSearchParams(window.location.search);
      if (params.get("material")) setQuery(params.get("material") ?? "");
      if (next && startOpen) setForm(newForm(next));
    });
    return () => { ignore = true; };
  }, [startOpen]);
  const inventory = useMemo(() => data ? calculateInventory(data) : [], [data]);
  const rows = inventory.filter((row) => (!shortOnly || row.shortage) && (row.name.includes(query.trim()) || row.materialId.includes(query.trim())));
  const selected = inventory.find((row) => row.materialId === form?.materialId);
  const history = useMemo(() => data ? [...data.inventoryEvents].sort((a,b) => valueOf(b,"date").localeCompare(valueOf(a,"date")) || valueOf(b,"eventId").localeCompare(valueOf(a,"eventId"))).slice(0,30) : [], [data]);

  function inventoryBefore(materialId:string, date:string, excludeId?:string) {
    if (!data) return 0;
    const subset:CafeDataset = { ...data, sales:data.sales.filter((row)=>valueOf(row,"date")<=date), inventoryEvents:data.inventoryEvents.filter((row)=>valueOf(row,"date")<=date&&row.eventId!==excludeId) };
    return calculateInventory(subset).find((row)=>row.materialId===materialId)?.current ?? 0;
  }
  async function submit(event:React.FormEvent) {
    event.preventDefault(); if (!data || !form) return;
    try {
      if (!form.date || !form.materialId) throw new Error("날짜와 재료를 입력해 주세요.");
      if (form.amount < 0 || (form.eventType !== "실사조정" && form.amount === 0)) throw new Error(form.eventType === "실사조정" ? "실측수량은 0 이상이어야 합니다." : "수량은 0보다 커야 합니다.");
      const material = data.materials.find((row)=>row.materialId===form.materialId)!;
      const before = inventoryBefore(form.materialId, form.date, form.eventId);
      if (form.eventType === "실사조정" && data.inventoryEvents.some((row)=>row.eventId!==form.eventId&&row.materialId===form.materialId&&row.eventType==="실사조정"&&row.date===form.date)) throw new Error("같은 재료·날짜의 실사가 있습니다. 기존 실사를 수정해 주세요.");
      const change = form.eventType === "폐기" ? -form.amount : form.eventType === "실사조정" ? form.amount-before : form.amount;
      if (before+change < 0 && !confirm(`예상 잔량이 ${qty(before+change,valueOf(material,"unit"))}입니다. 실제 기록으로 저장할까요?`)) return;
      await saveRecord("inventoryEvents", { eventId:form.eventId??`E${Date.now()}`, date:form.date, materialId:form.materialId, eventType:form.eventType, quantity:change, unit:valueOf(material,"unit"), reason:form.reason||null, unitCost:form.eventType==="입고"&&form.totalCost!==""?Number(form.totalCost)/form.amount:null, supplierId:form.eventType==="입고"?(form.supplierId||null):null, countedQuantity:form.eventType==="실사조정"?form.amount:null });
      setForm(null); setMessage("재고 기록이 저장되었습니다."); await load(); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했습니다."); }
  }
  async function remove(row:DataRow) {
    if (!confirm(`${row.date} ${row.eventType} ${qty(numberOf(row,"quantity"),valueOf(row,"unit"))} 기록을 삭제할까요?`)) return;
    await deleteRecord("inventoryEvents",valueOf(row,"eventId")); setMessage("재고 기록을 삭제했습니다."); await load(); await refresh();
  }
  function edit(row:DataRow) {
    const material=data?.materials.find((item)=>item.materialId===row.materialId);
    setForm({ eventId:valueOf(row,"eventId"), eventType:valueOf(row,"eventType") as Form["eventType"], date:valueOf(row,"date"), materialId:valueOf(row,"materialId"), amount:row.eventType==="실사조정"?numberOf(row,"countedQuantity"):Math.abs(numberOf(row,"quantity")), totalCost:row.unitCost==null?"":String(numberOf(row,"unitCost")*Math.abs(numberOf(row,"quantity"))), supplierId:valueOf(row,"supplierId")||valueOf(material??{},"supplierId"), reason:valueOf(row,"reason") });
  }
  if (!data) return <section className="page"><div className="empty-card">데이터 관리에서 자료를 먼저 준비해 주세요.</div></section>;
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">재료 흐름</p><h1>재고 현황 & 흐름</h1><p>발주량은 자동 주문이 아닌 최근 사용량 기준 참고값입니다.</p></div><div className="actions"><button className="button secondary" onClick={load}><RefreshCw size={16}/>새로고침</button><button className="button primary" onClick={()=>setForm(newForm(data))}><Plus size={16}/>재고 기록</button></div></div>
    {message && <div className="notice info" role="status"><span>{message}</span></div>}
    <div className="filter-bar"><label className="grow">재료 검색<input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="재료명 또는 ID"/></label><label className="checkbox"><input type="checkbox" checked={shortOnly} onChange={(event)=>setShortOnly(event.target.checked)}/>부족 재료만 보기</label></div>
    <div className="card table-card"><div className="table-wrap"><table className="data-table"><thead><tr><th>재료</th><th className="num">현재 잔량</th><th>최근 실사</th><th className="num">일평균 사용</th><th className="num">사용 가능</th><th className="num">안전 목표</th><th>상태</th><th className="num">참고 발주량</th></tr></thead><tbody>{rows.map((row)=><tr key={row.materialId}><td><strong>{row.name}</strong><small>{row.materialId}</small></td><td className={`num ${row.current<0?"negative":""}`}>{qty(row.current,row.unit)}</td><td>{row.lastCount??"없음"}</td><td className="num">{row.dailyUsage===null?"계산 불가":qty(row.dailyUsage,row.unit)}</td><td className="num">{row.daysLeft===null?"계산 불가":`${row.daysLeft.toFixed(1)}일`}</td><td className="num">{row.target===null?"계산 불가":qty(row.target,row.unit)}</td><td><span className={`badge ${row.shortage?"shortage":"verified"}`}>{row.current<0?"기록 확인 필요":row.shortage?"부족 주의":"적정"}</span></td><td className="num"><strong>{row.orderQuantity===null?"계산 불가":qty(row.orderQuantity,row.unit)}</strong></td></tr>)}</tbody></table></div></div>
    <div className="card table-card"><h2>최근 재고 기록</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>날짜 / ID</th><th>재료</th><th>유형</th><th className="num">변동량</th><th>사유</th><th>관리</th></tr></thead><tbody>{history.map((row)=>{const material=data.materials.find((item)=>item.materialId===row.materialId);return <tr key={valueOf(row,"eventId")}><td>{row.date}<small>{row.eventId}</small></td><td>{material?.name}</td><td>{row.eventType}</td><td className="num">{qty(numberOf(row,"quantity"),valueOf(row,"unit"))}</td><td>{row.reason||"-"}</td><td><button className="icon-button" aria-label="수정" onClick={()=>edit(row)}><Pencil size={15}/></button><button className="icon-button danger-text" aria-label="삭제" onClick={()=>remove(row)}><Trash2 size={15}/></button></td></tr>})}</tbody></table></div></div>
    {form && <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><h2>{form.eventId?"재고 기록 수정":"재고 기록"}</h2><button type="button" className="icon-button" onClick={()=>setForm(null)}>✕</button></div><div className="form-grid"><label>변동유형<select value={form.eventType} onChange={(event)=>setForm({...form,eventType:event.target.value as Form["eventType"],amount:0})}><option>입고</option><option>폐기</option><option>실사조정</option></select></label><label>날짜<input type="date" required value={form.date} onChange={(event)=>setForm({...form,date:event.target.value})}/></label><label>재료<select value={form.materialId} onChange={(event)=>{const material=data.materials.find((row)=>row.materialId===event.target.value);setForm({...form,materialId:event.target.value,supplierId:valueOf(material??{},"supplierId")})}}>{data.materials.map((row)=><option key={valueOf(row,"materialId")} value={valueOf(row,"materialId")}>{row.name}</option>)}</select></label><label>{form.eventType==="실사조정"?"실측수량":"수량"}<input type="number" min="0" step="0.01" required value={form.amount} onChange={(event)=>setForm({...form,amount:Number(event.target.value)})}/><small>{selected?.unit}</small></label>{form.eventType==="입고"&&<><label>공급사<select value={form.supplierId} onChange={(event)=>setForm({...form,supplierId:event.target.value})}><option value="">미입력</option>{data.suppliers.map((row)=><option key={valueOf(row,"supplierId")} value={valueOf(row,"supplierId")}>{row.name}</option>)}</select></label><label>구매금액 (선택)<input type="number" min="0" value={form.totalCost} onChange={(event)=>setForm({...form,totalCost:event.target.value})}/></label></>}<label className="span-2">사유 (선택)<input value={form.reason} onChange={(event)=>setForm({...form,reason:event.target.value})}/></label></div><div className="preview"><span>현재 계산 잔량 <strong>{selected?qty(selected.current,selected.unit):"-"}</strong></span>{form.eventType==="실사조정"&&<span>조정량 <strong>{selected?qty(form.amount-inventoryBefore(form.materialId,form.date,form.eventId),selected.unit):"-"}</strong></span>}{form.eventType==="입고"&&form.totalCost!==""&&form.amount>0&&<span>단위 구매원가 <strong>{won(Number(form.totalCost)/form.amount)}</strong></span>}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={()=>setForm(null)}>취소</button><button className="button primary">저장</button></div></form></div>}
  </section>;
}

function newForm(data:CafeDataset):Form { return { eventType:"입고", date:data.meta.asOf, materialId:valueOf(data.materials[0],"materialId"), amount:0, totalCost:"", supplierId:valueOf(data.materials[0],"supplierId"), reason:"" }; }
