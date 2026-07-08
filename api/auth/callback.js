const cookie = require('cookie');
const { exchangeCodeForTokens, decodeIdToken } = require('../_lib/google');
const { buildAuthCookies, OAUTH_COOKIE, baseOpts } = require('../_lib/session');

module.exports = async function handler(req, res) {
  const { code, state, error } = req.query;
  const appUrl = process.env.APP_URL || '/';

  if (error) {
    res.writeHead(302, { Location: `${appUrl}?auth_error=${encodeURIComponent(String(error))}` });
    return res.end();
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  let stored = {};
  try {
    stored = JSON.parse(cookies[OAUTH_COOKIE] || '{}');
  } catch {
    stored = {};
  }

  if (!code || !stored.state || stored.state !== state) {
    res.writeHead(302, { Location: `${appUrl}?auth_error=state_mismatch` });
    return res.end();
  }

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: stored.verifier,
      redirectUri,
    });

    if (!tokens.refresh_token) {
      // Shouldn't happen since login.js always sends prompt=consent, but handle gracefully
      res.writeHead(302, { Location: `${appUrl}?auth_error=no_refresh_token` });
      return res.end();
    }

    const idInfo = tokens.id_token ? decodeIdToken(tokens.id_token) : {};
    const profile = { name: idInfo.name, email: idInfo.email, picture: idInfo.picture };

    const authCookies = buildAuthCookies({ refreshToken: tokens.refresh_token, profile });
    const clearOauthCookie = cookie.serialize(OAUTH_COOKIE, '', { ...baseOpts, maxAge: 0 });

    res.setHeader('Set-Cookie', [...authCookies, clearOauthCookie]);
    res.writeHead(302, { Location: appUrl });
    res.end();
  } catch (err) {
    res.writeHead(302, { Location: `${appUrl}?auth_error=${encodeURIComponent(err.message)}` });
    res.end();
  }
};
