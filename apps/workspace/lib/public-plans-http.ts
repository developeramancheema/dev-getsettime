import { NextResponse } from 'next/server';

/** Strip trailing slashes so `https://a.com/` matches browser `Origin: https://a.com` */
export function normalizePublicPlansOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function expandDevOriginAliases(origins: string[]): string[] {
  if (process.env.NODE_ENV !== 'development') return origins;
  const extra = new Set<string>();
  for (const o of origins) {
    try {
      const u = new URL(o);
      const port = u.port ? `:${u.port}` : '';
      if (u.hostname === 'localhost') {
        extra.add(`${u.protocol}//127.0.0.1${port}`);
      } else if (u.hostname === '127.0.0.1') {
        extra.add(`${u.protocol}//localhost${port}`);
      }
    } catch {
      /* ignore */
    }
  }
  return [...origins, ...extra];
}

export function getPublicPlansAllowedOrigins(): string[] {
  const raw = (process.env.PUBLIC_PLANS_ALLOWED_ORIGINS || '').trim();
  if (!raw) return [];
  const parsed = raw
    .split(',')
    .map((o) => normalizePublicPlansOrigin(o))
    .filter(Boolean);
  return expandDevOriginAliases(parsed);
}

function originFromRequestUrl(req: Request): string | null {
  try {
    return normalizePublicPlansOrigin(new URL(req.url).origin);
  } catch {
    return null;
  }
}

function originFromHostHeader(req: Request): string | null {
  const host = req.headers.get('host')?.trim();
  if (!host) return null;
  const forwarded = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto =
    forwarded ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  try {
    return normalizePublicPlansOrigin(`${proto}://${host}`);
  } catch {
    return null;
  }
}

function allowRequestHostAsOrigin(): boolean {
  if (process.env.PUBLIC_PLANS_ALLOW_REQUEST_HOST === 'true') return true;
  return process.env.NODE_ENV === 'development';
}

export function resolveRequestOrigin(req: Request): string | null {
  const originHeader = req.headers.get('origin')?.trim();
  if (originHeader && originHeader !== 'null') {
    return normalizePublicPlansOrigin(originHeader);
  }

  const referer = req.headers.get('referer')?.trim();
  if (referer) {
    try {
      return normalizePublicPlansOrigin(new URL(referer).origin);
    } catch {
      /* ignore */
    }
  }

  if (allowRequestHostAsOrigin()) {
    return originFromRequestUrl(req) ?? originFromHostHeader(req);
  }

  return null;
}

export function isOriginAllowedForPublicPlans(origin: string | null): boolean {
  if (!origin) return false;
  const normalized = normalizePublicPlansOrigin(origin);
  const allowed = getPublicPlansAllowedOrigins();
  return allowed.includes(normalized);
}

export type public_plans_forbidden_reason =
  | 'env_not_configured'
  | 'missing_origin'
  | 'origin_not_allowed';

export function getPublicPlansForbiddenReason(req: Request): public_plans_forbidden_reason {
  const allowed = getPublicPlansAllowedOrigins();
  if (allowed.length === 0) return 'env_not_configured';

  const resolved = resolveRequestOrigin(req);
  if (!resolved) return 'missing_origin';

  if (!isOriginAllowedForPublicPlans(resolved)) return 'origin_not_allowed';

  return 'origin_not_allowed';
}

export function withPublicPlansCors(req: Request, response: NextResponse): NextResponse {
  const origin = resolveRequestOrigin(req);
  if (origin && isOriginAllowedForPublicPlans(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return response;
}

export function jsonWithPublicPlansCors(
  req: Request,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return withPublicPlansCors(req, NextResponse.json(body, init));
}