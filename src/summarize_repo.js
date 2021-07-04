const {RepoQueries} = require('./queries');

const fetch = require('node-fetch');

const q = new RepoQueries('Soluto', 'kamus');

async function packageExists(packageName) {
  const response = await fetch(`https://www.npmjs.com/package/${packageName}`);
  return response.status === 200;
}

async function getPackageSummary() {
  const packageJsonPaths = await q.findFilesWithName('package.json');

  const packageJsonFiles = await Promise.all(packageJsonPaths.map(p => q.downloadFile(p.path).then(r => r.json())));
  const packages = packageJsonFiles.filter(p => p.version && p.name);

  return Object.fromEntries(
    await Promise.all(
      packages.map(async p => [
        p.name,
        {
          version: p.version,
          packageExists: await packageExists(p.name),
        },
      ]),
    ),
  );
}

async function main() {
  const contributors = await q.contributors();
  const packageSummary = await getPackageSummary();
  console.log({contributors, packageSummary});
}

main().catch(console.error);
