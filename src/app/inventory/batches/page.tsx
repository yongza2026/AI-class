import { Suspense } from "react";
import { BatchManager } from "@/components/BatchManager";
export default function InventoryBatchesPage(){return <Suspense fallback={<p>제조 배치를 불러오고 있습니다…</p>}><BatchManager/></Suspense>;}
