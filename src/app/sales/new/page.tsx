import { Suspense } from "react";
import { SalesManager } from "@/components/SalesManager";
export default function NewSalePage() { return <Suspense fallback={null}><SalesManager startOpen/></Suspense>; }
