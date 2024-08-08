import nodePath from 'path';
import fs from 'fs';

export const forEachFile = (folder, callback) => {
	fs.readdir(folder, (error, files) => {
		if (error) return console.error(error);

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
	});
};
