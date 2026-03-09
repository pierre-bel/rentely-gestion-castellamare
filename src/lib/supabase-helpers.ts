import { supabase } from "@/integrations/supabase/client";

// Simple helper to get a dynamic table reference (bypasses strict typing for generic helpers)
const from = (table: string) => supabase.from(table as any);

// ─── Generic result type ───
interface QueryResult<T> {
  data: T | null;
  error: string | null;
}

function errMsg(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) return (error as any).message;
  return String(error);
}

// ─── 1. SELECT rows by owner column ───
export async function selectByOwner<T = any>(
  table: string,
  ownerCol: string,
  userId: string,
  options?: { order?: string; ascending?: boolean; select?: string }
): Promise<QueryResult<T[]>> {
  const { data, error } = await from(table)
    .select(options?.select ?? "*")
    .eq(ownerCol, userId)
    .order(options?.order ?? "created_at", { ascending: options?.ascending ?? false });
  if (error) return { data: null, error: errMsg(error) };
  return { data: data as T[], error: null };
}

// ─── 2. SELECT single row ───
export async function selectOne<T = any>(
  table: string,
  column: string,
  value: string,
  select?: string
): Promise<QueryResult<T>> {
  const { data, error } = await from(table)
    .select(select ?? "*")
    .eq(column, value)
    .maybeSingle();
  if (error) return { data: null, error: errMsg(error) };
  return { data: data as T, error: null };
}

// ─── 3. INSERT one row ───
export async function insertRow(
  table: string,
  row: Record<string, any>
): Promise<QueryResult<any>> {
  const { data, error } = await from(table).insert(row as any).select().single();
  if (error) return { data: null, error: errMsg(error) };
  return { data, error: null };
}

// ─── 4. INSERT multiple rows ───
export async function insertRows(
  table: string,
  rows: Record<string, any>[]
): Promise<QueryResult<any[]>> {
  const { data, error } = await from(table).insert(rows as any).select();
  if (error) return { data: null, error: errMsg(error) };
  return { data, error: null };
}

// ─── 5. UPDATE row by id ───
export async function updateById(
  table: string,
  id: string,
  updates: Record<string, any>
): Promise<QueryResult<any>> {
  const { data, error } = await from(table).update(updates).eq("id", id).select().single();
  if (error) return { data: null, error: errMsg(error) };
  return { data, error: null };
}

// ─── 6. UPDATE rows by owner column ───
export async function updateByOwner(
  table: string,
  ownerCol: string,
  userId: string,
  updates: Record<string, any>
): Promise<QueryResult<any>> {
  const { data, error } = await from(table).update(updates).eq(ownerCol, userId).select();
  if (error) return { data: null, error: errMsg(error) };
  return { data, error: null };
}

// ─── 7. DELETE row by id ───
export async function deleteById(
  table: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await from(table).delete().eq("id", id);
  return { error: error ? errMsg(error) : null };
}

// ─── 8. DELETE rows by owner column ───
export async function deleteByOwner(
  table: string,
  ownerCol: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await from(table).delete().eq(ownerCol, userId);
  return { error: error ? errMsg(error) : null };
}

// ─── 9. UPSERT (check exists then insert or update) ───
export async function upsertByOwner(
  table: string,
  ownerCol: string,
  userId: string,
  data: Record<string, any>
): Promise<QueryResult<any>> {
  const { data: existing } = await from(table)
    .select("id")
    .eq(ownerCol, userId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await from(table)
      .update(data)
      .eq(ownerCol, userId)
      .select()
      .single();
    if (error) return { data: null, error: errMsg(error) };
    return { data: updated, error: null };
  } else {
    const { data: inserted, error } = await from(table)
      .insert({ [ownerCol]: userId, ...data } as any)
      .select()
      .single();
    if (error) return { data: null, error: errMsg(error) };
    return { data: inserted, error: null };
  }
}

// ─── 10. SELECT with multiple eq filters ───
export async function selectWhere<T = any>(
  table: string,
  filters: Record<string, any>,
  options?: { order?: string; ascending?: boolean; select?: string; limit?: number }
): Promise<QueryResult<T[]>> {
  let query = from(table).select(options?.select ?? "*");
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val);
  }
  if (options?.order) query = query.order(options.order, { ascending: options.ascending ?? true });
  if (options?.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) return { data: null, error: errMsg(error) };
  return { data: data as T[], error: null };
}

// ─── 11. Replace all rows for an owner (delete + insert) ───
export async function replaceAllForOwner(
  table: string,
  ownerCol: string,
  userId: string,
  rows: Record<string, any>[]
): Promise<{ error: string | null }> {
  const { error: delErr } = await from(table).delete().eq(ownerCol, userId);
  if (delErr) return { error: errMsg(delErr) };
  if (rows.length === 0) return { error: null };
  const { error: insErr } = await from(table).insert(rows as any);
  if (insErr) return { error: errMsg(insErr) };
  return { error: null };
}

// ─── 12. Count rows ───
export async function countWhere(
  table: string,
  filters: Record<string, any>
): Promise<QueryResult<number>> {
  let query = from(table).select("*", { count: "exact", head: true });
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val);
  }
  const { count, error } = await query;
  if (error) return { data: null, error: errMsg(error) };
  return { data: count ?? 0, error: null };
}

// ─── 13. SELECT with IN filter ───
export async function selectWhereIn<T = any>(
  table: string,
  column: string,
  values: string[],
  options?: { select?: string; order?: string; ascending?: boolean }
): Promise<QueryResult<T[]>> {
  const { data, error } = await from(table)
    .select(options?.select ?? "*")
    .in(column, values)
    .order(options?.order ?? "created_at", { ascending: options?.ascending ?? false });
  if (error) return { data: null, error: errMsg(error) };
  return { data: data as T[], error: null };
}

// ─── 14. Get current user id (shorthand) ───
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─── 15. Wrap async operation with toast feedback ───
export async function withToast<T>(
  operation: () => Promise<QueryResult<T> | { error: string | null }>,
  toast: (opts: { title: string; description?: string; variant?: "destructive" | "default" }) => void,
  successMsg: string
): Promise<boolean> {
  try {
    const result = await operation();
    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
      return false;
    }
    toast({ title: successMsg });
    return true;
  } catch (e: any) {
    toast({ title: "Erreur", description: errMsg(e), variant: "destructive" });
    return false;
  }
}
