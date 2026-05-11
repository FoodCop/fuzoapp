const AUTH_CALLBACK_PATH = '/auth/callback';

export const APP_PATH = '/app';
export const HOME_ENTRY_URL = '/?view=home';

// Domain constants
export const LANDING_DOMAIN = 'fuzo.app';
export const CORE_APP_SUBDOMAIN = 'app.fuzo.app';

/**
 * Detects if the current environment is strictly the Landing Page (fuzo.app).
 * Supports local testing via ?mode=landing
 */
export const isLandingDomain = () => {
  const { hostname, search } = globalThis.location;
  
  // Local testing override
  const mode = new URLSearchParams(search).get('mode');
  if (mode === 'landing') return true;
  if (mode === 'app') return false;

  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (isLocal) return true; // Default to landing for local if no mode

  // Production check: If it's the landing domain or its www variant
  const isLanding = hostname === LANDING_DOMAIN || hostname === `www.${LANDING_DOMAIN}`;
  if (isLanding) return true;

  // If it's NOT the core app subdomain, we treat it as landing (covers preview URLs)
  return hostname !== CORE_APP_SUBDOMAIN;
};

/**
 * Detects if the current environment is the Core App (app.fuzo.app).
 * Supports local testing via ?mode=app
 */
export const isCoreAppDomain = () => {
  const { hostname, search } = globalThis.location;

  // Local testing override
  const mode = new URLSearchParams(search).get('mode');
  if (mode === 'app') return true;
  if (mode === 'landing') return false;

  // Production check
  return hostname === CORE_APP_SUBDOMAIN;
};

const isDebugFlagTrue = (value: string | undefined) => value === '1' || value === 'true';

export const isAuthDebugEnabled = () => {
  const envEnabled = isDebugFlagTrue(import.meta.env.VITE_DEBUG_AUTH_FLOW);
  if (envEnabled) return true;

  const search = globalThis.location?.search ?? '';
  const debugInQuery = new URLSearchParams(search).get('debugAuth');
  if (isDebugFlagTrue(debugInQuery ?? undefined)) return true;

  try {
    const localValue = globalThis.localStorage?.getItem('fuzo:debug:auth-flow') ?? undefined;
    return isDebugFlagTrue(localValue);
  } catch {
    return false;
  }
};

export const authDebugLog = (event: string, details?: Record<string, unknown>) => {
  if (!isAuthDebugEnabled()) return;
  const timestamp = new Date().toISOString();
  console.log('[FUZO:AUTH_DEBUG]', timestamp, event, details ?? {});
};

export const isAppPath = (pathname: string) => pathname === APP_PATH || pathname.startsWith(`${APP_PATH}/`);

export const isAuthCallbackPath = (pathname: string) => (
  pathname === AUTH_CALLBACK_PATH || pathname.startsWith(`${AUTH_CALLBACK_PATH}/`)
);

const normalizeAppUrl = (value: string | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  const unquoted = (trimmed.startsWith('"') || trimmed.startsWith("'")) ? trimmed.slice(1) : trimmed;
  const clean = (unquoted.endsWith('"') || unquoted.endsWith("'")) ? unquoted.slice(0, -1) : unquoted;
  try {
    const parsed = new URL(clean);
    return parsed.origin;
  } catch {
    return clean.replace(/\/+$/, '');
  }
};

export const getOAuthRedirectUrl = () => {
  const { origin, hostname } = globalThis.location;
  const isLocalDevHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

  // In production, we ALWAYS want auth to redirect to the app subdomain
  if (!isLocalDevHost) {
    const configuredAppUrl = normalizeAppUrl(import.meta.env.VITE_CORE_APP_URL)
      || normalizeAppUrl(import.meta.env.VITE_AUTH_REDIRECT_URL)
      || `https://${CORE_APP_SUBDOMAIN}`;
    
    return `${configuredAppUrl}${AUTH_CALLBACK_PATH}`;
  }

  // Local dev
  return `${origin}${AUTH_CALLBACK_PATH}`;
};

/**
 * Returns the correct URL for the Core Application, 
 * respecting local development mode overrides.
 */
export const getCoreAppUrl = () => {
  const { origin, hostname } = globalThis.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}?mode=app`;
  }
  return import.meta.env.VITE_CORE_APP_URL || `https://${CORE_APP_SUBDOMAIN}`;
};

/**
 * Returns the correct URL for the Landing Page, 
 * respecting local development mode overrides.
 */
export const getLandingUrl = () => {
  const { origin, hostname } = globalThis.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}?mode=landing`;
  }
  return `https://${LANDING_DOMAIN}`;
};
