import baseConfig from './jest.config.mjs';

export default {
  ...baseConfig,
  testRegex: '.*\\.int-spec\\.ts$',
};