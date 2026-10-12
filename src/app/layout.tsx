import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Espresso Ledger | 카페 운영관리", description: "카페 판매·재고·비용 자료를 안전하게 관리하는 브라우저 프로그램" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><DataProvider><AppShell>{children}</AppShell></DataProvider></body></html>;
}
