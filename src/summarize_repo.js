const {RepoQueries} = require('./queries');

const fetch = require('node-fetch');

const q = new RepoQueries('Soluto', 'tweek');

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
  const [contributors, packageSummary, lastCommit, lastPR, lastIssue] = await Promise.all([
    q.contributors(),
    getPackageSummary(),
    q.lastCommitExcludingBots(),
    q.lastPullRequestExcludingBots(),
    q.lastIssueExcludingBots(),
  ]);

  console.log({
    contributors: contributors.map(c => c.login),
    packageSummary,
    lastCommit: `[${lastCommit.commit.committer.date}] ${lastCommit.commit.author.name} - ${lastCommit.html_url}`,
    lastPR: `[${lastPR.updated_at}] ${lastPR.user.login} - ${lastPR.html_url}`,
    lastIssue: `[${lastIssue.updated_at}] ${lastIssue.user.login} - ${lastIssue.html_url}`,
  });
}

main().catch(console.error);
