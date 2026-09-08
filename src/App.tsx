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
  if(loading) return <main className="auth-screen"><p role="status">Restoring your session…</p></main>;
  return user ? <Editor key={user.id} user={user} onLogout={()=>{setApiUser(null);setUser(null);}} /> : <AuthScreen initialError={error} onAuthenticated={user=>{setApiUser(user.id);setUser(user);}} />;
}
