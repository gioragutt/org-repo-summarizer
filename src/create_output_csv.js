require('dotenv').config();

const {finished: finishedCB} = require('stream');
const {promisify} = require('util');
const {Listr} = require('listr2');
const {join} = require('path');
const {mkdir, readFile, readdir} = require('fs/promises');
const csv = require('fast-csv');

const finished = promisify(finishedCB);

const org = process.env.ORG;
const summariesPath = join(__dirname, `../data/output/summaries/${org}`);

/**
 * @typedef {ReturnType<import('./lib/summarize_repo').summarizeRepo> extends Promise<infer T> ? T : never} RepoSummary
 * @typedef {(RepoSummary['packageSummary'][string][]} PackageSummary
 */

/**
 * @param {RepoSummary['packageSummary']} packageSummary
 * @return {Promise<Pick<PackageSummary, 'downloadCount' | 'name'> | null>}
 */
async function findMostUsedPackage(packageSummary) {
  /** @type {PackageSummary[]} */
  const usedPackages = Object.values(packageSummary).filter(({status}) => status === 'found');
  if (!usedPackages.length) {
    return null;
  }
  const {downloadCount: count, name} = usedPackages.sort(a => a.downloadCount)[0];
  return {downloadCount: count, name};
}

const toCSVLine = (fileName, ctx) => async () => {
  /** @type {RepoSummary} */
  const {repo, lastInteractions, packageSummary, contributors} = JSON.parse(
    await readFile(join(summariesPath, fileName)),
  );

  const mostUsedPackage = await findMostUsedPackage(packageSummary);

  const csvLine = {
    repo,
    contributor1: contributors[0]?.html_url,
    contributor2: contributors[1]?.html_url,
    contributor3: contributors[2]?.html_url,
    lastCommit: lastInteractions.commit?.date,
    lastPR: lastInteractions.pr?.date,
    lastIssue: lastInteractions.issue?.date,
    mostUsedPackageName: mostUsedPackage?.name,
    mostUsedPackageDownloadCount: mostUsedPackage?.downloadCount,
  };
  ctx.summaries[repo] = csvLine;
};

async function main() {
  await mkdir(summariesPath, {recursive: true});

  const tasks = new Listr(
    [
      {
        title: 'Fetch Summaries',
        async task(ctx) {
          const summaryFiles = await readdir(join(__dirname, '../data/output/summaries/Soluto'));
          ctx.summaryFiles = summaryFiles;
        },
      },
      {
        title: 'Process Summaries',
        async task(ctx, task) {
          return task.newListr(
            ctx.summaryFiles.map(fileName => {
              return {
                title: fileName,
                task: toCSVLine(fileName, ctx),
                retry: 5,
              };
            }),
            {concurrent: 10, rendererOptions: {collapse: true}},
          );
        },
      },
    ],
    {
      rendererOptions: {showTimer: true, showSubtasks: true},
    },
  );

  const ctx = await tasks.run({summaries: {}});

  console.log(Object.values(ctx.summaries));

  const writeStream = csv.writeToPath('./summaries.csv', Object.values(ctx.summaries), {
    writeHeaders: true,
    headers: [
      'repo',
      'contributor1',
      'contributor2',
      'contributor3',
      'lastCommit',
      'lastPR',
      'lastIssue',
      'mostUsedPackageName',
      'mostUsedPackageDownloadCount',
    ],
  });

  await finished(writeStream);
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
