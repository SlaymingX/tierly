const { getProfile, getAccessToken } = require('../_lib/session');

module.exports = async function handler(req, res) {
  const profile = getProfile(req);
  if (!profile) {
    return res.status(200).json({ loggedIn: false });
  }

  try {
    // Confirms the stored refresh token is still valid (not revoked/expired)
    const accessToken = await getAccessToken(req);
    if (!accessToken) return res.status(200).json({ loggedIn: false });
    res.status(200).json({ loggedIn: true, profile });
  } catch {
    res.status(200).json({ loggedIn: false });
  }
};
