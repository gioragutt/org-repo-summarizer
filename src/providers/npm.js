const fetch = require('node-fetch').default;

async function packageStatus(packageName) {
  const response = await fetch(`https://www.npmjs.com/package/${packageName}`);
  if (response.status !== 200) {
    return 'not-found';
  }
  if (response.url.startsWith('https://www.npmjs.com/login')) {
    return 'private-scope';
  }
  return 'found';
}

async function downloadCount(packageName) {
  const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${packageName}`);
  const json = await res.json();
  return json.downloads ?? null;
}

module.exports = {
  packageStatus,
  downloadCount,
};
