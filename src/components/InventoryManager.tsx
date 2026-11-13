"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { calculateInventory } from "@/lib/calculations";
import { auditRow } from "@/lib/data/migration";
import { readDataset, replaceDataset } from "@/lib/data/database";
import type { CafeDataset, DataRow } from "@/lib/data/types";
import { packageReceipt, precisionStep, seoulToday, validateInventoryQuantity, WASTE_REASONS } from "@/lib/inventoryDomain";
import { numberOf, qty, valueOf, won } from "@/lib/format";
import { useCafeData } from "./DataProvider";
import { MaterialEditor } from "./MaterialEditor";
import { InventoryItemList } from "./InventoryItemList";
import { InventoryItemDetail } from "./InventoryItemDetail";
import { useDialogFocus } from "./useDialogFocus";

type EventType = "입고" | "폐기" | "실사조정" | "수동사용";
type Form = { eventId?: string; eventType: EventType; date: string; materialId: string; quantity: string; entryMode: "기준 수량" | "구매 포장"; packageCount: string; purchaseAmount: string; supplierId: string; lotCode: string; reason: string; memo: string };

export function InventoryManager({ startOpen = false }: { startOpen?: boolean }) {
  const { refresh, cloud, access } = useCafeData();
  const pathname=usePathname(); const router=useRouter(); const searchParams=useSearchParams();
  const [data, setData] = useState<CafeDataset | null>(null); const [loadState,setLoadState]=useState<"loading"|"ready"|"error">("loading"); const [loadError,setLoadError]=useState(""); const [form, setForm] = useState<Form | null>(null); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLSelectElement>(null); const openerRef = useRef<HTMLElement | null>(null); const initialFormRef=useRef("");
  const detailOpenedHereRef = useRef(false);
  const editorOpenedFromListRef = useRef(false);
  const savingRef = useRef(false);
  const recordDialogRef = useRef<HTMLFormElement>(null);
  const settingsView = searchParams.get("view") === "settings";
  const editId = searchParams.get("edit");
  const newMaterial = searchParams.get("new") === "1";
  const editorOpen = editId !== null || newMaterial;
  const activeFilter = searchParams.get("active") ?? "yes";
  const sort = searchParams.get("sort") ?? "priority";
  const detailPanel = ["history", "settings"].includes(searchParams.get("panel") ?? "") ? searchParams.get("panel")! : "stock";
  const canWrite = !cloud || access?.role === "owner" || access?.role === "editor";
  const query=searchParams.get("q")??""; const shortOnly=searchParams.get("short")==="1"; const category=searchParams.get("category")??""; const locationFilter=searchParams.get("location")??""; const detailId=searchParams.get("detail")??"";
  const hasReturn=searchParams.has("return"); const returnTo=useMemo(()=>safeInventoryReturn(searchParams.get("return")),[searchParams]);
  const setFilter=useCallback((name:string,value:string)=>{const params=new URLSearchParams(window.location.search);if(value)params.set(name,value);else params.delete(name);window.history.replaceState(null,"",`${pathname}${params.size?`?${params.toString()}`:""}`);},[pathname]);
  const load = useCallback(async () => {setLoadState("loading");setLoadError("");try{setData(await readDataset());setLoadState("ready");}catch(error){setLoadError(error instanceof Error?error.message:"재고 자료를 불러오지 못했습니다.");setLoadState("error");}}, []);
  // URL을 읽어 입력창을 준비하지만, 저장 버튼을 누르기 전에는 데이터를 쓰지 않는다.
  useEffect(() => { let ignore=false; readDataset().then((next)=>{ if(ignore)return; setData(next);setLoadState("ready");if(next&&startOpen){const params=new URLSearchParams(window.location.search);const eventId=params.get("event");const row=eventId?next.inventoryEvents.find((item)=>item.eventId===eventId):undefined;const initial=row?inventoryEventForm(row,next):newInventoryForm(next,"입고",params.get("material")??undefined);if(initial){initialFormRef.current=JSON.stringify(initial);setForm(initial);}}}).catch((error)=>{if(!ignore){setLoadError(error instanceof Error?error.message:"재고 자료를 불러오지 못했습니다.");setLoadState("error");}}); return()=>{ignore=true}; }, [startOpen]);
  const inventory=useMemo(()=>data?calculateInventory(data):[],[data]);
  const rows=inventory.filter((row)=>{const material=data?.materials.find((item)=>item.materialId===row.materialId);return(!shortOnly||row.shortage)&&(!category||material?.category===category)&&(!locationFilter||material?.location===locationFilter)&&(activeFilter==="all"||(activeFilter==="no"?material?.active===false:material?.active!==false))&&`${row.name} ${material?.brand ?? ""} ${row.materialId}`.toLocaleLowerCase("ko").includes(query.trim().toLocaleLowerCase("ko"));}).sort((a,b)=>sort==="name"?a.name.localeCompare(b.name,"ko"):sort==="days"?(a.daysLeft??Infinity)-(b.daysLeft??Infinity):0);
  const inactiveWithStock = inventory.filter((row) => row.current !== 0 && data?.materials.find((item) => item.materialId === row.materialId)?.active === false).length;
  const categories=[...new Set(data?.materials.map((row)=>valueOf(row,"category")).filter(Boolean)??[])]; const locations=[...new Set(data?.materials.map((row)=>valueOf(row,"location")).filter(Boolean)??[])];
  const selected=data?.materials.find((row)=>row.materialId===form?.materialId);
  const baseQuantity=useMemo(()=>{if(!form||!selected)return 0; const raw=Number(form.entryMode==="구매 포장"?form.packageCount:form.quantity); if(!Number.isFinite(raw))return 0; try{return form.entryMode==="구매 포장"?packageReceipt(raw,numberOf(selected,"packageCapacity")||numberOf(selected,"packQuantity"),valueOf(selected,"purchaseUnit")||valueOf(selected,"unit"),valueOf(selected,"unit")):raw;}catch{return 0;}},[form,selected]);
  const before=form?inventoryBefore(data,form.materialId,form.date,form.eventId):0;
  const change=!form?0:form.eventType==="입고"?baseQuantity:form.eventType==="실사조정"?baseQuantity-before:-baseQuantity;
  const after=before+change;
  const detailRow=inventory.find((row)=>row.materialId===detailId); const detailMaterial=data?.materials.find((row)=>row.materialId===detailId);


  function open(source=data,type:EventType="입고",materialId?:string) {const next=newInventoryForm(source,type,materialId);if(!next)return;openerRef.current=document.activeElement as HTMLElement;initialFormRef.current=JSON.stringify(next);setForm(next);setMessage("");}
  function finishForm(saved=false){setForm(null);if(startOpen&&(!saved||hasReturn))router.replace(returnTo,{scroll:false});else requestAnimationFrame(()=>openerRef.current?.focus());}
  function closeForm(){if(!form||savingRef.current)return;if(JSON.stringify(form)!==initialFormRef.current&&!confirm("입력 중인 변경 내용을 취소할까요?"))return;finishForm(false);}
  function openDetail(materialId:string){detailOpenedHereRef.current=true;openerRef.current=document.activeElement as HTMLElement;const params=new URLSearchParams(window.location.search);params.set("detail",materialId);params.delete("panel");router.push(`${pathname}?${params.toString()}`,{scroll:false});}
  function closeDetail(){if(detailOpenedHereRef.current){detailOpenedHereRef.current=false;router.back();requestAnimationFrame(()=>openerRef.current?.focus());return;}const params=new URLSearchParams(window.location.search);params.delete("detail");params.delete("panel");router.replace(`${pathname}${params.size?`?${params.toString()}`:""}`,{scroll:false});requestAnimationFrame(()=>openerRef.current?.focus());}
  function editMaterial(id?: string) {
    openerRef.current = document.activeElement as HTMLElement;
    const params = new URLSearchParams(window.location.search);
    params.delete("return"); params.delete("edit"); params.delete("new");
    if (id) params.set("edit", id); else params.set("new", "1");
    editorOpenedFromListRef.current = !params.has("detail");
    if (editorOpenedFromListRef.current) router.push(`${pathname}?${params}`, { scroll: false });
    else router.replace(`${pathname}?${params}`, { scroll: false });
  }
  function closeMaterial(savedId?: string) {
    if (!savedId && editorOpenedFromListRef.current) { editorOpenedFromListRef.current = false; router.back(); return; }
    if (!savedId && searchParams.has("return")) { router.replace(returnTo, { scroll: false }); return; }
    const params = new URLSearchParams(window.location.search);
    params.delete("edit"); params.delete("new"); params.delete("return");
    if (savedId) { if (editorOpenedFromListRef.current) detailOpenedHereRef.current = true; editorOpenedFromListRef.current = false; params.set("detail", savedId); params.set("panel", "settings"); }
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    requestAnimationFrame(() => openerRef.current?.focus());
  }
  function recordMaterial(id: string) { open(data, "입고", id); }
  useDialogFocus(recordDialogRef, !!form, closeForm);

  async function submit(event:React.FormEvent){event.preventDefault();if(!data||!form||!selected||savingRef.current||!canWrite)return;savingRef.current=true;setSaving(true);try{
    const amount=baseQuantity; const quantityError=validateInventoryQuantity(amount,selected); if(quantityError)throw new Error(quantityError); if(form.eventType!=="실사조정"&&amount===0)throw new Error("수량은 0보다 커야 합니다.");
    if(form.eventType==="입고"&&form.entryMode==="구매 포장"&&!Number.isInteger(Number(form.packageCount)))throw new Error("구매 포장 수는 정수로 입력해 주세요.");
    if((form.eventType==="폐기"||form.eventType==="수동사용")&&amount>before)throw new Error(`현재 재고 ${qty(before,valueOf(selected,"unit"))}보다 많이 처리할 수 없습니다.`);
    if(form.eventType==="폐기"&&!form.reason)throw new Error("폐기 사유를 선택해 주세요.");
    if(form.eventType==="수동사용"&&!form.reason.trim())throw new Error("판매 외 사용 사유를 입력해 주세요.");
    if(form.eventType==="수동사용"){const soldUsage=data.sales.filter((sale)=>sale.date===form.date).reduce((sum,sale)=>sum+data.recipes.filter((recipe)=>recipe.menuId===sale.menuId&&recipe.recipeVersion===sale.recipeVersion&&recipe.materialId===form.materialId&&(!recipe.channelOnly||recipe.channelOnly===sale.channel)).reduce((used,recipe)=>used+numberOf(recipe,"quantity")*numberOf(sale,"quantity"),0),0);if(soldUsage>0&&!confirm(`같은 날 판매 기록에서 이미 ${qty(soldUsage,valueOf(selected,"unit"))}가 자동 차감됩니다. 지금 수량이 서비스·시음·파손 등 판매 외 사용이 맞나요?`))return;}
    const diffLimit=Math.max(numberOf(selected,"packageCapacity")||numberOf(selected,"packQuantity"),before*.2); if(form.eventType==="실사조정"&&Math.abs(change)>=diffLimit&&!form.reason.trim())throw new Error("차이가 큰 실사는 조정 사유를 입력해 주세요.");
    if(form.eventType==="실사조정"&&amount===0&&!confirm("실측 수량을 0으로 저장하여 재고를 모두 소진 처리할까요?"))return;
    const duplicate=data.inventoryEvents.some((row)=>row.eventId!==form.eventId&&row.materialId===form.materialId&&row.eventType===form.eventType&&row.date===form.date&&Number(row.quantity)===change&&row.clientToken===form.eventId); if(duplicate)throw new Error("같은 기록이 이미 저장되었습니다.");
    const id=form.eventId??`EV-${crypto.randomUUID()}`; const old=data.inventoryEvents.find((row)=>row.eventId===id); const purchaseAmount=form.purchaseAmount===""?null:Number(form.purchaseAmount); if(purchaseAmount!==null&&(!Number.isFinite(purchaseAmount)||purchaseAmount<0))throw new Error("구매금액은 0 이상의 숫자로 입력해 주세요.");
    const row:DataRow={eventId:id,date:form.date,materialId:form.materialId,eventType:form.eventType,quantity:change,unit:selected.unit,reason:form.reason||null,memo:form.memo||null,countedQuantity:form.eventType==="실사조정"?amount:null,supplierId:form.eventType==="입고"?(form.supplierId||null):null,purchaseAmount:form.eventType==="입고"?purchaseAmount:null,costStatus:form.eventType==="입고"?(purchaseAmount===null?"미입력":"확정"):null,unitCost:form.eventType==="입고"&&purchaseAmount!==null&&amount>0?purchaseAmount/amount:null,lotCode:form.lotCode||null,packageCount:form.entryMode==="구매 포장"?Number(form.packageCount):null,packageCapacity:form.entryMode==="구매 포장"?numberOf(selected,"packageCapacity")||numberOf(selected,"packQuantity"):null,sourceType:"manual",clientToken:id,updatedAt:new Date().toISOString()};
    let events=old?data.inventoryEvents.map((item)=>item.eventId===id?row:item):[...data.inventoryEvents,row]; let lots=data.purchaseLots.filter((item)=>item.eventId!==id); const bottles=data.bottleStates.filter((item)=>item.eventId!==id); let prices=data.priceHistory;
    if(form.eventType==="입고"){const lotId=valueOf(old??{},"lotId")||`LOT-${crypto.randomUUID()}`;row.lotId=lotId;lots=[...lots,{lotId,eventId:id,date:form.date,materialId:form.materialId,supplierId:form.supplierId||null,lotCode:form.lotCode||null,baseQuantity:amount,packageCount:form.entryMode==="구매 포장"?Number(form.packageCount):null,purchaseAmount,costStatus:purchaseAmount===null?"미입력":"확정",remainingQuantity:amount,status:"사용 가능"}];events=old?events.map((item)=>item.eventId===id?row:item):events;if(form.entryMode==="구매 포장"&&selected.unit==="ml")for(let i=0;i<Number(form.packageCount);i++)bottles.push({bottleId:`BT-${lotId}-${i+1}`,eventId:id,lotId,materialId:form.materialId,status:"미개봉",remainingQuantity:baseQuantity/Number(form.packageCount),location:selected.location??null});if(purchaseAmount!==null)prices=[...prices.filter((item)=>!(item.materialId===form.materialId&&item.effectiveDate===form.date)),{materialId:form.materialId,effectiveDate:form.date,packPrice:purchaseAmount,packQuantity:amount,sourceLotId:lotId}];}
    const next={...data,inventoryEvents:events,purchaseLots:lots,bottleStates:bottles,priceHistory:prices,auditLog:[...data.auditLog,auditRow(old?"수정":"추가","inventoryEvents",id,old??null,row,form.reason)]};await replaceDataset(next);setData(next);setMessage("재고 기록을 저장했습니다.");void refresh().catch(()=>undefined);finishForm(true);
  }catch(error){setMessage(error instanceof Error?error.message:"재고 기록을 저장하지 못했습니다.");}finally{savingRef.current=false;setSaving(false);}}

  async function openBottle(materialId:string){if(!data)return;const bottle=data.bottleStates.find((row)=>row.materialId===materialId&&row.status==="미개봉");if(!bottle){setMessage("개봉할 미개봉 병이 없습니다.");return;}const updated={...bottle,status:"개봉",openedAt:seoulToday(),location:bottle.location||data.materials.find((row)=>row.materialId===materialId)?.location||null};const next={...data,bottleStates:data.bottleStates.map((row)=>row.bottleId===bottle.bottleId?updated:row),auditLog:[...data.auditLog,auditRow("상태 변경","bottleStates",valueOf(bottle,"bottleId"),bottle,updated,"병 개봉")]};await replaceDataset(next);setData(next);setMessage("병을 개봉 상태로 바꾸고 개봉일을 기록했습니다.");await refresh();}

  if(loadState==="loading")return <section className="page"><div className="empty-card" role="status">재고 현황을 불러오고 있습니다…</div></section>;
  if(loadState==="error")return <section className="page"><div className="empty-card"><h2>재고 현황을 불러오지 못했습니다</h2><p>{loadError}</p><button className="button primary" onClick={()=>void load()}>다시 시도</button></div></section>;
  return <section className="page inventory-workspace-page"><div className="page-heading"><div><p className="eyebrow">재고 · 기준정보</p><h1>품목·재고</h1><p>한 품목 목록에서 재고를 확인하고 규격·보관 기준을 관리합니다.</p></div><div className="actions"><button className="button secondary" onClick={load}><RefreshCw size={16}/>새로고침</button>{canWrite && <><button className="button secondary" onClick={()=>editMaterial()}><Plus size={16}/>새 품목</button><button className="button primary" disabled={!data?.materials.length} onClick={()=>open()}><Plus size={16}/>재고 기록</button></>}</div></div>
    {message&&<div className={`notice ${message.includes("했습니다")?"success":"error"}`} role="status"><span>{message}</span></div>}
    <div className="inventory-workspace-toolbar"><div className="segments" role="group" aria-label="목록 보기"><button aria-pressed={!settingsView} className={!settingsView?"active":""} onClick={()=>setFilter("view", "")}>운영 보기</button><button aria-pressed={settingsView} className={settingsView?"active":""} onClick={()=>setFilter("view", "settings")}>기준정보 보기</button></div><span>{rows.length}개 품목 · {settingsView?"규격과 보관 기준":"잔량과 부족 상태"}</span></div>
    {inactiveWithStock>0&&<div className="notice info"><span>잔량이 남은 비활성 품목이 {inactiveWithStock}개 있습니다.</span><button className="button secondary" onClick={()=>setFilter("active", "no")}>비활성 품목 보기</button></div>}
    <details className="inventory-filters" open><summary>검색·필터</summary><div className="filter-bar inventory-filter-bar"><label className="grow">품목 검색<input value={query} onChange={(e)=>setFilter("q",e.target.value)} placeholder="이름, 브랜드 또는 ID"/></label><label>분류<select value={category} onChange={(e)=>setFilter("category",e.target.value)}><option value="">전체</option>{categories.map((item)=><option key={item}>{item}</option>)}</select></label><label>보관 위치<select value={locationFilter} onChange={(e)=>setFilter("location",e.target.value)}><option value="">전체</option>{locations.map((item)=><option key={item}>{item}</option>)}</select></label><label>사용 상태<select value={activeFilter} onChange={(e)=>setFilter("active",e.target.value)}><option value="yes">사용 중</option><option value="all">전체</option><option value="no">비활성</option></select></label><label>정렬<select value={sort} onChange={(e)=>setFilter("sort",e.target.value)}><option value="priority">부족 우선</option><option value="name">품목명</option><option value="days">사용 가능 일수</option></select></label><label className="checkbox"><input type="checkbox" checked={shortOnly} onChange={(e)=>setFilter("short",e.target.checked?"1":"")}/>부족만</label></div></details>
    {!rows.length?<div className="empty-card"><h2>{data?.materials.length?"검색 결과가 없습니다":"첫 품목을 등록해 주세요"}</h2><p>{data?.materials.length?"검색어·분류·보관 위치 또는 사용 상태를 바꿔 보세요.":"품목 등록 후 실제 입고를 별도로 기록합니다."}</p>{!data?.materials.length&&canWrite&&<button className="button primary" onClick={()=>editMaterial()}>첫 품목 만들기</button>}</div>:<InventoryItemList rows={rows} materials={data!.materials} settings={settingsView} onDetail={openDetail} onEdit={(id)=>canWrite?editMaterial(id):openDetail(id)} onRecord={(id)=>canWrite?recordMaterial(id):openDetail(id)}/>}
    {detailId && data && !editorOpen && !form && <InventoryItemDetail data={data} row={detailRow} material={detailMaterial} panel={detailPanel} onPanel={(value)=>setFilter("panel",value)} onClose={closeDetail} onEdit={canWrite?editMaterial:undefined} onRecord={canWrite?recordMaterial:undefined} onOpenBottle={canWrite?(id)=>void openBottle(id):undefined} historyHref={`/inventory/history?${new URLSearchParams({material:detailId,q:query,category,location:locationFilter,view:settingsView?"settings":"",active:activeFilter,sort})}`}/>}
    {editorOpen && canWrite && (!editId || data?.materials.some((row)=>row.materialId===editId)) && <MaterialEditor key={editId??"new"} data={data} material={data?.materials.find((row)=>row.materialId===editId)} onClose={()=>closeMaterial()} onSaved={(next,id,text)=>{setData(next);setMessage(text);closeMaterial(id);}}/>}
    {editorOpen && editId && !data?.materials.some((row)=>row.materialId===editId) && <div className="notice error" role="alert"><span>수정할 품목을 찾지 못했습니다.</span><button className="button secondary" onClick={()=>closeMaterial()}>닫기</button></div>}
    {form&&<div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)closeForm();}}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="inventory-title" onSubmit={submit} ref={recordDialogRef} aria-busy={saving}><div className="modal-head"><h2 id="inventory-title">{form.eventId?"재고 기록 수정":"재고 기록"}</h2><button type="button" className="icon-button" aria-label="닫기" onClick={closeForm}>×</button></div>{message&&!message.includes("했습니다")&&<div className="notice error" role="alert">{message}</div>}<fieldset className="editor-fields" disabled={saving}><div className="form-grid">
      <label>기록 유형<select data-autofocus ref={firstRef} value={form.eventType} onChange={(e)=>setForm({...form,eventType:e.target.value as EventType,quantity:"",packageCount:"",reason:""})}><option>입고</option><option>폐기</option><option>실사조정</option><option value="수동사용">판매 외 사용</option></select></label><label>날짜<input type="date" required value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}/></label>
      <label>품목<select value={form.materialId} onChange={(e)=>{const material=data?.materials.find((row)=>row.materialId===e.target.value);setForm({...form,materialId:e.target.value,supplierId:valueOf(material??{},"supplierId"),quantity:"",packageCount:""});}}>{data?.materials.filter((row)=>row.active!==false||row.materialId===form.materialId).map((row)=><option key={valueOf(row,"materialId")} value={valueOf(row,"materialId")}>{row.name}</option>)}</select></label>{form.eventType==="입고"&&<label>입력 방식<select value={form.entryMode} onChange={(e)=>setForm({...form,entryMode:e.target.value as Form["entryMode"]})}><option>기준 수량</option><option>구매 포장</option></select></label>}
      {form.eventType==="입고"&&form.entryMode==="구매 포장"?<label>구매 포장 수<input type="number" min="1" step="1" required value={form.packageCount} onChange={(e)=>setForm({...form,packageCount:e.target.value})}/><small>{selected?.packageCapacity||selected?.packQuantity} {selected?.purchaseUnit||selected?.unit} × 포장 수</small></label>:<label>{form.eventType==="실사조정"?"실측 수량":"수량"}<input type="number" min="0" step={selected?precisionStep(selected):0.01} required value={form.quantity} onChange={(e)=>setForm({...form,quantity:e.target.value})}/><small>{selected?.unit}</small></label>}
      {form.eventType==="입고"&&<><label>공급처<select value={form.supplierId} onChange={(e)=>setForm({...form,supplierId:e.target.value})}><option value="">미입력</option>{data?.suppliers.map((row)=><option key={valueOf(row,"supplierId")} value={valueOf(row,"supplierId")}>{row.name}</option>)}</select></label><label>구매금액 · 부가세 포함 총액 (선택)<input type="number" min="0" value={form.purchaseAmount} onChange={(e)=>setForm({...form,purchaseAmount:e.target.value})}/><small>비워두면 ‘금액 미입력’으로 저장됩니다.</small></label><label>공급처 로트<input value={form.lotCode} onChange={(e)=>setForm({...form,lotCode:e.target.value})}/></label></>}
      {form.eventType==="폐기"?<label>폐기 사유<select required value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})}><option value="">선택</option>{WASTE_REASONS.map((item)=><option key={item}>{item}</option>)}</select></label>:form.eventType!=="입고"&&<label>{form.eventType==="수동사용"?"판매 외 사용 사유":"조정 사유"}<input required={form.eventType==="수동사용"} value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})}/><small>{form.eventType==="수동사용"?"판매 수량은 레시피로 자동 차감되므로 여기에 다시 입력하지 않습니다.":""}</small></label>}<label className="span-2">메모<input value={form.memo} onChange={(e)=>setForm({...form,memo:e.target.value})}/></label>
    </div></fieldset><div className="preview"><div className="preview-grid"><span>적용 전<strong>{qty(before,valueOf(selected??{},"unit"))}</strong></span><span>변동량<strong>{qty(change,valueOf(selected??{},"unit"))}</strong></span><span>적용 후<strong className={after<0?"negative":""}>{qty(after,valueOf(selected??{},"unit"))}</strong></span></div>{form.eventType==="입고"&&form.entryMode==="구매 포장"&&<p>{form.packageCount||0}포장 → 기준 수량 {qty(baseQuantity,valueOf(selected??{},"unit"))}</p>}{form.eventType==="입고"&&form.purchaseAmount&&baseQuantity>0&&<p>입고 단가 {won(Number(form.purchaseAmount)/baseQuantity)} / {selected?.unit}</p>}{after<0&&<p className="negative"><AlertTriangle size={14}/> 재고가 음수가 되어 저장할 수 없습니다.</p>}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={closeForm}>취소</button><button className="button primary" disabled={saving||after<0}>{saving?"저장 중…":"저장"}</button></div></form></div>}
  </section>;
}

function inventoryBefore(data:CafeDataset|null,materialId:string,date:string,excludeId?:string){if(!data)return 0;const subset={...data,sales:data.sales.filter((row)=>valueOf(row,"date")<=date),inventoryEvents:data.inventoryEvents.filter((row)=>valueOf(row,"date")<=date&&row.eventId!==excludeId)};return calculateInventory(subset).find((row)=>row.materialId===materialId)?.current??0;}

function safeInventoryReturn(value:string|null){return value?.startsWith("/inventory")&&!value.startsWith("//")?value:"/inventory";}

function newInventoryForm(source:CafeDataset|null,type:EventType,materialId?:string):Form|null{if(!source?.materials.length)return null;const material=source.materials.find((row)=>row.materialId===materialId&&(row.active!==false||row.materialId===materialId))??source.materials.find((row)=>row.active!==false)??source.materials[0];return{eventType:type,date:seoulToday(),materialId:valueOf(material,"materialId"),quantity:"",entryMode:"기준 수량",packageCount:"",purchaseAmount:"",supplierId:valueOf(material,"supplierId"),lotCode:"",reason:"",memo:""};}

function inventoryEventForm(row:DataRow,source:CafeDataset):Form{const material=source.materials.find((item)=>item.materialId===row.materialId);return{eventId:valueOf(row,"eventId"),eventType:valueOf(row,"eventType") as EventType,date:valueOf(row,"date"),materialId:valueOf(row,"materialId"),quantity:String(row.eventType==="실사조정"?numberOf(row,"countedQuantity"):Math.abs(numberOf(row,"quantity"))),entryMode:"기준 수량",packageCount:"",purchaseAmount:row.purchaseAmount==null?"":String(row.purchaseAmount),supplierId:valueOf(row,"supplierId")||valueOf(material??{},"supplierId"),lotCode:valueOf(row,"lotCode"),reason:valueOf(row,"reason"),memo:valueOf(row,"memo")};}
