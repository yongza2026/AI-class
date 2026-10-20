import { Suspense } from "react";
import { SalesManager } from "@/components/SalesManager";
export default function SalesPage() { return <Suspense fallback={null}><SalesManager/></Suspense>; }
