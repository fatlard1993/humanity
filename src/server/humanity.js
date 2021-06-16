const path = require('path');

const Game = require('./game');

const humanity = {
	rootPath: function () {
		return path.join(__dirname, '../..', ...arguments);
	},
	init: function (options) {
		this.options = options;

		this.game = new Game(this.rootPath(), options.port);
	},
};

module.exports = humanity;
