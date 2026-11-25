import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
/** Render Google's own sign-in button and exchange its verified credential through the API. */
export default function GoogleSignIn() {
  const target = useRef(null); const { login } = useAuth(); const [error, setError] = useState('');
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    let active = true;
    /** Initialize the Google widget once the external identity library is available. */
    const render = () => { if (!active || !target.current || !window.google) return; window.google.accounts.id.initialize({ client_id: clientId, callback: response => { login(response.credential).catch(e => setError(e.message)); } }); window.google.accounts.id.renderButton(target.current, { theme: 'outline', size: 'large', text: 'signin_with' }); };
    let script = document.querySelector('script[data-google-login]');
    if (window.google) render();
    else { if (!script) { script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.dataset.googleLogin = 'true'; document.head.appendChild(script); } script.addEventListener('load', render); }
    return () => { active = false; script?.removeEventListener('load', render); };
  }, [login]);
  return <div className="alumni-card"><h2>Welcome back, Navodayan</h2><p>Sign in with Google to update your profile and register for events.</p><div ref={target} />{!import.meta.env.VITE_GOOGLE_CLIENT_ID && <p>Sign-in will be available once member services are connected.</p>}{error && <p role="alert">{error}</p>}</div>;
}
