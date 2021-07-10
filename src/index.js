require('dotenv').config();

const {Listr} = require('listr2');
const {repositoriesForOrg} = require('./lib/queries');
const {summarizeRepo} = require('./lib/summarize_repo');
const {join} = require('path');
const {writeFile, mkdir} = require('fs/promises');

const org = process.env.ORG;
const summariesPath = join(__dirname, `../data/output/summaries/${org}`);

const summarizeRepoTask = repo => async () => {
  const summary = await summarizeRepo(org, repo.name);
  await writeFile(join(summariesPath, `${repo.name}.json`), JSON.stringify(summary, null, 2));
};

async function main() {
  await mkdir(summariesPath, {recursive: true});

  const tasks = new Listr(
    [
      {
        title: 'Fetch Repositories',
        async task(ctx) {
          const repos = await repositoriesForOrg(org);
          ctx.repos = repos;
        },
      },
      {
        title: 'Summarize Repositories',
        async task(ctx, task) {
          /** @type {ReturnType<typeof repositoriesForOrg> extends Promise<infer T> ? T : never} */
          const repos = ctx.repos;

          return task.newListr(
            repos.map(repo => {
              return {
                title: repo.name,
                task: summarizeRepoTask(repo),
              };
            }),
            {concurrent: true, rendererOptions: {collapse: true}},
          );
        },
      },
    ],
    {
      rendererOptions: {showTimer: true, showSubtasks: true},
    },
  );

  await tasks.run({});
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
