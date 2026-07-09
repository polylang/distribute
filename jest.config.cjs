module.exports = {
	testEnvironment: 'node',
	testMatch: [ '**/*.test.js' ],
	collectCoverageFrom: [
		'src/**/*.js',
		'!**/node_modules/**',
		'!**/*.config.js',
		'!**/*.test.js',
		'!coverage/**',
	],
};
