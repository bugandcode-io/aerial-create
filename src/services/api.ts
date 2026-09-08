export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
let expectedUserId: string | null = null;
export function setApiUser(id: string | null) { expectedUserId = id; }
export async function apiRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api${path}`, {
      method, credentials:'include', headers:{'Content-Type':'application/json','X-Aerial-Request':'1',
        ...(expectedUserId ? {'X-Aerial-User':expectedUserId} : {})},
      body:body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(20000),
    });
  } catch { throw new Error('The API is unavailable. Your local recovery draft is retained. Check your connection and try again.'); }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'The request failed. Please try again.';
    throw new ApiError(response.status,message);
  }
  return data as T;
}
