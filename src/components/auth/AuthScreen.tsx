import { useState } from 'react';
import { authApi, type CurrentUser } from '../../services/auth';
import '../editor/editor.css';
export function AuthScreen({onAuthenticated, initialError = ''}: {onAuthenticated:(user:CurrentUser)=>void; initialError?:string}) {
  const [register,setRegister] = useState(false);
  const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
  const [error,setError] = useState(initialError); const [busy,setBusy] = useState(false);

  return <main className="auth-screen">
    <div className="auth-shell">
      <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual-content">
          <div className="brand brand-large"><span className="brand-mark">A</span><span>AERIAL <b>CREATE</b></span></div>
          <p className="auth-eyebrow">Design workspace</p>
          <h2>Bring ideas to life, wherever you are.</h2>
          <ul className="auth-benefits">
            <li>Save projects across devices</li>
            <li>Open, edit, and refine designs anytime</li>
            <li>Work from a clean, focused canvas</li>
          </ul>
        </div>
      </aside>

      <form className="auth-card" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError('');
        try { const result = await (register ? authApi.register(email,password) : authApi.login(email,password)); setPassword(''); onAuthenticated(result.user); }
        catch (error) { setError(error instanceof Error ? error.message : 'Could not sign in.'); }
        finally { setBusy(false); }
      }}>
        <div className="auth-header">
          <p className="auth-tag">{register ? 'Create account' : 'Welcome back'}</p>
          <h1>{register ? 'Create your account' : 'Sign in to continue'}</h1>
        </div>

        <p className="auth-copy">{register ? 'Start building with your own design workspace.' : 'Access your saved designs and keep creating from any device.'}</p>

        <label>Email
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" />
        </label>

        <label>Password
          <input type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={12} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} placeholder={register ? 'Enter a secure password' : 'Enter your password'} />
        </label>

        {register && <p className="field-help">Use 12–128 characters.</p>}
        {error && <p role="alert">{error}</p>}

        <button className="download-button" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}</button>

        <button type="button" className="auth-switch" disabled={busy} onClick={()=>{setRegister(!register);setError('');}}>
          {register ? 'Already have an account? Log in' : 'Need an account? Create one'}
        </button>
      </form>
    </div>
  </main>;
}
