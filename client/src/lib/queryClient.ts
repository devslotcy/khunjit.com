import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getStatusMessage } from "./http-error";

/**
 * Custom error class for API errors with status code
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let data: unknown = null;
    let message = getStatusMessage(res.status);

    try {
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
          // Extract message from JSON response
          if (typeof data === "object" && data !== null) {
            const dataObj = data as Record<string, unknown>;
            if (typeof dataObj.message === "string") {
              message = dataObj.message;
            } else if (typeof dataObj.error === "string") {
              message = dataObj.error;
            }
          }
        } catch {
          // Not JSON, use text if it's not empty and reasonable length
          if (text.trim() && text.length < 200) {
            message = text;
          }
        }
      }
    } catch {
      // Could not read response body
    }

    throw new ApiError(message, res.status, data);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check if data is FormData (for file uploads)
  const isFormData = data instanceof FormData;

  const res = await fetch(url, {
    method,
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from query key
    let url = "";
    const params = new URLSearchParams();

    for (let i = 0; i < queryKey.length; i++) {
      const part = queryKey[i];

      if (typeof part === "string") {
        url += part;
      } else if (typeof part === "object" && part !== null) {
        // Add query parameters from object
        Object.entries(part).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            params.append(key, String(value));
          }
        });
      }
    }

    // Append query parameters if any
    const queryString = params.toString();
    if (queryString) {
      url += "?" + queryString;
    }

    const res = await fetch(url, {
      credentials: "include",
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
