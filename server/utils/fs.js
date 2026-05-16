import nodePath from 'path';
import fs from 'fs';

export const forEachFile = (folder, callback) => {
	const files = fs.readdirSync(folder);

	files.forEach(name => {
		const path = nodePath.join(folder, name);

		callback({
			filename: name,
			name: name.replace(/\..+$/, ''),
			extension: /\.(.+)$/.exec(name)[1],
			path,
			isDirectory: fs.lstatSync(path).isDirectory(),
		});
	});
};
