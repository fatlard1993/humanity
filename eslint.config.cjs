module.exports = [
	...require('@vanilla-bean/components/eslint.app.config.cjs'),
	{
		files: ['client/**/*.js'],
		rules: {
			'no-console': ['warn', { allow: ['error', 'warn'] }],
		},
	},
];
