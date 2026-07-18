const path = require('path');
const baseConfig = require('jest-expo/jest-preset');

module.exports = {
  ...baseConfig,
  setupFiles: [
    path.resolve(__dirname, 'jest.preSetup.js'),
    ...(baseConfig.setupFiles || []).filter(f => !f.includes('jest-expo/src/preset/setup.js')),
  ],
};
