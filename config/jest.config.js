module.exports = {
  ...require('./jest.base.config.js'),
  projects: [
    './jest.unit.config.js',
    './jest.integration.config.js',
    './jest.e2e.config.js'
  ]
}; 