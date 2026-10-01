"use client";
export function dataHeaders(requestId = crypto.randomUUID()) {
  return { "Content-Type": "application/json", "X-Request-Id": requestId, "X-Studio-Actor": "browser", "X-Studio-Profile": "local" };
}
export function announceDataChange() { window.dispatchEvent(new Event("studio-data-changed")); }
