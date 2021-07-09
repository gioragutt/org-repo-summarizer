const dotenv = require('dotenv');
const {Listr} = require('listr2');
const {repositoriesForOrg} = require('./lib/queries');
const {summarizeRepo} = require('./lib/summarize_repo');
const {join} = require('path');
const {writeFile, mkdir} = require('fs/promises');

dotenv.config();

const org = process.env.ORG;
const summariesPath = join(__dirname, `data/summaries/${org}`);

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
        task(ctx, task) {
          /** @type {ReturnType<typeof repositoriesForOrg> extends Promise<infer T> ? T : never} */
          const repos = ctx.repos;

          return task.newListr(
            repos.map(repo => {
              return {
                title: repo.name,
                async task() {
                  const summary = await summarizeRepo(org, repo.name);
                  await writeFile(join(summariesPath, `${repo.name}.json`), JSON.stringify(summary));
                },
              };
            }),
            {concurrent: true, rendererOptions: {collapse: true}},
          );
        },
      },
    ],
    {
      rendererOptions: {showTimer: true, showSubtasks: false},
    },
  );

  const ctx = await tasks.run({summaries: {}});
  console.log(Object.keys(ctx.summaries));
}

main().catch(console.error);
