module.exports = {
	env: {
		browser: true,
		es6: true,
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
	},
	extends: ['eslint:recommended', 'prettier'],
	rules: {
		'no-async-promise-executor': 'off',
	},
};
