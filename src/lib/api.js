import { createApiClient } from './client';
export const sessionKey = 'jnvmsd-session';
export const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8787' : '');
/** Read a tab-scoped session without crashing browsers that disallow storage. */
export function getSession() { try { return sessionStorage.getItem(sessionKey); } catch { return null; } }
/** Save or remove the session token only in this browser tab. */
export function setSession(token) { try { token ? sessionStorage.setItem(sessionKey, token) : sessionStorage.removeItem(sessionKey); } catch { throw new Error('Please enable browser storage to sign in.'); } }
/** Clear expired credentials and inform all mounted member views. */
function expireSession() { setSession(null); window.dispatchEvent(new Event('alumni-session-expired')); }
export const api = createApiClient(apiBase, getSession, fetch, expireSession);
