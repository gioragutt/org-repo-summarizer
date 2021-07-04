import {writeFile} from 'fs/promises';
import path from 'path';
import {octokit} from './octokit.js';

const iterator = octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
  org: 'Soluto',
  per_page: 100,
});

let index = 0;
for await (const {data: repos} of iterator) {
  for (const repo of repos) {
    writeFile(path.join('..', 'data', 'repos', `${repo.name}.json`), JSON.stringify(repo, null, 2));
    console.log(`Saved repo #${(index++).toString().padStart(3, '0')} - ${repo.name}`);
  }
}
