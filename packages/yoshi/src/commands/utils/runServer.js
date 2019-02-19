const chalk = require('chalk');
const stream = require('stream');
const waitPort = require('wait-port');
const child_process = require('child_process');
const { PORT } = require('../../constants');

function serverLogPrefixer() {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.push(`${chalk.greenBright('[SERVER]')}: ${chunk.toString()}`);
      callback();
    },
  });
}

const inspectArg = process.argv.find(arg => arg.includes('--debug'));

module.exports = class Server {
  constructor({ serverFilePath }) {
    this.serverFilePath = serverFilePath;
  }

  async initialize() {
    this.child = child_process.fork(this.serverFilePath, {
      stdio: 'pipe',
      execArgv: [inspectArg]
        .filter(Boolean)
        .map(arg => arg.replace('debug', 'inspect')),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT,
      },
    });

    this.child.stdout.pipe(serverLogPrefixer()).pipe(process.stdout);
    this.child.stderr.pipe(serverLogPrefixer()).pipe(process.stderr);

    this.child.on('message', this.onMessage.bind(this));

    await waitPort({
      port: PORT,
      output: 'silent',
      timeout: 20000,
    });
  }

  onMessage(response) {
    this._resolve(response);
  }

  end() {
    this.child.kill();
  }

  send(message) {
    this.child.send(message);

    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  async restart() {
    this.child.kill();

    await new Promise(resolve =>
      setInterval(() => {
        if (this.child.killed) {
          resolve();
        }
      }, 100),
    );

    await this.initialize();
  }
};
