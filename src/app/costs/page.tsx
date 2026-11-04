import { Suspense } from "react";
import CostManager from "@/components/CostManager";
import { PurchaseLedger } from "@/components/PurchaseLedger";

export default function CostsPage() {
  return <><PurchaseLedger/><Suspense fallback={<p>구매·원가를 불러오고 있습니다…</p>}><CostManager /></Suspense></>;
}
