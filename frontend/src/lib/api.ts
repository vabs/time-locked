import { useAuth } from "@clerk/clerk-react";

const BASE = "/api";

async function request(
  getToken: () => Promise<string | null>,
  method: string,
  path: string,
  body?: unknown
) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json();
}

export function useApi() {
  const { getToken } = useAuth();
  const get = (path: string) => request(getToken, "GET", path);
  const post = (path: string, body: unknown) => request(getToken, "POST", path, body);
  const patch = (path: string, body?: unknown) => request(getToken, "PATCH", path, body);
  const del = (path: string, body?: unknown) => request(getToken, "DELETE", path, body);
  return { get, post, patch, del };
}
