const {Octokit} = require('octokit');

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

module.exports = {
  octokit,
};
