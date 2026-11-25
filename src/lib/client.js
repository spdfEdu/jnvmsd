/** Create a client scoped to one API origin; session tokens never follow arbitrary URLs. */
export function createApiClient(base, getToken, fetcher = fetch, onExpired = () => {}) {
  /** Send a bounded API-path request and convert server failures into readable errors. */
  return async function request(path, options = {}) {
    if (!/^\/api\//.test(path) || path.includes('\\') || path.includes('..')) throw new Error('Invalid API path');
    if (!base) throw new Error('Member services are being connected. Please try again later.');
    const { body, raw = false, ...rest } = options;
    const headers = new Headers(rest.headers);
    const token = getToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
    const binary = body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body);
    if (body !== undefined && !binary) headers.set('Content-Type', 'application/json');
    const response = await fetcher(base.replace(/\/$/, '') + path, { ...rest, headers, redirect: 'error', body: body === undefined ? undefined : binary ? body : JSON.stringify(body) });
    if (response.status === 401) onExpired();
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Unable to complete the request. Please try again.');
    }
    return raw ? response.blob() : response.json();
  };
}
