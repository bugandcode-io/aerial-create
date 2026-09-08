import { useState } from 'react';
import { authApi, type CurrentUser } from '../../services/auth';
import '../editor/editor.css';
export function AuthScreen({onAuthenticated, initialError = ''}: {onAuthenticated:(user:CurrentUser)=>void; initialError?:string}) {
  const [register,setRegister] = useState(false);
  const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
  const [error,setError] = useState(initialError); const [busy,setBusy] = useState(false);
  return <main className="auth-screen"><form className="auth-card" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await (register ? authApi.register(email,password) : authApi.login(email,password)); setPassword(''); onAuthenticated(result.user); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  }}>
    <div className="brand"><span className="brand-mark">A</span><span>AERIAL <b>CREATE</b></span></div>
    <h1>{register ? 'Create your account' : 'Welcome back'}</h1>
    <p>Sign in to save and open your designs across devices.</p>
    <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} /></label>
    <label>Password<input type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={12} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} /></label>
    {register && <p className="field-help">Use 12–128 characters.</p>}
    {error && <p role="alert">{error}</p>}
    <button className="download-button" disabled={busy}>{busy ? 'Please wait…' : register ? 'Register' : 'Log in'}</button>
    <button type="button" className="auth-switch" disabled={busy} onClick={()=>{setRegister(!register);setError('');}}>{register ? 'Already have an account? Log in' : 'Create an account'}</button>
  </form></main>;
}
