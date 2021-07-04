import {octokit} from './octokit';

const solutoRepos = await octokit.rest.repos.listForOrg({
  org: 'Soluto',
});

console.log(solutoRepos.data.length);
