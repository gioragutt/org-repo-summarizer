const dotenv = require('dotenv');
const {Octokit} = require('octokit');

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

module.exports = {
  octokit,
};
