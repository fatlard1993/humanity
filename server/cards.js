import fs from 'fs';

import { shuffleArray } from '../utils/rand';
import { forEachFile } from './utils';

const cards = {
	db: {},
	init() {
		forEachFile(`${import.meta.dir}/../cards`, ({ isDirectory, name, path }) => {
			if (!isDirectory) this.loadPack(name, path);
		});
	},
	loadPack(name, path) {
		console.log('Loading pack:', name);

		cards.db[name] = { data: JSON.parse(fs.readFileSync(path, 'utf8')) };
	},
	buildSuperPack(packNames) {
		const blacks = [];
		const whites = [];

		packNames.forEach(name => {
			const pack = cards.db[name]?.data;
			if (!pack) return;

			if (pack.blacks) blacks.push(...pack.blacks);
			if (pack.whites) whites.push(...pack.whites);
		});

		return { blacks: shuffleArray([...new Set(blacks)]), whites: shuffleArray([...new Set(whites)]) };
	},
};

export default cards;
