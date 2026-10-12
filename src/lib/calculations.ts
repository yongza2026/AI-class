import Decimal from "decimal.js";
import type { CafeDataset, DataRow } from "./data/types";

export type PeriodUnit = "day" | "week" | "month";
export type Period = { start: string; end: string };

const n = (row: DataRow, key: string) => Number(row[key] ?? 0);
const s = (row: DataRow, key: string) => String(row[key] ?? "");
const money = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

export function periodFor(unit: PeriodUnit, date: string): Period {
  if (unit === "day") return { start: date, end: date };
  const base = new Date(`${date}T12:00:00`);
  if (unit === "week") {
    const offset = (base.getDay() + 6) % 7;
    const start = new Date(base); start.setDate(base.getDate() - offset);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: localDate(start), end: localDate(end) };
  }
  const [year, month] = date.split("-").map(Number);
  return { start: `${year}-${String(month).padStart(2,"0")}-01`, end: localDate(new Date(year, month, 0, 12)) };
}

function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export function inPeriod(date: string, period: Period) { return date >= period.start && date <= period.end; }

export type SaleSnapshot = { normalSales: number; discountAmount: number; paymentFee: number; unitFoodCost: number; unitPackagingCost: number; directCost: number; contribution: number; contributionRate: number | null; usage: Array<{ materialId: string; name: string; quantity: number; unit: string }> };

export function calculateSaleSnapshot(data: CafeDataset, input: { date: string; menuId: string; channel: string; quantity: number; netSales: number }): SaleSnapshot {
  const menu = data.menus.find((row) => row.menuId === input.menuId);
  if (!menu) throw new Error("선택한 메뉴를 찾을 수 없습니다.");
  const recipeVersion = s(menu, "recipeVersion");
  const recipes = data.recipes.filter((row) => row.menuId === input.menuId && row.recipeVersion === recipeVersion && (!row.channelOnly || row.channelOnly === input.channel));
  if (!recipes.length) throw new Error("선택한 메뉴의 레시피가 없습니다.");
  let food = new Decimal(0); let packaging = new Decimal(0);
  const usage: SaleSnapshot["usage"] = [];
  for (const recipe of recipes) {
    const material = data.materials.find((row) => row.materialId === recipe.materialId);
    if (!material) throw new Error(`레시피의 재료 ${recipe.materialId}를 찾을 수 없습니다.`);
    if (material.unit !== recipe.unit) throw new Error(`${material.name}의 레시피 단위가 기준단위와 다릅니다.`);
    const prices = data.priceHistory.filter((row) => row.materialId === recipe.materialId && s(row,"effectiveDate") <= input.date).sort((a,b)=>s(b,"effectiveDate").localeCompare(s(a,"effectiveDate")));
    const price = prices[0]; if (!price) throw new Error(`${material.name}의 판매일 기준 구매가격이 없습니다.`);
    const cost = new Decimal(n(recipe,"quantity")).mul(n(price,"packPrice")).div(n(price,"packQuantity"));
    if (recipe.channelOnly) packaging = packaging.add(cost); else food = food.add(cost);
    usage.push({ materialId: s(material,"materialId"), name: s(material,"name"), quantity: new Decimal(n(recipe,"quantity")).mul(input.quantity).toNumber(), unit: s(material,"unit") });
  }
  const normalSales = new Decimal(n(menu,"price")).mul(input.quantity);
  const directCost = new Decimal(input.quantity).mul(food.add(packaging));
  const fee = new Decimal(input.netSales).mul(0.015);
  const contribution = new Decimal(input.netSales).sub(directCost).sub(fee);
  return { normalSales: money(normalSales), discountAmount: money(normalSales.sub(input.netSales)), paymentFee: money(fee), unitFoodCost: money(food), unitPackagingCost: money(packaging), directCost: money(directCost), contribution: money(contribution), contributionRate: input.netSales === 0 ? null : contribution.div(input.netSales).mul(100).toNumber(), usage };
}

export type ProfitRow = { menuId: string; menuName: string; channel: string; quantity: number; netSales: number; discount: number; foodCost: number; packagingCost: number; fees: number; contribution: number; rate: number | null; status: string };
export function aggregateProfitability(data: CafeDataset, sales: DataRow[], channel: string): ProfitRow[] {
  const grouped = new Map<string, ProfitRow>();
  for (const sale of sales) {
    const groupChannel = channel === "전체" ? s(sale,"channel") : channel;
    const key = `${sale.menuId}|${groupChannel}`;
    const menu = data.menus.find((row)=>row.menuId===sale.menuId);
    const row = grouped.get(key) ?? { menuId:s(sale,"menuId"),menuName:s(menu ?? {},"name"),channel:groupChannel,quantity:0,netSales:0,discount:0,foodCost:0,packagingCost:0,fees:0,contribution:0,rate:null,status:"" };
    row.quantity += n(sale,"quantity"); row.netSales += n(sale,"netSales"); row.discount += n(sale,"discountAmount");
    row.foodCost += n(sale,"quantity") * n(sale,"unitFoodCostSnapshot"); row.packagingCost += n(sale,"quantity") * n(sale,"unitPackagingCostSnapshot"); row.fees += n(sale,"paymentFee");
    grouped.set(key,row);
  }
  return [...grouped.values()].map((row)=>{ row.contribution = money(new Decimal(row.netSales).sub(row.foodCost).sub(row.packagingCost).sub(row.fees)); row.rate=row.netSales===0?null:new Decimal(row.contribution).div(row.netSales).mul(100).toNumber(); row.status=profitStatus(row.rate); return row; }).sort((a,b)=>b.contribution-a.contribution);
}

function profitStatus(rate: number | null) { if (rate===null) return "확인 필요"; if(rate>=80)return"매우 좋음";if(rate>=70)return"좋음";if(rate>=65)return"보통";return"개선 필요"; }

export type InventoryRow = { materialId:string;name:string;unit:string;current:number;lastCount:string|null;dailyUsage:number|null;daysLeft:number|null;target:number|null;shortage:boolean;orderQuantity:number|null;packQuantity:number };
export function calculateInventory(data: CafeDataset): InventoryRow[] {
  const closedDays = data.calendar.filter((row)=>row.isOpen===true&&row.recordComplete===true).map((row)=>s(row,"date")).sort().slice(-28);
  return data.materials.map((material)=>{
    const materialId=s(material,"materialId"), unit=s(material,"unit");
    const opening=data.openingInventory.find((row)=>row.materialId===materialId);
    const counts=data.inventoryEvents.filter((row)=>row.materialId===materialId&&row.eventType==="실사조정"&&row.countedQuantity!=null).sort((a,b)=>s(b,"date").localeCompare(s(a,"date"))||s(b,"eventId").localeCompare(s(a,"eventId")));
    const last=counts[0]; const cutoff=last?s(last,"date"):s(opening??{},"date"); let current=last?n(last,"countedQuantity"):n(opening??{},"quantity");
    for(const event of data.inventoryEvents) if(event.materialId===materialId&&(!last?s(event,"date")>=cutoff:s(event,"date")>cutoff)) current+=n(event,"quantity");
    const usageFor=(sale:DataRow)=>data.recipes.filter((recipe)=>recipe.menuId===sale.menuId&&recipe.recipeVersion===sale.recipeVersion&&recipe.materialId===materialId&&(!recipe.channelOnly||recipe.channelOnly===sale.channel)).reduce((sum,recipe)=>sum+n(recipe,"quantity")*n(sale,"quantity"),0);
    for(const sale of data.sales) if(!last?s(sale,"date")>=cutoff:s(sale,"date")>cutoff) current-=usageFor(sale);
    const used=closedDays.reduce((sum,date)=>sum+data.sales.filter((sale)=>sale.date===date).reduce((x,sale)=>x+usageFor(sale),0),0);
    const dailyUsage=closedDays.length?used/closedDays.length:null;
    const target=dailyUsage&&dailyUsage>0?dailyUsage*(n(material,"leadDays")+n(material,"safetyDays")):null;
    const shortage=target!==null&&current<target; const pack=n(material,"packQuantity");
    const orderQuantity=dailyUsage&&dailyUsage>0?Math.ceil(Math.max(0,(target??0)-current)/pack)*pack:null;
    return {materialId,name:s(material,"name"),unit,current,lastCount:last?s(last,"date"):null,dailyUsage,daysLeft:dailyUsage&&dailyUsage>0?current/dailyUsage:null,target,shortage,orderQuantity,packQuantity:pack};
  }).sort((a,b)=>Number(b.shortage)-Number(a.shortage)||a.name.localeCompare(b.name,"ko"));
}

export type PnlValues = { netSales:number;foodCost:number;packagingCost:number;fees:number;directCost:number;contribution:number;expenses:number;operatingProfit:number;operatingRate:number|null };
export type ActualPnl = { confirmed:PnlValues; pending:PnlValues; total:PnlValues; includedStart:string|null; includedEnd:string|null };
const emptyPnl=():PnlValues=>({netSales:0,foodCost:0,packagingCost:0,fees:0,directCost:0,contribution:0,expenses:0,operatingProfit:0,operatingRate:null});
function finishPnl(value:PnlValues){value.directCost=money(new Decimal(value.foodCost).add(value.packagingCost));value.contribution=money(new Decimal(value.netSales).sub(value.directCost).sub(value.fees));value.operatingProfit=money(new Decimal(value.contribution).sub(value.expenses));value.operatingRate=value.netSales===0?null:new Decimal(value.operatingProfit).div(value.netSales).mul(100).toNumber();return value}
export function calculateActualPnl(data:CafeDataset,period:Period):ActualPnl{const confirmed=emptyPnl(),pending=emptyPnl();const closed=new Set(data.calendar.filter((r)=>r.recordComplete===true).map((r)=>s(r,"date")));const dates:string[]=[];for(const sale of data.sales){const date=s(sale,"date");if(!inPeriod(date,period))continue;dates.push(date);const bucket=closed.has(date)?confirmed:pending;bucket.netSales+=n(sale,"netSales");bucket.foodCost+=n(sale,"quantity")*n(sale,"unitFoodCostSnapshot");bucket.packagingCost+=n(sale,"quantity")*n(sale,"unitPackagingCostSnapshot");bucket.fees+=n(sale,"paymentFee")}for(const expense of data.expenses){const date=s(expense,"date");if(!inPeriod(date,period))continue;dates.push(date);(closed.has(date)?confirmed:pending).expenses+=n(expense,"amount")}finishPnl(confirmed);finishPnl(pending);const total=finishPnl({netSales:confirmed.netSales+pending.netSales,foodCost:confirmed.foodCost+pending.foodCost,packagingCost:confirmed.packagingCost+pending.packagingCost,fees:confirmed.fees+pending.fees,directCost:0,contribution:0,expenses:confirmed.expenses+pending.expenses,operatingProfit:0,operatingRate:null});dates.sort();return{confirmed,pending,total,includedStart:dates[0]??null,includedEnd:dates.at(-1)??null}}

export type ForecastPnl={available:boolean;reason?:string;historyDays:number;remainingOpenDays:number;forecastSales:number;forecastDirectCost:number;forecastFees:number;forecastExpenses:number;projectedOperatingProfit:number;projectedRate:number|null};
export function forecastPnl(data:CafeDataset,period:Period,actual:ActualPnl):ForecastPnl {
  const unavailable=(reason:string):ForecastPnl=>({available:false,reason,historyDays:0,remainingOpenDays:0,forecastSales:0,forecastDirectCost:0,forecastFees:0,forecastExpenses:0,projectedOperatingProfit:0,projectedRate:null});
  const calendar=data.calendar.filter((row)=>inPeriod(s(row,"date"),period));
  if(!calendar.length)return unavailable("선택 기간의 영업 달력이 없습니다.");
  const pendingDates=calendar.filter((row)=>row.recordComplete!==true);
  if(!pendingDates.length)return{...unavailable("선택 기간이 모두 마감되어 실적만 표시합니다."),projectedOperatingProfit:actual.total.operatingProfit,projectedRate:actual.total.operatingRate};
  const history=data.calendar.filter((row)=>row.isOpen===true&&row.recordComplete===true&&s(row,"date")<period.start).sort((a,b)=>s(b,"date").localeCompare(s(a,"date"))).slice(0,28);
  if(!history.length)return unavailable("최근 마감 영업일이 없어 예상 손익을 계산할 수 없습니다.");
  const historySet=new Set(history.map((row)=>s(row,"date")));
  const base=data.sales.filter((row)=>historySet.has(s(row,"date"))).reduce<{sales:number;direct:number;fees:number}>((total,row)=>({sales:total.sales+n(row,"netSales"),direct:total.direct+n(row,"quantity")*(n(row,"unitFoodCostSnapshot")+n(row,"unitPackagingCostSnapshot")),fees:total.fees+n(row,"paymentFee")}),{sales:0,direct:0,fees:0});
  const saleDates=new Set(data.sales.filter((row)=>inPeriod(s(row,"date"),period)).map((row)=>s(row,"date")));
  const remainingOpen=pendingDates.filter((row)=>row.isOpen===true&&!saleDates.has(s(row,"date")));
  const daily={sales:base.sales/history.length,direct:base.direct/history.length,fees:base.fees/history.length};
  let forecastExpenses=0;
  const expenseDates=new Set(data.expenses.filter((row)=>inPeriod(s(row,"date"),period)).map((row)=>s(row,"date")));
  for(const day of pendingDates){
    const date=s(day,"date"); if(expenseDates.has(date))continue;
    const month=date.slice(0,7); const plans=data.monthlyExpensePlan.filter((row)=>row.month===month);
    if(!plans.length)return{...unavailable(`${month} 월 비용계획이 없어 예상 손익을 계산할 수 없습니다.`),historyDays:history.length,remainingOpenDays:remainingOpen.length};
    const days=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
    forecastExpenses+=plans.reduce((sum,row)=>sum+n(row,"amount"),0)/days;
  }
  const forecastSales=money(daily.sales*remainingOpen.length),forecastDirectCost=money(daily.direct*remainingOpen.length),forecastFees=money(daily.fees*remainingOpen.length);
  forecastExpenses=money(forecastExpenses);
  const projectedSales=actual.total.netSales+forecastSales;
  const projectedOperatingProfit=money(new Decimal(actual.total.contribution).add(forecastSales).sub(forecastDirectCost).sub(forecastFees).sub(actual.total.expenses).sub(forecastExpenses));
  return{available:true,historyDays:history.length,remainingOpenDays:remainingOpen.length,forecastSales,forecastDirectCost,forecastFees,forecastExpenses,projectedOperatingProfit,projectedRate:projectedSales===0?null:new Decimal(projectedOperatingProfit).div(projectedSales).mul(100).toNumber()};
}
