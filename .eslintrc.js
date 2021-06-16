module.exports = {
	env: {
		es6: true,
		node: true,
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
