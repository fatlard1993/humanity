import { socketBroadcast } from './server';

if (process.env.NODE_ENV === 'development') {
	const buildProcess = Bun.spawn(['bun', 'run', 'build:dev']);
	const reader = buildProcess.stdout.getReader();

	const handleBuildChange = () => {
		socketBroadcast('hotReload');

		reader.read().then(handleBuildChange).catch(console.error);
	};

	handleBuildChange();
}
