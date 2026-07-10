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
};
