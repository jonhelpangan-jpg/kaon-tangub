/**
 * Sign-in: verifies Google ID tokens and issues our own session tokens.
 *
 * Env:
 *   GOOGLE_CLIENT_ID  – OAuth "Web application" client ID from Google Cloud Console
 *   SESSION_SECRET    – long random string used to sign session tokens
 *   ADMIN_EMAILS      – comma-separated Google emails that may approve riders
 *   ALLOW_TEST_LOGIN  – "1" enables a password-less test login. NEVER set this on the live site.
 */
const crypto = require('node:crypto');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CERTS_URL = process.env.GOOGLE_CERTS_URL || 'https://www.googleapis.com/oauth2/v3/certs';
const ALLOW_TEST_LOGIN = process.env.ALLOW_TEST_LOGIN === '1';
const SESSION_DAYS = 30;

let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set: everyone is signed out whenever the server restarts.');
}

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
const isAdminEmail = (email) => adminEmails.has(String(email).toLowerCase());

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const fromB64url = (s) => Buffer.from(s, 'base64url');

// ---------- our session tokens ----------
function sign(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function createSession(userId) {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id, or null if the token is missing, forged or expired. */
function readSession(token) {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(fromB64url(payload).toString());
    return typeof uid === 'string' && exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

// ---------- Google ID tokens ----------
let certs = { keys: [], fetchedAt: 0 };

async function googleKey(kid) {
  const stale = Date.now() - certs.fetchedAt > 60 * 60 * 1000;
  if (stale || !certs.keys.some((k) => k.kid === kid)) {
    const res = await fetch(GOOGLE_CERTS_URL);
    if (!res.ok) throw new Error('Could not load Google sign-in keys');
    certs = { keys: (await res.json()).keys || [], fetchedAt: Date.now() };
  }
  return certs.keys.find((k) => k.kid === kid);
}

/** Checks a Google ID token and returns { sub, email, name, picture }. Throws if it is not valid. */
async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not set up on the server yet');
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('Invalid sign-in token');
  let header, claims;
  try {
    header = JSON.parse(fromB64url(parts[0]).toString());
    claims = JSON.parse(fromB64url(parts[1]).toString());
  } catch {
    throw new Error('Invalid sign-in token');
  }
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Invalid sign-in token');
  const jwk = await googleKey(header.kid);
  if (!jwk) throw new Error('Invalid sign-in token');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, fromB64url(parts[2]));
  if (!ok) throw new Error('Invalid sign-in token');
  if (claims.aud !== GOOGLE_CLIENT_ID) throw new Error('Sign-in token was issued for a different app');
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') {
    throw new Error('Invalid sign-in token');
  }
  if (!(claims.exp * 1000 > Date.now())) throw new Error('Sign-in token has expired, please try again');
  if (!claims.sub || !claims.email || claims.email_verified === false) throw new Error('Google account has no verified email');
  return { sub: claims.sub, email: claims.email, name: claims.name || claims.email.split('@')[0], picture: claims.picture || null };
}

module.exports = {
  GOOGLE_CLIENT_ID,
  ALLOW_TEST_LOGIN,
  createSession,
  readSession,
  verifyGoogleToken,
  isAdminEmail,
};
