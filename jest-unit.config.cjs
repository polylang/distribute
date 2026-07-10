module.exports = {
	testEnvironment: 'node',
	testMatch: [ '<rootDir>/tests/unit/**/*.test.js' ],
	testPathIgnorePatterns: [ '/node_modules/' ],
	transform: {
		'\\.[jt]sx?$': require.resolve(
			'@wordpress/scripts/config/babel-transform'
		),
	},
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
