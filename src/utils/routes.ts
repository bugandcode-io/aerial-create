export type AppRoute = '/' | '/login' | '/register' | '/editor' | '/privacy' | '/terms' | '/not-found';
export function resolveRoute(path: string): AppRoute {
  const normalized = path.replace(/\/+$/, '') || '/';
  return ['/', '/login', '/register', '/editor', '/privacy', '/terms'].includes(normalized)
    ? normalized as AppRoute : '/not-found';
}
export function routeDestination(route: AppRoute, authenticated: boolean): AppRoute {
  if (authenticated && (route === '/login' || route === '/register')) return '/editor';
  if (!authenticated && route === '/editor') return '/login';
  return route;
}
