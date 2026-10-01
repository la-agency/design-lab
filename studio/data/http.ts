import { DataError } from "./database";
export function identity(request: Request) {
  const profile = request.headers.get("x-studio-profile") ?? "local";
  const actor = request.headers.get("x-studio-actor") ?? "browser";
  const requestId = request.headers.get("x-request-id");
  if (!/^[a-z0-9-]{1,80}$/u.test(profile) || !/^[\w .@-]{1,100}$/u.test(actor)) throw new DataError("Invalid local profile or actor.");
  if (requestId !== null && !/^[\w-]{1,100}$/u.test(requestId)) throw new DataError("Invalid request ID.");
  return { profile, actor, requestId };
}
export function requireRequestId(request: Request) {
  const info = identity(request);
  if (!info.requestId) throw new DataError("Supply X-Request-Id for safe retries.", 428);
  return { ...info, requestId: info.requestId };
}
export async function body(request: Request, limit = 250000): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > limit) throw new DataError("Update too large.", 413);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new DataError("Invalid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DataError("Expected an object.");
  return value as Record<string, unknown>;
}
export function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new DataError("Supply a non-negative revision.", 428);
  return Number(value);
}
export function dataResponse(value: unknown) { return Response.json(value, { headers: { "Cache-Control": "no-store" } }); }
export function failure(error: unknown) {
  if (error instanceof DataError) return Response.json({ error: error.message, current: error.current }, { status: error.status });
  console.error("Workspace storage failed", error);
  return Response.json({ error: "Workspace storage failed. Your edit has not been discarded; retry after checking the server." }, { status: 500 });
}
