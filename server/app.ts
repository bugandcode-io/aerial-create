import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import argon2 from 'argon2';
import { parse, serialize } from 'cookie';
import { rateLimit } from 'express-rate-limit';
import { deserializeDocument } from '../src/services/documentFormat';
import type { AerialDocument } from '../src/types/document';
import type { Repository, PublicUser } from './repository';

class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export interface AppConfig { secret: string; origin: string; production: boolean }
export function createApp(repository: Repository, config: AppConfig) {
  const app = express();
  app.disable('x-powered-by');
  const allowedOrigins = new Set([
    config.origin,
    config.origin.replace('127.0.0.1', 'localhost'),
    config.origin.replace('localhost', '127.0.0.1'),
  ]);
  const cookieName = config.production ? '__Host-aerial-session' : 'aerial-session';
  const cookieOptions = { httpOnly:true, secure:config.production, sameSite:'lax' as const, path:'/' };
  const hash = (token: string) => createHmac('sha256', config.secret).update(token).digest('hex');
  const token = (req: Request) => parse(req.headers.cookie ?? '')[cookieName];
  const sessionHash = (req: Request) => { const value = token(req); return value && /^[a-f0-9]{64}$/.test(value) ? hash(value) : null; };
  app.use((req,res,next) => {
    res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    const origin = req.headers.origin;
    const isAllowedOrigin = origin ? allowedOrigins.has(origin) : false;
    if (origin && !isAllowedOrigin) { res.status(403).json({error:'Request origin is not allowed.'}); return; }
    if (origin && isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Aerial-Request, X-Aerial-User');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    // Origin plus a custom header protects cookie-authenticated mutations from CSRF.
    if (!['GET','HEAD'].includes(req.method) && (!isAllowedOrigin || req.headers['x-aerial-request'] !== '1')) {
      res.status(403).json({error:'Request verification failed.'}); return;
    }
    next();
  });
  app.use(express.json({ limit:'10mb', strict:true }));
  const authLimit = rateLimit({windowMs:15*60*1000, limit:30, standardHeaders:'draft-8', legacyHeaders:false,
    message:{error:'Too many attempts. Please try again later.'}});
  const credentials = (body: unknown) => {
    if (!body || typeof body !== 'object' || !('email' in body) || !('password' in body)) throw new ApiError(400,'Enter a valid email and a password of 12–128 characters.');
    const {email,password} = body;
    if (typeof email !== 'string' || typeof password !== 'string' || email.trim().length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 12 || password.length > 128) {
      throw new ApiError(400,'Enter a valid email and a password of 12–128 characters.');
    }
    return {email:email.trim().toLowerCase(),password};
  };
  const loginSession = async (req: Request,res: Response,user: PublicUser) => {
    const old = sessionHash(req); if (old) await repository.deleteSession(old);
    const value = randomBytes(32).toString('hex');
    await repository.createSession(hash(value),user.id,new Date(Date.now()+7*24*60*60*1000));
    res.setHeader('Set-Cookie',serialize(cookieName,value,{...cookieOptions,maxAge:7*24*60*60}));
    res.json({user:{id:user.id,email:user.email}});
  };
  app.post('/api/auth/register',authLimit,async (req,res) => {
    const {email,password} = credentials(req.body);
    const password_hash = await argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
    const user = {id:randomUUID(),email,password_hash};
    if (!await repository.createUser(user)) throw new ApiError(409,'An account could not be created with these details. Try signing in.');
    res.status(201); await loginSession(req,res,user);
  });
  // Verify a dummy hash for missing users, keeping wrong-email and wrong-password responses alike.
  const dummyHash = argon2.hash(randomBytes(32),{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
  app.post('/api/auth/login',authLimit,async (req,res) => {
    const {email,password} = credentials(req.body);
    const user = await repository.userByEmail(email);
    const valid = await argon2.verify(user?.password_hash ?? await dummyHash,password);
    if (!user || !valid) throw new ApiError(401,'Email or password is incorrect.');
    await loginSession(req,res,user);
  });
  app.post('/api/auth/logout',async (req,res) => {
    const value = sessionHash(req); if (value) await repository.deleteSession(value);
    res.setHeader('Set-Cookie',serialize(cookieName,'',{...cookieOptions,maxAge:0})); res.sendStatus(204);
  });
  const authenticate = async (req: Request,res: Response,next: NextFunction) => {
    const value = sessionHash(req); const user = value ? await repository.userBySession(value) : null;
    if (!user) throw new ApiError(401,'Please sign in to continue. Your local recovery draft is retained.');
    res.locals.user = user; next();
  };
  app.get('/api/auth/me',authenticate,(_req,res) => res.json({user:res.locals.user}));
  app.use('/api/projects',authenticate);
  app.use('/api/projects',(req,res,next)=>{
    if(req.headers['x-aerial-user'] && req.headers['x-aerial-user'] !== (res.locals.user as PublicUser).id) {
      throw new ApiError(409,'The signed-in account changed in another tab. Log out and sign in again; your local draft is retained.');
    }
    next();
  });
  const owner = (res: Response) => (res.locals.user as PublicUser).id;
  const projectId = (req: Request) => {
    const id = req.params.id;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new ApiError(404,'Project not found.');
    return id;
  };
  const documentBody = (body: unknown): AerialDocument => {
    try {
      const doc = deserializeDocument(JSON.stringify(body));
      if (!/^[a-zA-Z0-9_-]{1,200}$/.test(doc.id)) throw new Error('Invalid identifier');
      return doc;
    } catch { throw new ApiError(400,'Invalid or unsupported Aerial document.'); }
  };
  app.get('/api/projects',async (_req,res) => res.json({projects:await repository.listProjects(owner(res))}));
  app.get('/api/projects/:id',async (req,res) => {
    const document = await repository.getProject(owner(res),projectId(req));
    if (!document) throw new ApiError(404,'Project not found.'); res.json(document);
  });
  app.post('/api/projects',async (req,res) => {
    const now = new Date().toISOString(); const doc = {...documentBody(req.body),createdAt:now,updatedAt:now};
    if (!await repository.createProject(owner(res),doc)) throw new ApiError(409,'Project could not be created with this ID. Import a copy with a new ID.');
    res.status(201).json(doc);
  });
  app.put('/api/projects/:id',async (req,res) => {
    const id = projectId(req); const doc = documentBody(req.body);
    if (doc.id !== id) throw new ApiError(400,'Document ID must match the project ID.');
    const current = await repository.getProject(owner(res),id);
    if (!current) throw new ApiError(404,'Project not found.');
    const saved = {...doc,createdAt:current.createdAt,updatedAt:new Date().toISOString()};
    if (!await repository.updateProject(owner(res),saved)) throw new ApiError(404,'Project not found.');
    res.json(saved);
  });
  app.delete('/api/projects/:id',async (req,res) => {
    if (!await repository.deleteProject(owner(res),projectId(req))) throw new ApiError(404,'Project not found.');
    res.sendStatus(204);
  });
  app.use((_req,res) => res.status(404).json({error:'Not found.'}));
  app.use((error: unknown,_req: Request,res: Response,_next: NextFunction) => {
    if (error instanceof ApiError) { res.status(error.status).json({error:error.message}); return; }
    if (error instanceof SyntaxError) { res.status(400).json({error:'Invalid JSON body.'}); return; }
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
      res.status(413).json({error:'Document exceeds the request size limit.'}); return;
    }
    // Do not echo SQL, credentials, request bodies, or internal exception messages.
    console.error('API operation failed. Check database availability and configuration.');
    res.status(500).json({error:'The request could not be completed. Please try again.'});
  });
  return app;
}
