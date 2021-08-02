const {octokit} = require('../providers/octokit');
const {getCachedOrCalculate} = require('../providers/redis');
const fetch = require('node-fetch').default;
const {toArray} = require('ix/asynciterable');
const {differenceInYears} = require('date-fns');

/**
 * @param {string} name
 */
function isBot(name) {
  return name?.endsWith('bot') || name?.endsWith('[bot]');
}

function isBotInPR(pull) {
  return isBot(pull?.user?.login) || !!pull?.title?.toLowerCase().includes('snyk');
}

/**
 * @param {string} owner
 * @param {string} repo
 */
async function contributorsInRepo(owner, repo) {
  return getCachedOrCalculate(`contributors/${owner}/${repo}`, async () => {
    const iterator = octokit.paginate.iterator(octokit.rest.repos.listContributors, {repo, owner});
    const responses = await toArray(iterator);
    return responses.flatMap(r => r.data).filter(c => !isBot(c.login));
  });
}

/**
 * @param {string} owner
 * @param {string} repo
 * @param {string} fileName
 */
async function findFilesWithName(owner, repo, fileName) {
  return getCachedOrCalculate(`find_files/${owner}/${repo}/${fileName}`, async () => {
    const iterator = octokit.paginate.iterator(octokit.rest.search.code, {
      q: `repo:${owner}/${repo}+filename:${fileName}`,
    });

    const responses = await toArray(iterator);
    return responses.flatMap(r => r.data);
  });
}

/**
 * @param {string} owner
 * @param {string} repo
 * @param {string} path
 */
async function downloadFile(owner, repo, path) {
  return getCachedOrCalculate(`file_content/${owner}/${repo}/${path}`, async () => {
    const {data} = await octokit.rest.repos.getContent({owner, repo, path});
    return fetch(data.download_url).then(r => r.text());
  });
}

/**
 * @param {string} owner
 * @param {string} repo
 */
async function lastCommitExcludingBots(owner, repo) {
  return getCachedOrCalculate(`last_commit_excluding_bots/${owner}/${repo}`, async () => {
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
    return null;
  });
}

/**
 * @typedef {ReturnType<typeof repositoriesForOrg> extends Promise<(infer T)[]> ? T : never} RepoData
 * @param {string} org
 */
async function repositoriesForOrg(org) {
  return getCachedOrCalculate(`repositories_for_org/${org}`, async () => {
    const iterator = octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
      org,
      per_page: 100,
    });

    const responses = await toArray(iterator);
    return responses.flatMap(r => r.data);
  });
}

async function lastPullRequestExcludingBots(owner, repo) {
  return getCachedOrCalculate(`last_pull_request_excluding_bots/${owner}/${repo}`, async () => {
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
      owner,
      repo,
      per_page: 10,
      direction: 'desc',
      state: 'all',
    });

    for await (const {data: pulls} of iterator) {
      for (const pull of pulls) {
        if (!isBotInPR(pull)) {
          return pull;
        }
      }
    }
    return null;
  });
}

async function lastIssueExcludingBots(owner, repo) {
  return getCachedOrCalculate(`last_issue_excluding_bots/${owner}/${repo}`, async () => {
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
    return null;
  });
}

async function issuesInPastYear(owner, repo) {
  return getCachedOrCalculate(`issues_in_past_year/${owner}/${repo}`, async () => {
    const iterator = octokit.paginate.iterator(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      per_page: 30,
      direction: 'desc',
      state: 'all',
    });

    let counter = 0;
    for await (const {data: issues} of iterator) {
      for (const issue of issues) {
        if (
          !isBot(issue.user.login) &&
          !issue.pull_request &&
          differenceInYears(new Date(), new Date(issue.updated_at)) < 1
        ) {
          counter++;
        }
      }
    }
    return counter;
  });
}

async function prsInPastYear(owner, repo) {
  return getCachedOrCalculate(`prs_in_past_year/${owner}/${repo}`, async () => {
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
      owner,
      repo,
      per_page: 30,
      direction: 'desc',
      state: 'all',
    });

    let counter = 0;
    for await (const {data: pulls} of iterator) {
      for (const pr of pulls) {
        if (!isBotInPR(pr) && differenceInYears(new Date(), new Date(pr.updated_at)) < 1) {
          counter++;
        }
      }
    }
    return counter;
  });
}

class RepoQueries {
  /**
   * @param {string} owner
   * @param {string} repo
   */
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

  async issuesInPastYear() {
    return await issuesInPastYear(this.owner, this.repo);
  }

  async prsInPastYear() {
    return await prsInPastYear(this.owner, this.repo);
  }
}

module.exports = {
  contributorsInRepo,
  findFilesWithName,
  downloadFile,
  lastCommitExcludingBots,
  lastPullRequestExcludingBots,
  lastIssueExcludingBots,
  repositoriesForOrg,
  issuesInPastYear,
  prsInPastYear,
  RepoQueries,
};
