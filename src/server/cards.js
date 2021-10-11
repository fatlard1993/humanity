const path = require('path');
const fs = require('fs');

const util = require('js-util');
const fsExtended = require('fs-extended');
const log = new (require('log'))({ tag: 'cards' });

const cards = {
	packs: {},
	async init() {
		cards.load(path.join(__dirname, '../..', 'src/cards'));
	},
	async load(folder) {
		log('Loading card packs');

		fsExtended.browse(folder, ({ files }) => {
			log(1)(`Importing ${files.length} packs from ${folder}`);

			files.forEach(file => {
				try {
					if (!file.endsWith('.json')) return;

					log(1)(`Loading "${file}"`);

					const packName = file.replace(`${folder}/`, '').replace('.json', '');
					const packData = JSON.parse(fsExtended.catSync(file));

					if (!(packData?.whites?.length || packData?.blacks?.length)) {
						log.warn(`Invalid pack "${packName}"`);

						return;
					}

					log(1)(`Loaded "${packName}"`);

					cards.packs[packName] = packData;
				} catch (err) {
					log.error(`Error parsing pack ${file}`, err);
				}
			});

			log(`Loaded ${Object.keys(cards.packs).length} packs`);
		});
	},
	getPacks(packNames) {
		const blacks = new Set();
		const whites = new Set();

		packNames.forEach(packName => {
			const pack = cards.packs[packName];

			if (pack.blacks) pack.blacks.forEach(blacks.add, blacks);
			if (pack.whites) pack.whites.forEach(whites.add, whites);
		});

		return { blacks, whites };
	},
	getRandomWhite(packNames) {
		const packName = util.randFromArr(packNames || Object.keys(cards.packs));

		if (!cards.packs[packName]) return;

		return util.randFromArr(cards.packs[packName].whites);
	},
	stringifyPack(pack) {
		return JSON.stringify({
			blacks: Array.from(pack.blacks),
			whites: Array.from(pack.whites),
		});
	},
	async savePack(packName, pack) {
		if (pack) cards.packs[packName] = pack;
		else pack = cards.packs[packName];

		log(`Save pack "${packName}"`, pack);

		return new Promise(resolve => {
			fs.writeFile(path.join(__dirname, '../..', 'src/cards', `${packName}.json`), cards.stringifyPack(pack), err => {
				if (err) return log.error(`Error saving ${packName}`, err);

				log(`Saved ${packName}`);

				resolve();
			});
		});
	},
	recordCustom(text) {
		log('Record custom: ', text);

		const pack = cards.packs.custom || { blacks: new Set(), whites: new Set() };

		pack.whites.add(text);

		cards.savePack('custom', pack);
	},
	async remove(packNames, type, text) {
		packNames.forEach(async packName => {
			if (cards.packs[packName][type].has(text)) {
				cards.packs[packName][type].remove(text);

				await cards.savePack(packName);
			}
		});
	},
};

module.exports = cards;
