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
		defaultValue: 8034,
		alias: 'p',
	},
});

const log = new (require('log'))({
	tag: 'humanity',
	defaults: { verbosity: options.verbosity, color: true, colorMap: { humanity: '\x1b[36m', game: '\x1b[36m', lobby: '\x1b[36m', cards: '\x1b[36m', sockets: '\x1b[36m', room: '\x1b[36m' } },
});

log(1)('Options', options);

require('./server').init(options);
