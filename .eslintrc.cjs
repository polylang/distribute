module.exports = {
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
	overrides: [
		{
			files: [ 'tests/unit/**/*.js' ],
			env: {
				jest: true,
			},
			rules: {
				'import/no-extraneous-dependencies': 'off',
			},
		},
	],
};
