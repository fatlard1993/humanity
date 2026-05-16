import { Router } from 'vanilla-bean-components';

import Create from './Create.js';
import Hub from './Hub.js';
import Join from './Join.js';
import Play from './Play.js';
import Watch from './Watch.js';

const paths = { create: '/create', hub: '/hub', join: '/join/:gameId', play: '/play/:gameId', watch: '/watch/:gameId' };
const views = {
	[paths.create]: Create,
	[paths.hub]: Hub,
	[paths.join]: Join,
	[paths.play]: Play,
	[paths.watch]: Watch,
};

const router = new Router({ views, defaultPath: paths.hub });

export default router;
