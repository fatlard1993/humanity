import { Router } from 'vanilla-bean-components';

import Create from './Create';
import Hub from './Hub';
import Join from './Join';
import Play from './Play';
import Watch from './Watch';

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
