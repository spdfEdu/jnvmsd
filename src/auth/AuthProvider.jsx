import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './context';
import { api, getSession, setSession } from '../lib/api';
/** Restore verified sessions and expose login/logout without trusting client-assigned roles. */
export default function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(Boolean(getSession()));
  const [error, setError] = useState('');
  /** Refresh account data after a profile edit or a successful Google sign-in. */
  const refresh = useCallback(async () => { const data = await api('/api/me'); setAccount(data); return data; }, []);
  useEffect(() => {
    let active = true;
    if (getSession()) api('/api/me').then(data => { if (active) setAccount(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    /** Remove privileged UI immediately when any request detects session expiry. */
    const expired = () => { setAccount(null); setError('Your session expired. Please sign in again.'); };
    window.addEventListener('alumni-session-expired', expired);
    return () => { active = false; window.removeEventListener('alumni-session-expired', expired); };
  }, []);
  /** Exchange a Google credential for the backend's hashed-session login. */
  const login = useCallback(async (credential) => { setError(''); const data = await api('/api/session', { method: 'POST', headers: { Authorization: 'Bearer ' + credential } }); setSession(data.session); await refresh(); }, [refresh]);
  /** Revoke the current backend session before clearing its tab-scoped token. */
  async function logout() { setError(''); try { await api('/api/session', { method: 'DELETE' }); } catch (e) { setError(e.message); } finally { setSession(null); setAccount(null); } }
  return <AuthContext.Provider value={{ account, loading, error, login, logout, refresh }}>{children}</AuthContext.Provider>;
}
