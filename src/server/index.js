#!/usr/bin/env node

const argi = require('argi');

const { options } = argi.parse({
	verbosity: {
		type: 'number',
		defaultValue: 1,
		alias: 'v',
	},
	port: {
		type: 'number',
		defaultValue: 8793,
		alias: 'p',
	}
});

const log = new (require('log'))({ tag: 'humanity', defaults: { verbosity: options.verbosity, color: true } });

log(1)('Options', options);

require('./humanity').init(options);