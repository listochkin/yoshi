const chalk = require('chalk');
const stream = require('stream');
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

    this.initialize();
  }

  initialize() {
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
  }

  onMessage(response) {
    response.success ? this._resolve(response) : this._reject(response);
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

    this.initialize();
  }
};
