const fs = require('fs-extra');
const execa = require('execa');
const Scripts = require('../../test/scripts');

module.exports = async ({
  templateDirectory,
  testDirectory,
  rootDirectory,
}) => {
  console.log();
  console.log(`Testing ${templateDirectory}`);
  console.log();

  const options = {
    stdio: 'inherit',
    env: { ...process.env, TEST_DIRECTORY: testDirectory },
    cwd: templateDirectory,
  };

  const scripts = new Scripts(testDirectory);

  try {
    console.log(`  > Building project for production`);
    console.log();

    await scripts.build({
      // enable CI env vars
      BUILD_NUMBER: 1,
      TEAMCITY_VERSION: 1,
      ARTIFACT_VERSION: '1.0.0-SNAPSHOT',
    });

    console.log();
    console.log(`  > Running app's own tests`);
    console.log();

    await scripts.test();

    console.log();
    console.log(`  > Running production integration tests`);
    console.log();

    const serveResult = await scripts.serve();

    execa.shellSync(
      `npx jest --config='jest.production.config.js' --no-cache --runInBand`,
      options,
    );

    console.log();

    await serveResult.done();

    console.log(`  > Starting project for development`);
    console.log();

    const startResult = await scripts.start({
      // disable CI env vars
      BUILD_NUMBER: '',
      TEAMCITY_VERSION: '',
      ARTIFACT_VERSION: '',
    });

    console.log(`  > Running development integration tests`);
    console.log();

    execa.shellSync(
      `npx jest --config='jest.development.config.js' --no-cache --runInBand`,
      options,
    );

    console.log();

    await startResult.done();
  } finally {
    // If any fails, or when all are done, clean this project
    fs.removeSync(rootDirectory);
  }
};
