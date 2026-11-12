// Every screen's path: the router's routes, and every way to a screen, are built from these
export const paths = {
	create: '/create',
	hub: '/hub',
	join: '/join/:gameId',
	play: '/play/:gameId',
	watch: '/watch/:gameId',
};

/**
 * A screen's address, its params filled in
 * @param {string} path - One of paths
 * @param {object} [params] - The path's params, by name
 * @returns {string} The address, as a link's href
 * @example href(paths.play, { gameId })
 */
export const href = (path, params = {}) =>
	`#${path.replace(/:(\w+)/g, (match, key) => encodeURIComponent(params[key]))}`;

// Off to another screen, when what was done leads there
export const go = (path, params) => {
	window.location.hash = href(path, params);
};
