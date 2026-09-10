/**
 * Safe fetch helper for JSON API requests.
 * Protects against HTML error pages or proxy startup responses returning '<!doctype html>'
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(input, init);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    let data: any = null;
    let isJson = false;

    if (contentType.includes('application/json') || contentType.includes('+json') || contentType.includes('text/json')) {
      try {
        data = await res.json();
        isJson = true;
      } catch {
        isJson = false;
      }
    } else {
      // In case proxies or gateways alter or omit the Content-Type header, try parsing text as JSON
      try {
        const text = await res.text();
        if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
          data = JSON.parse(text);
          isJson = true;
        }
      } catch {
        isJson = false;
      }
    }

    if (isJson) {
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: !res.ok ? (data?.error || data?.message || `Request failed with status ${res.status}`) : undefined
      };
    }

    // Response is definitely not JSON (e.g., HTML from reverse proxy during startup)
    return {
      ok: false,
      status: res.status,
      error: !res.ok
        ? (res.status === 502 || res.status === 503 || res.status === 504
            ? 'Server is initializing. Please try again in a few seconds.'
            : `Server error (${res.status})`)
        : 'Received non-JSON response from server'
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Network connection error'
    };
  }
}
