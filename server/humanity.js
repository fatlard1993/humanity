const path = require('path');

const rootFolder = require('find-root')(__dirname);

const Game = require('./game');

const args = require('yargs').argv;

function rootPath(){ return path.join(rootFolder, ...arguments); }

var humanity = {
	rootFolder,
	rootPath,
	game: new Game(rootFolder, args.port)
};

module.exports = humanity;