process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

const parseArgs = require('minimist');

const cliArgs = parseArgs(process.argv.slice(2), {
  default: {
    server: 'index.js',
    https: false,
  },
});

if (cliArgs.production) {
  process.env.BABEL_ENV = 'production';
  process.env.NODE_ENV = 'production';
}

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const openBrowser = require('react-dev-utils/openBrowser');
const chokidar = require('chokidar');
const project = require('yoshi-config');
const {
  BUILD_DIR,
  PUBLIC_DIR,
  ASSETS_DIR,
  TARGET_DIR,
} = require('yoshi-config/paths');
const { PORT } = require('../constants');
const {
  createClientWebpackConfig,
  createServerWebpackConfig,
} = require('../../config/webpack.config');
const {
  createCompiler,
  createDevServer,
  waitForCompilation,
} = require('../webpack-utils');
const Server = require('./utils/runServer');

const host = '0.0.0.0';

const https = cliArgs.https || project.servers.cdn.ssl;

function watchPublicFolder() {
  const watcher = chokidar.watch(PUBLIC_DIR, {
    persistent: true,
    ignoreInitial: false,
    cwd: PUBLIC_DIR,
  });

  const copyFile = relativePath => {
    return fs.copy(
      path.join(PUBLIC_DIR, relativePath),
      path.join(ASSETS_DIR, relativePath),
    );
  };

  const removeFile = relativePath => {
    return fs.remove(path.join(ASSETS_DIR, relativePath));
  };

  watcher.on('change', copyFile);
  watcher.on('add', copyFile);
  watcher.on('unlink', removeFile);
}

module.exports = async () => {
  // Clean tmp folders
  await Promise.all([fs.emptyDir(BUILD_DIR), fs.emptyDir(TARGET_DIR)]);

  // Copy public to statics dir
  if (await fs.pathExists(PUBLIC_DIR)) {
    // all files in `PUBLIC_DIR` are copied initially as Chokidar's `ignoreInitial`
    // option is set to false
    watchPublicFolder();
  }

  const clientConfig = createClientWebpackConfig({
    isDebug: true,
    isAnalyze: false,
    isHmr: project.hmr,
  });

  const serverConfig = createServerWebpackConfig({
    isDebug: true,
    isHmr: true,
  });

  // Configure compilation
  const multiCompiler = createCompiler([clientConfig, serverConfig], { https });
  const compilationPromise = waitForCompilation(multiCompiler);

  const [clientCompiler, serverCompiler] = multiCompiler.compilers;

  // Start up server process
  const serverProcess = new Server({ serverFilePath: cliArgs.server });

  // Start up webpack dev server
  const devServer = await createDevServer(clientCompiler, {
    publicPath: clientConfig.output.publicPath,
    port: project.servers.cdn.port,
    host,
  });

  serverCompiler.watch({ 'info-verbosity': 'none' }, async (error, stats) => {
    // If the spawned server process has died, start a new one
    if (serverProcess.child && serverProcess.child.exitCode !== null) {
      await serverProcess.restart();
    }
    // If it's alive, send it a message to trigger HMR
    else {
      const jsonStats = stats.toJson();

      // If there are no errors and the server can be refreshed:
      // Wait for server to be ready before sending a signal
      if (serverProcess.child && !error && !stats.hasErrors()) {
        const { success } = await serverProcess.send({});

        if (!success) {
          await serverProcess.restart();
        }

        await devServer.send('hash', jsonStats.hash);
        await devServer.send('ok');
      } else {
        // Otherwise, just send the signal immediately
        if (jsonStats.errors.length > 0) {
          await devServer.send('errors', jsonStats.errors);
        } else if (jsonStats.warnings.length > 0) {
          await devServer.send('warnings', jsonStats.warnings);
        }
      }
    }
  });

  console.log(chalk.cyan('Starting development environment...\n'));

  // Start up webpack dev server
  await new Promise((resolve, reject) => {
    devServer.listen(project.servers.cdn.port, host, err =>
      err ? reject(err) : resolve(devServer),
    );
  });

  // Wait for both compilations to finish
  try {
    await compilationPromise;
  } catch (error) {
    // We already log compilation errors in a compiler hook
    // If there's an error, just exit(1)
    process.exit(1);
  }

  ['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, () => {
      serverProcess.end();
      devServer.close();
      process.exit();
    });
  });

  try {
    await serverProcess.initialize();
  } catch (error) {
    console.log();
    console.log(
      chalk.red(`Couldn't find a server running on port ${chalk.bold(PORT)}.`),
    );
    console.log(
      chalk.red(
        `Please check ${chalk.bold(cliArgs.server)} starts on this port.`,
      ),
    );
    console.log();
    console.log(chalk.red('Aborting'));
    process.exit(1);
  }

  // Once it started, open up the browser
  openBrowser(`http://localhost:${PORT}`);

  return {
    persistent: true,
  };
};
