import { Editor } from './components/editor/Editor';
import { useEffect, useState } from 'react';
import { authApi, type CurrentUser } from './services/auth';
import { ApiError, setApiUser } from './services/api';
import { AuthScreen } from './components/auth/AuthScreen';
import { LandingPage, InformationPage } from './components/marketing/LandingPage';
import { LegalPage } from './components/marketing/LegalPage';
import { resolveRoute, routeDestination, type AppRoute } from './utils/routes';
export default function App() {
  const [user,setUser] = useState<CurrentUser | null>(null);
  const [loading,setLoading] = useState(true); const [error,setError] = useState('');
  const [route,setRoute] = useState(()=>resolveRoute(window.location.pathname));
  const effectiveRoute = loading ? route : routeDestination(route,Boolean(user));
  const navigate = (next:AppRoute,replace=false) => {
    window.history[replace?'replaceState':'pushState'](null,'',next);setRoute(next);window.scrollTo(0,0);
  };
  useEffect(()=>{const pop=()=>setRoute(resolveRoute(window.location.pathname));window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  useEffect(()=>{
    if(effectiveRoute!==route)window.history.replaceState(null,'',effectiveRoute);
  },[route,effectiveRoute]);
  useEffect(()=>{document.title=`Aerial Create — ${route==='/'?'Your visual design workspace':route==='/editor'?'Editor':route==='/register'?'Create account':route==='/login'?'Log in':route==='/privacy'?'Privacy':route==='/terms'?'Terms':'Page not found'}`;},[route]);
  useEffect(() => {
    let active = true;
    authApi.me().then(result=>{if(active){setApiUser(result.user.id);setUser(result.user);}}).catch(error=>{
      if(active && !(error instanceof ApiError && error.status === 401)) setError(error.message);
    }).finally(()=>{if(active)setLoading(false);});
    return () => {active=false;};
  },[]);
  if(route==='/') return <LandingPage authenticated={Boolean(user)} />;
  if(route==='/privacy'||route==='/terms') return <LegalPage kind={route==='/privacy'?'privacy':'terms'} />;
  if(route==='/not-found') return <InformationPage kind="not-found" />;
  if(loading) return <main className="auth-screen auth-loading"><div className="auth-card auth-loading-card" role="status" aria-live="polite">
    <div className="brand"><span className="brand-mark">A</span><span>AERIAL <b>CREATE</b></span></div>
    <div className="loading-spinner" aria-hidden="true" />
    <h1>Restoring your session</h1>
    <p>Checking your saved design access…</p>
  </div></main>;
  return user ? <Editor key={user.id} user={user} onLogout={()=>{setApiUser(null);setUser(null);navigate('/');}} /> : <AuthScreen key={route} register={route==='/register'} onModeChange={()=>navigate(route==='/register'?'/login':'/register')} initialError={error} onAuthenticated={user=>{setApiUser(user.id);setUser(user);navigate('/editor',true);}} />;
}
