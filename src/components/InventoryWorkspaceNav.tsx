"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [
  { href: "/inventory", label: "재고 현황" },
  { href: "/inventory/history", label: "재고 이력" },
  { href: "/inventory/items", label: "품목 설정" },
] as const;

export function InventoryWorkspaceNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isWorkspace = tabs.some(({ href }) => pathname === href || pathname === `${href}/`);

  if (!isWorkspace) return null;

  const params = new URLSearchParams(searchParams.toString());
  params.delete("detail");
  params.delete("edit");
  params.delete("event");
  params.delete("return");
  params.delete("material");
  const suffix = params.size ? `?${params.toString()}` : "";

  return (
    <div className="inventory-tabs-wrap">
      <nav className="inventory-tabs" aria-label="재고 관리 화면">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname === `${tab.href}/`;
          return (
            <Link
              key={tab.href}
              href={`${tab.href}${suffix}`}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

