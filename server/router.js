const path = require('path');

const log = require('log');

module.exports = function(rootFolder, { app, sendPage, staticServer }){
	app.use(staticServer(path.join(rootFolder, 'client/resources')));

	app.use(function(req, res, next){
		next(res.reqType === 'file' ? { code: 404, detail: `Could not find ${req.originalUrl}` } : null);
	});

	app.use(function(req, res, next){
		if(req.method !== 'GET' || !{ lobby: 1, create: 1, play: 1, view: 1, cardCast: 1 }[req.path.slice(1)]) return next();

		log(`[router] Load ${req.path}`, req.socket.remoteAddress);

		sendPage(req.path)(req, res);
	});
};