const {RepoQueries} = require('./queries');
const {downloadCount, packageStatus} = require('../providers/npm');

/**
 * @param {RepoQueries} queries
 * @return {Promise<Record<string, {
 *  name: string;
 *  version: string;
 *  url: string;
 *  status: 'not-found' | 'private-scope' | 'found';
 *  downloadCount: number | null;
 * }>}
 */
async function getPackageSummary(queries) {
  const packageJsonPaths = await queries.findFilesWithName('package.json');

  const packageJsonFiles = await Promise.all(
    packageJsonPaths.map(p => queries.downloadFile(p.path).then(content => JSON.parse(content))),
  );
  const packages = packageJsonFiles.filter(p => p.version && p.name);

  return Object.fromEntries(
    await Promise.all(
      packages.map(async ({name, version}) => {
        const status = await packageStatus(name);

        return [
          name,
          {
            name,
            version,
            status,
            downloadCount: status === 'found' ? await downloadCount(name) : null,
            url: `https://www.npmjs.com/package/${name}`,
          },
        ];
      }),
    ),
  );
}

/**
 * @param {string} owner owner/organization
 * @param {import('./queries').RepoData} repo repository
 */
async function summarizeRepo(owner, repo) {
  const queries = new RepoQueries(owner, repo.name);

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
    owner,
    repo: repo.name,
    isFork: repo.fork,
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
