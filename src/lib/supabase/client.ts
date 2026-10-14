import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function cloudConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("공용 저장소 연결 정보가 없습니다.");
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export type StoreAccess = { storeId: string; storeName: string; role: "owner" | "editor" | "viewer" };

export async function getStoreAccess(): Promise<StoreAccess> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("로그인이 필요합니다.");
  const { data, error } = await supabase.from("store_members").select("store_id,role,stores(name)").eq("user_id", auth.user.id).limit(1).maybeSingle();
  if (error) throw new Error(`매장 권한을 확인하지 못했습니다: ${error.message}`);
  if (!data) throw new Error("이 계정에 허용된 매장이 없습니다. 관리자에게 사용자 등록을 요청해 주세요.");
  const store = Array.isArray(data.stores) ? data.stores[0] : data.stores;
  return { storeId: String(data.store_id), storeName: String(store?.name ?? "POCO"), role: data.role as StoreAccess["role"] };
}
