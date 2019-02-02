// const sockjs = require('sockjs');

const STATS = {
  all: false,
  hash: true,
  assets: true,
  warnings: true,
  errors: true,
  errorDetails: false,
};

module.exports = function(server, { clientCompiler, callback, output }) {
  // const { done } = serverCompiler.hooks;

  // done.tap('webpack-hot-middleware', stats => {
  callback(({ stats }) => {
    const jsonStats = stats.toJson(STATS);

    if (
      jsonStats &&
      (!jsonStats.errors || jsonStats.errors.length === 0) &&
      jsonStats.assets &&
      jsonStats.assets.every(asset => !asset.emitted)
    ) {
      return server.sockWrite(server.sockets, 'still-ok');
    }

    server.sockWrite(server.sockets, 'hash', jsonStats.hash);

    if (jsonStats.errors.length > 0) {
      server.sockWrite(server.sockets, 'errors', jsonStats.errors);
    } else if (jsonStats.warnings.length > 0) {
      server.sockWrite(server.sockets, 'warnings', jsonStats.warnings);
    } else {
      server.sockWrite(server.sockets, 'ok');
    }
  });

  output(({ str }) => {
    setTimeout(() => {
      server.sockWrite(server.sockets, 'output', str);
    }, 1000);
  });
};
