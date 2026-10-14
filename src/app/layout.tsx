import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "POCO Operations | Local Drink House", description: "POCO의 판매·원가·재고·비용을 연결해 관리하는 운영 프로그램" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><DataProvider><AppShell>{children}</AppShell></DataProvider></body></html>;
}
