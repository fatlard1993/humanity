const log = new (require('log'))({ tag: 'router' });

const server = require('./server');

const router = {
	init: function () {
		const {
			httpServer: { app, staticServer },
			rootPath,
		} = server;

		app.use(function (req, res, next) {
			log(`[${req.socket.remoteAddress}][${req.method}][${res.reqType}][${req.path}]`);

			next();
		});

		app.use(staticServer(rootPath('src/client/resources')), staticServer(rootPath('node_modules/@fortawesome/fontawesome-free')), staticServer(rootPath('node_modules/source-sans-pro')));

		app.use(function (req, res, next) {
			const splitPath = req.path.split('/');
			const fontIndex = splitPath.findIndex(slug => ({ WOFF2: 1, OTF: 1, WOFF: 1, TTF: 1, webfonts: 1 }[slug]));

			if (req.method === 'GET' && fontIndex >= 0) {
				const fixedPath = splitPath.slice(fontIndex).join('/');

				log(`Redirect :: ${req.path} to ${fixedPath} ::: ${req.socket.remoteAddress}\n`);

				res.redirect(307, `/${fixedPath}`);
			} else next(res.reqType === 'file' ? { code: 404, detail: `Could not find ${req.originalUrl}` } : null);
		});

		app.use(function (req, res, next) {
			if (req.method !== 'GET' || !{ lobby: 1, create: 1 }[req.path.slice(1)]) return next();

			log(`Load ${req.path} ::: ${req.socket.remoteAddress}\n`);

			res.sendPage(req.path);
		});

		app.use(function (req, res, next) {
			const splitPath = req.path.split('/');

			if (req.method !== 'GET' || !{ join: 1, play: 1, watch: 1 }[splitPath[1]]) return next();

			log(`Load ${req.path} ::: ${req.socket.remoteAddress}\n`);

			res.sendPage(splitPath[1]);
		});

		app.use(function (req, res, next) {
			if (res.reqType !== 'page') return next();

			res.redirect(307, '/lobby');
		});

		log(1)('- Loaded HTTP Request Router -\n');
	},
};

module.exports = router;
