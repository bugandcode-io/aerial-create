import { Editor } from './components/editor/Editor';
import { useEffect, useState } from 'react';
import { authApi, type CurrentUser } from './services/auth';
import { ApiError, setApiUser } from './services/api';
import { AuthScreen } from './components/auth/AuthScreen';
export default function App() {
  const [user,setUser] = useState<CurrentUser | null>(null);
  const [loading,setLoading] = useState(true); const [error,setError] = useState('');
  useEffect(() => {
    let active = true;
    authApi.me().then(result=>{if(active){setApiUser(result.user.id);setUser(result.user);}}).catch(error=>{
      if(active && !(error instanceof ApiError && error.status === 401)) setError(error.message);
    }).finally(()=>{if(active)setLoading(false);});
    return () => {active=false;};
  },[]);
  if(loading) return <main className="auth-screen auth-loading"><div className="auth-card auth-loading-card" role="status" aria-live="polite">
    <div className="brand"><span className="brand-mark">A</span><span>AERIAL <b>CREATE</b></span></div>
    <div className="loading-spinner" aria-hidden="true" />
    <h1>Restoring your session</h1>
    <p>Checking your saved design access…</p>
  </div></main>;
  return user ? <Editor key={user.id} user={user} onLogout={()=>{setApiUser(null);setUser(null);}} /> : <AuthScreen initialError={error} onAuthenticated={user=>{setApiUser(user.id);setUser(user);}} />;
}
