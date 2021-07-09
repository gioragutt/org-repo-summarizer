const {RepoQueries} = require('./queries');

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

/**
 * @param {RepoQueries} queries
 */
async function getPackageSummary(queries) {
  const packageJsonPaths = await queries.findFilesWithName('package.json');

  const packageJsonFiles = await Promise.all(
    packageJsonPaths.map(p => queries.downloadFile(p.path).then(r => r.json())),
  );
  const packages = packageJsonFiles.filter(p => p.version && p.name);

  return Object.fromEntries(
    await Promise.all(
      packages.map(async p => {
        return [
          p.name,
          {
            version: p.version,
            status: await packageStatus(p.name),
            url: `https://www.npmjs.com/package/${p.name}`,
          },
        ];
      }),
    ),
  );
}

/**
 * @param {string} owner owner/organization
 * @param {string} repo repository name
 */
async function summarizeRepo(owner, repo) {
  const queries = new RepoQueries(owner, repo);

  const [contributors, packageSummary, lastCommit, lastPR, lastIssue] = await Promise.all([
    queries.contributors(),
    getPackageSummary(queries),
    queries.lastCommitExcludingBots(),
    queries.lastPullRequestExcludingBots(),
    queries.lastIssueExcludingBots(),
  ]);

  const lastInteractions = {
    commit: lastCommit && {
      date: lastCommit.commit.committer.date,
      author: lastCommit.commit.author.name,
      url: lastCommit.html_url,
    },
    pr: lastPR && {
      date: lastPR.updated_at,
      author: lastPR.user.login,
      url: lastPR.html_url,
    },
    issue: lastIssue && {
      date: lastIssue.updated_at,
      author: lastIssue.user.login,
      url: lastIssue.html_url,
    },
  };

  return {
    contributors,
    packageSummary,
    lastCommit,
    lastPR,
    lastIssue,
    lastInteractions,
  };
}

module.exports = {
  summarizeRepo,
};
