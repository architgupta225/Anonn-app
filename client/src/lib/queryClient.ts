import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log('[apiRequest] Making request:', { method, url, hasData: !!data });
  
  // Attach Dynamic access token (canonical getter)
  let token = null;
  
  if (typeof window !== 'undefined' && (window as any).__getDynamicToken) {
    try {
      token = await (window as any).__getDynamicToken();
    } catch (error) {
      console.warn('[apiRequest] Error getting token:', error);
    }
  }
  
  // Fallback: try to get token directly from Dynamic if available
  if (!token && typeof window !== 'undefined' && (window as any).getAuthToken) {
    try {
      token = (window as any).getAuthToken();
    } catch (error) {
      console.warn('[apiRequest] Error getting fallback token:', error);
    }
  }
  
  console.log('[apiRequest] Token available:', !!token);
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('[apiRequest] Response status:', res.status);
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = typeof window !== 'undefined' && (window as any).__getDynamicToken
      ? await (window as any).__getDynamicToken()
      : null;
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
