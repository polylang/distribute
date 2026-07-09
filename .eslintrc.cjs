module.exports = {
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
	overrides: [
		{
			files: [ 'tests/**/*.js' ],
			rules: {
				'import/no-extraneous-dependencies': 'off',
			},
		},
	],
};
