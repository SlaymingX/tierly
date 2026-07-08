const crypto = require('crypto');
const cookie = require('cookie');
const { OAUTH_COOKIE, baseOpts } = require('../_lib/session');

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = async function handler(req, res) {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  res.setHeader(
    'Set-Cookie',
    cookie.serialize(OAUTH_COOKIE, JSON.stringify({ verifier, state }), {
      ...baseOpts,
      maxAge: 600, // 10 minutes — only needs to survive the redirect round trip
    })
  );

  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/drive.appdata',
    access_type: 'offline', // required to receive a refresh_token
    prompt: 'consent',      // forces Google to reissue a refresh_token every time
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  res.end();
};
