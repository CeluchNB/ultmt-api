module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    globalSetup: './tests/fixtures/setup-test-env.ts',
    coveragePathIgnorePatterns: ['logging/index.ts'],
}
