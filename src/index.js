const dotenv = require('dotenv');
const {Listr} = require('listr2');
const {repositoriesForOrg} = require('./queries');
const {summarizeRepo} = require('./summarize_repo');

dotenv.config();

const org = process.env.ORG;

async function main() {
  // const repos = await repositoriesForOrg(org);
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
                  ctx.summaries[repo.name] = summary;
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
