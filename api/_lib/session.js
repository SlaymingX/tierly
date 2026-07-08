const cookie = require('cookie');
const { encrypt, decrypt } = require('./crypto');
const { refreshAccessToken } = require('./google');

const REFRESH_COOKIE = 'g_refresh';
const PROFILE_COOKIE = 'g_profile';
const OAUTH_COOKIE = 'g_oauth';
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days — this is what keeps the user "logged in forever"

const baseOpts = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

// Cookies to set right after a successful login
function buildAuthCookies({ refreshToken, profile }) {
  return [
    cookie.serialize(REFRESH_COOKIE, encrypt(refreshToken), { ...baseOpts, maxAge: MAX_AGE }),
    cookie.serialize(
      PROFILE_COOKIE,
      Buffer.from(JSON.stringify(profile)).toString('base64url'),
      { ...baseOpts, maxAge: MAX_AGE }
    ),
  ];
}

// Cookies to clear on logout
function buildClearCookies() {
  return [
    cookie.serialize(REFRESH_COOKIE, '', { ...baseOpts, maxAge: 0 }),
    cookie.serialize(PROFILE_COOKIE, '', { ...baseOpts, maxAge: 0 }),
    cookie.serialize(OAUTH_COOKIE, '', { ...baseOpts, maxAge: 0 }),
  ];
}

function getProfile(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const raw = cookies[PROFILE_COOKIE];
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function getRawRefreshToken(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const enc = cookies[REFRESH_COOKIE];
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
}

// Exchanges the stored (encrypted) refresh token for a fresh short-lived access token.
// Called on every API request that needs Drive/Google access — nothing is ever
// stored long-term except the encrypted refresh token itself.
async function getAccessToken(req) {
  const refreshToken = getRawRefreshToken(req);
  if (!refreshToken) return null;
  const tokenData = await refreshAccessToken(refreshToken);
  return tokenData.access_token;
}

module.exports = {
  buildAuthCookies,
  buildClearCookies,
  getProfile,
  getRawRefreshToken,
  getAccessToken,
  REFRESH_COOKIE,
  PROFILE_COOKIE,
  OAUTH_COOKIE,
  baseOpts,
};
