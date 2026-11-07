import { API_BASE } from './config.js';

/** Shared client. Add CSRF header after A implements auth. Never put AI URLs in client input. */
export async function apiRequest(path, { method = 'GET', body, csrfToken } = {}) {
  const url = new URL(path, API_BASE);
  if (url.origin !== API_BASE.origin || !url.pathname.startsWith(API_BASE.pathname)) {
    throw new Error('API path must stay within this app API.');
  }
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(url, {
    method, headers, credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error('API chưa trả JSON. Kiểm tra PHP server, không mở PHP bằng static server.');
  }
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload.error?.code || 'API_ERROR';
    throw error;
  }
  return payload.data;
}
