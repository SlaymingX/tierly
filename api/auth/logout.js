const { getRawRefreshToken, buildClearCookies } = require('../_lib/session');
const { revokeToken } = require('../_lib/google');

module.exports = async function handler(req, res) {
  const refreshToken = getRawRefreshToken(req);
  if (refreshToken) {
    await revokeToken(refreshToken);
  }
  res.setHeader('Set-Cookie', buildClearCookies());
  res.status(200).json({ loggedOut: true });
};
