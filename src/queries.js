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
}

module.exports = {
  contributorsInRepo,
  findFilesWithName,
  downloadFile,
  RepoQueries,
};
