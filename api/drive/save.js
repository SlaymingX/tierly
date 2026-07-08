const { getAccessToken } = require('../_lib/session');
const { driveFindFile, driveUploadFile } = require('../_lib/google');

const FILE_NAME = 'tierlist-data.json';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(req);
  } catch {
    accessToken = null;
  }
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const existing = await driveFindFile(accessToken, FILE_NAME);
    const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const result = await driveUploadFile(accessToken, {
      fileId: existing && existing.id,
      name: FILE_NAME,
      content,
    });
    res.status(200).json({ saved: true, fileId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
