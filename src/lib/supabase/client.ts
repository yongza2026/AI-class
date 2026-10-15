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
export type AccessRequestStatus = "pending" | "approved" | "rejected";
export type AccessRequestRole = "editor" | "viewer";
export type AccessRequest = {
  id: string;
  email: string;
  status: AccessRequestStatus;
  assignedRole: AccessRequestRole;
  requestedAt: string;
  reviewedAt: string | null;
};

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

const accessRequestSelect = "id,email,status,assigned_role,requested_at,reviewed_at";

function mapAccessRequest(row: Record<string, unknown>): AccessRequest {
  return {
    id: String(row.id),
    email: String(row.email),
    status: row.status as AccessRequestStatus,
    assignedRole: row.assigned_role as AccessRequestRole,
    requestedAt: String(row.requested_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

export async function getMyAccessRequest(): Promise<AccessRequest | null> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("로그인이 필요합니다.");
  const { data, error } = await supabase.from("access_requests").select(accessRequestSelect).eq("user_id", auth.user.id).maybeSingle();
  if (error) throw new Error(`가입 요청을 확인하지 못했습니다: ${error.message}`);
  return data ? mapAccessRequest(data) : null;
}

export async function requestStoreAccess(): Promise<AccessRequest> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email?.trim().toLowerCase();
  if (!auth.user || !email) throw new Error("이메일로 로그인한 사용자만 가입 요청을 보낼 수 있습니다.");
  const { data, error } = await supabase.from("access_requests").insert({ user_id: auth.user.id, email }).select(accessRequestSelect).single();
  if (error) throw new Error(`가입 요청을 보내지 못했습니다: ${error.message}`);
  return mapAccessRequest(data);
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  const { data, error } = await getSupabase().from("access_requests").select(accessRequestSelect).order("requested_at", { ascending: false });
  if (error) throw new Error(`가입 요청 목록을 불러오지 못했습니다: ${error.message}`);
  return (data ?? []).map(mapAccessRequest);
}

export async function reviewAccessRequest(id: string, status: "approved" | "rejected", role: AccessRequestRole): Promise<void> {
  const { data, error } = await getSupabase().from("access_requests").update({ status, assigned_role: role }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (error) throw new Error(`가입 요청을 처리하지 못했습니다: ${error.message}`);
  if (!data) throw new Error("이미 처리됐거나 관리자 권한이 없는 요청입니다.");
}
