const { getAccessToken } = require('../_lib/session');
const { driveFindFile, driveDownloadFile } = require('../_lib/google');

const FILE_NAME = 'tierlist-data.json';

module.exports = async function handler(req, res) {
  let accessToken;
  try {
    accessToken = await getAccessToken(req);
  } catch {
    accessToken = null;
  }
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const existing = await driveFindFile(accessToken, FILE_NAME);
    if (!existing) return res.status(200).json({ found: false });

    const content = await driveDownloadFile(accessToken, existing.id);
    res.status(200).json({
      found: true,
      data: JSON.parse(content),
      modifiedTime: existing.modifiedTime,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
