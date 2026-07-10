module.exports = {
	testEnvironment: 'node',
	testMatch: [ 'tests/unit/**/*.test.js' ],
	collectCoverageFrom: [
		'src/**/*.js',
		'!**/node_modules/**',
		'!**/*.config.js',
		'!**/*.test.js',
		'!coverage/**',
	],
	coverageReporters: [ 'text', 'json-summary', 'lcov' ],
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
};
