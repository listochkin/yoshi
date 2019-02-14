const chalk = require('chalk');
const {
  clearConsole,
  install,
  lintFix,
  gitInit,
  isInsideGitRepo,
} = require('./utils');
const verifyWorkingDirectory = require('./verifyWorkingDirectory');
const runPrompt = require('./runPrompt');
const generateProject = require('./generateProject');
const verifyRegistry = require('./verifyRegistry');
const verifyMinimumNodeVersion = require('yoshi-helpers/verifyMinimumNodeVersion');
const { minimumNodeVersion } = require('./constants');
const execa = require('execa');

module.exports = async (workingDir, projectDirName) => {
  verifyWorkingDirectory(workingDir);
  verifyRegistry(workingDir);
  verifyMinimumNodeVersion(minimumNodeVersion);

  clearConsole();

  // Use ' ' due to a technical problem in hyper when you don't see the first char after clearing the console
  console.log(
    ' ' + chalk.underline('Please answer the following questions:\n'),
  );

  const results = await runPrompt(workingDir);

  console.log(
    `\nCreating a new ${chalk.cyan(
      results.projectType,
    )} project in ${chalk.green(workingDir)}\n`,
  );

  generateProject(results, workingDir);

  if (!isInsideGitRepo(workingDir)) {
    gitInit(workingDir);
  }

  const before = new Date();
  install(workingDir);
  const after = new Date();
  console.log(`it took ${after - before} ms to install`);
  console.log('the size of the node_modules dir is');
  execa.shellSync('du -sh node_modules', {
    cwd: workingDir,
    stdio: 'inherit',
  });
  lintFix(workingDir);

  console.log(
    `\nSuccess! 🙌  Created ${chalk.magenta(
      results.projectName,
    )} at ${chalk.green(workingDir)}`,
  );

  console.log('You can run the following commands:\n');
  console.log(chalk.cyan('  npm start'));
  console.log('    Start your app in development mode\n');
  console.log(chalk.cyan('  npm test'));
  console.log('    Run the test runner\n');
  console.log(chalk.cyan('  npx yoshi lint'));
  console.log('    Run the linter\n');
  console.log(chalk.cyan('  npx yoshi build'));
  console.log('    Build your app for production\n');

  console.log(
    `We advise you'll start by running the following command${
      projectDirName ? 's' : ''
    }:\n`,
  );

  if (projectDirName) {
    console.log(chalk.cyan(`cd ${projectDirName}`));
  }

  console.log(chalk.cyan('npm start\n'));

  console.log('For more information visit https://github.com/wix/yoshi');
  console.log('Good luck! 🍀');
};
