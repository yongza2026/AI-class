"use client";
import type { PeriodUnit } from "@/lib/calculations";

export function PeriodFilters({ unit, date, onUnit, onDate, extra }: { unit: PeriodUnit; date: string; onUnit: (value:PeriodUnit)=>void; onDate:(value:string)=>void; extra?:React.ReactNode }) {
  return <div className="filter-bar"><div className="segments" aria-label="조회 단위">{(["day","week","month"] as const).map((value)=><button key={value} className={unit===value?"active":""} onClick={()=>onUnit(value)}>{value==="day"?"일":value==="week"?"주":"월"}</button>)}</div><label>기준 날짜<input type="date" value={date} onChange={(e)=>onDate(e.target.value)}/></label>{extra}</div>;
}
