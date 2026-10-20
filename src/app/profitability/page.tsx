import { Suspense } from "react";
import { ProfitabilityView } from "@/components/ProfitabilityView";
export default function ProfitabilityPage() { return <Suspense fallback={null}><ProfitabilityView/></Suspense>; }
