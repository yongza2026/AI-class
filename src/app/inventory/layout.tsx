import { Suspense } from "react";
import { InventoryWorkspaceNav } from "@/components/InventoryWorkspaceNav";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <InventoryWorkspaceNav />
        {children}
      </Suspense>
    </>
  );
}

