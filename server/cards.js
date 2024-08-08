import { shuffleArray } from '../utils/rand';
import { forEachFile, JSONFile } from './utils';

const cards = {
	db: {},
	async init() {
		forEachFile(`${import.meta.dir}/../cards`, ({ isDirectory, name, path }) => {
			if (!isDirectory) this.loadPack(name, path);
		});
	},
	async loadPack(name, path) {
		console.log('Loading pack:', name);

		cards.db[name] = new JSONFile(path);

		await cards.db[name].read();
	},
	buildSuperPack(packNames) {
		const blacks = [];
		const whites = [];

		packNames.forEach(name => {
			blacks.push(...cards.db[name].data.blacks);
			whites.push(...cards.db[name].data.whites);
		});

		return { blacks: shuffleArray([...new Set(blacks)]), whites: shuffleArray([...new Set(whites)]) };
	},
};

export default cards;
