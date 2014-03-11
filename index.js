
module.exports = process.env.APP_COVERAGE ? require('./lib-cov/client') : require('./lib/client');
