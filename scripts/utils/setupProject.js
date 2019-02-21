const path = require('path');
const fs = require('fs-extra');
const tempy = require('tempy');
const execa = require('execa');
const { authenticateToRegistry } = require('./publishMonorepo');

const isCI = !!process.env.TEAMCITY_VERSION;

module.exports = templateDirectory => {
  const rootDirectory = tempy.directory();

  const testDirectory = path.join(rootDirectory, 'project');

  fs.copySync(templateDirectory, testDirectory);

  // Symlink modules locally for faster feedback
  if (!isCI) {
    fs.ensureSymlinkSync(
      path.join(__dirname, '../../packages/yoshi/node_modules'),
      path.join(rootDirectory, 'node_modules'),
    );

    fs.ensureSymlinkSync(
      path.join(__dirname, '../../packages/yoshi/bin/yoshi.js'),
      path.join(rootDirectory, 'node_modules/.bin/yoshi'),
    );

    fs.ensureSymlinkSync(
      path.join(__dirname, '../../packages/yoshi'),
      path.join(testDirectory, 'node_modules/yoshi'),
    );
  } else {
    // Authenticate and install from our fake registry on CI
    authenticateToRegistry(testDirectory);

    execa.shellSync('npm install', {
      cwd: testDirectory,
      stdio: 'inherit',
      extendEnv: false,
      env: {
        PATH: process.env.PATH,
      },
    });
  }

  // Copy mocked `node_modules`
  fs.copySync(
    path.join(templateDirectory, '__node_modules__'),
    path.join(testDirectory, 'node_modules'),
  );

  return {
    testDirectory,
    rootDirectory,
  };
};
