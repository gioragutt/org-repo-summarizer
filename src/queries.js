const {octokit} = require('./octokit');
const fetch = require('node-fetch');
const {toArray} = require('ix/asynciterable');

async function contributorsInRepo(owner, repo) {
  const iterator = octokit.paginate.iterator(octokit.rest.repos.listContributors, {repo, owner});
  const responses = await toArray(iterator);
  return responses.flatMap(r => r.data);
}

async function findFilesWithName(owner, repo, fileName) {
  const iterator = octokit.paginate.iterator(octokit.rest.search.code, {
    q: `repo:${owner}/${repo}+filename:${fileName}`,
  });

  const responses = await toArray(iterator);
  return responses.flatMap(r => r.data);
}

async function downloadFile(owner, repo, path) {
  const {data} = await octokit.rest.repos.getContent({owner, repo, path});
  return await fetch(data.download_url);
}

/**
 * @param {string} name
 */
function isBot(name) {
  return name.endsWith('bot') || name.endsWith('[bot]');
}

async function lastCommitExcludingBots(owner, repo) {
  const iterator = octokit.paginate.iterator(octokit.rest.repos.listCommits, {
    owner,
    repo,
    per_page: 10,
  });

  for await (const {data: commits} of iterator) {
    for (const commit of commits) {
      if (!isBot(commit.commit.author.name)) {
        return commit;
      }
    }
  }
}

async function lastPullRequestExcludingBots(owner, repo) {
  const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
    owner,
    repo,
    per_page: 10,
    direction: 'desc',
    state: 'all',
  });

  for await (const {data: pulls} of iterator) {
    for (const pull of pulls) {
      if (!isBot(pull.user.login)) {
        return pull;
      }
    }
  }
}

async function lastIssueExcludingBots(owner, repo) {
  const iterator = octokit.paginate.iterator(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    per_page: 30,
    direction: 'desc',
    state: 'all',
  });

  for await (const {data: issues} of iterator) {
    for (const issue of issues) {
      if (!isBot(issue.user.login) && !issue.pull_request) {
        return issue;
      }
    }
  }
}

class RepoQueries {
  constructor(owner, repo) {
    this.owner = owner;
    this.repo = repo;
  }

  async contributors() {
    return await contributorsInRepo(this.owner, this.repo);
  }

  async findFilesWithName(filename) {
    return await findFilesWithName(this.owner, this.repo, filename);
  }

  async downloadFile(path) {
    return await downloadFile(this.owner, this.repo, path);
  }

  async lastCommitExcludingBots() {
    return await lastCommitExcludingBots(this.owner, this.repo);
  }

  async lastPullRequestExcludingBots() {
    return await lastPullRequestExcludingBots(this.owner, this.repo);
  }
  async lastIssueExcludingBots() {
    return await lastIssueExcludingBots(this.owner, this.repo);
  }
}

module.exports = {
  contributorsInRepo,
  findFilesWithName,
  downloadFile,
  lastCommitExcludingBots,
  lastPullRequestExcludingBots,
  lastIssueExcludingBots,
  RepoQueries,
};
