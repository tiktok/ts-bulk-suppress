module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }]
  },
  testRegex: '(tests/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: ['fixtures'],
  transformIgnorePatterns: ['fixtures', '<rootDir>/node_modules/']
  // moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
