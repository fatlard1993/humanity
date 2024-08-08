#!/usr/bin/env bun

import argi from 'argi';

import cards from './cards';
import { init as server } from './server';

import './hotReload';
import './exit';

const { options } = argi.parse({
	port: {
		type: 'number',
		alias: 'p',
		defaultValue: 8032,
	},
});

console.log('Options', options, process.env.NODE_ENV);

cards.init();

server({ port: options.port });
