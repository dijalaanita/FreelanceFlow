export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// NOTE on the security review's finding #12/Critical (access token in
// localStorage is an XSS risk): the fully hardened fix is a server-side BFF
// that keeps both tokens in httpOnly cookies. That's a real infra piece,
// not just a frontend change, so it's left as a documented follow-up here.
// This client at least keeps tokens out of the DOM/React state and adds the
// missing refresh-and-retry flow the review called out as absent.
const ACCESS_KEY = "ff_access_token";
const REFRESH_KEY = "ff_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string) {
  window.localStorage.setItem(ACCESS_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    clearTokens();
    return null;
  }
  const data = await response.json();
  setTokens(data.access_token);
  return data.access_token as string;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });

  if (response.status === 401) {
    const newAccessToken = await tryRefresh();
    if (newAccessToken) {
      headers.set("Authorization", `Bearer ${newAccessToken}`);
      response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
    }
  }

  return response;
}
