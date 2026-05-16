#!/usr/bin/env bun

import os from 'os';
import path from 'path';

import Argi from 'argi';

import { Server, Database } from '@fatlard1993/web-game-framework';

import Game from './game.js';
import router from './router';

const { options } = new Argi({
	options: {
		database: {
			type: 'string',
			alias: 'd',
			defaultValue: path.join(os.homedir(), '.humanity.json'),
			description: 'Database json file to use',
		},
		port: {
			type: 'number',
			alias: 'p',
			defaultValue: 8032,
		},
		verbosity: {
			type: 'number',
			alias: 'v',
			defaultValue: process.env.NODE_ENV === 'production' ? 1 : 3,
			description: 'Logging verbosity level (0=all, 1=production, 2=development, 3=debug)',
		},
	},
});

const database = new Database({
	filePath: options.database,
	onReady: (db) => {
		const savedGames = db.collections?.games?.read() || {};
		Object.values(savedGames).forEach(saveState => {
			new Game({ saveState, server });
		});
	},
});

const server = new Server({
	port: options.port,
	database,
	verbosity: options.verbosity,
	Game,
	router,
});

export default server;
