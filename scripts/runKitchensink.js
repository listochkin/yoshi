const chalk = require('chalk');
const globby = require('globby');
const { publishMonorepo } = require('./utils/publishMonorepo');
const setupProject = require('./utils/setupProject');
const testProject = require('./utils/testProject');

const isCI = !!process.env.TEAMCITY_VERSION;

const filterProject = process.env.FILTER_PROJECT;

const filterConfig = process.env.FILTER_CONFIG;

// Publish the entire monorepo and install everything from CI to get
// the maximum reliability
//
// Locally with symlink modules for faster feedback
const cleanup = isCI ? publishMonorepo() : () => {};

// Find all projects to run tests on
let projects = globby.sync('test/projects/*', {
  onlyDirectories: true,
  absolute: true,
});

if (filterProject) {
  projects = projects.filter(templateDirectory => {
    return templateDirectory.includes(filterProject);
  });
}

const done = projects.reduce(async (promise, templateDirectory) => {
  const failures = await promise;

  const { testDirectory, rootDirectory } = setupProject(templateDirectory);

  try {
    await testProject({ testDirectory, templateDirectory, rootDirectory });
  } catch (error) {
    return [...failures, templateDirectory];
  }

  return failures;
}, Promise.resolve([]));

done
  .then(failures => {
    if (failures.length > 0) {
      console.log();
      console.log(chalk.red('Test failed!'));
      console.log();
      console.log('Check the following failed test runs:');
      console.log();

      failures.forEach(configPath => {
        console.log(`  - ${configPath}`);
      });

      console.log();

      process.exitCode = 1;
    }
  })
  .finally(() => {
    // Eventually, after all projects have finished, stop the local registry
    cleanup();
  })
  .catch(error => {
    console.log(error.stack);
    process.exit(1);
  });
