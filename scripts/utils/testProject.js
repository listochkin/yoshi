const path = require('path');
const fs = require('fs-extra');
const execa = require('execa');
const chalk = require('chalk');
const Scripts = require('../../test/scripts');

const ciEnv = {
  BUILD_NUMBER: 1,
  TEAMCITY_VERSION: 1,
  ARTIFACT_VERSION: '1.0.0-SNAPSHOT',
};

module.exports = async ({
  templateDirectory,
  testDirectory,
  rootDirectory,
}) => {
  console.log();
  console.log(
    chalk.cyan.bold.underline(`> Testing ${path.basename(templateDirectory)}`),
  );
  console.log();

  const options = {
    stdio: 'inherit',
    env: { ...process.env, TEST_DIRECTORY: testDirectory },
    cwd: templateDirectory,
  };

  const scripts = new Scripts(testDirectory);

  try {
    console.log(chalk.cyan(`> Building project for production`));
    console.log();

    await scripts.build(ciEnv);

    console.log();
    console.log(chalk.cyan(`> Running app's own tests for production`));
    console.log();

    await scripts.test(ciEnv);

    console.log();
    console.log(chalk.cyan(`> Running production integration tests`));
    console.log();

    const serveResult = await scripts.serve();

    await execa.shell(
      `npx jest --config='jest.production.config.js' --no-cache --runInBand`,
      options,
    );

    console.log();

    await serveResult.done();

    console.log(chalk.cyan(`> Starting project for development`));
    console.log();

    const startResult = await scripts.start({
      // disable CI env vars
      BUILD_NUMBER: '',
      TEAMCITY_VERSION: '',
      ARTIFACT_VERSION: '',
    });

    console.log();
    console.log(chalk.cyan(`> Running app's own tests for development`));
    console.log();

    await scripts.test();

    console.log();
    console.log(chalk.cyan(`> Running development integration tests`));
    console.log();

    await execa.shell(
      `npx jest --config='jest.development.config.js' --no-cache --runInBand`,
      options,
    );

    console.log();

    await startResult.done();
  } finally {
    // If any fails, or when all are done, clean this project
    await fs.remove(rootDirectory);
  }
};
