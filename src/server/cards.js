const fs = require('fs');
const path = require('path');

const log = new (require('log'))({ tag: 'cards' });
const fsExtended = require('fs-extended');

const cards = (module.exports = {
	blacklist: {},
	load: function (rootFolder, cb) {
		this.rootFolder = rootFolder;
		this.path = `${rootFolder}/src/cards/`;
		this.tempPath = `${rootFolder}/temp/cards/`;
		this.packs = {};

		fsExtended.browse(this.path, data => {
			log(`Importing ${data.files.length} packs from ${this.path}`);

			var files = data.files;

			fsExtended.browse(this.tempPath, data => {
				log(`Importing ${data.files.length} packs from ${this.path}`);

				files = files.concat(data.files);

				files.forEach(file => {
					try {
						var packData = JSON.parse(fsExtended.catSync(file));
					} catch (err) {
						return log.error(`Error parsing pack ${file}`, err);
					}

					var packName = file.replace(new RegExp(this.tempPath + '|' + this.path), '').replace('.json', '');

					this.packs[packName] = packData;

					log(`Loaded "${packName}"`);
				});

				if (cb) cb(this.packs);
			});
		});

		return this;
	},
	get: function (packNames) {
		var packCount = packNames.length,
			output = { blacks: [], whites: [] };

		for (var x = 0; x < packCount; ++x) {
			output.blacks = output.blacks.concat(this.packs[packNames[x]].blacks);
			output.whites = output.whites.concat(this.packs[packNames[x]].whites);
		}

		return output;
	},
	recordCustom: function (text) {
		log('Record custom: ', text);

		fs.readFile(`${this.rootFolder}/temp/cards/custom.json`, (err, data) => {
			var packData;

			try {
				packData = JSON.parse(data);
			} catch (e) {
				packData = { blacks: [], whites: [] };
			}

			packData.whites.push(text);

			this.packs.custom = packData;

			log(`Loaded custom`);

			fsExtended.mkdir(path.join(this.rootFolder, 'temp/cards'));

			fs.writeFile(`${this.rootFolder}/temp/cards/custom.json`, JSON.stringify(packData), err => {
				if (err) return log.error(`Error saving custom`, err);

				log(`Saved custom card ${text}`);
			});
		});
	},
	recordBlacklist: function (text) {
		log('Record blacklist: ', text);

		fs.readFile(`${this.rootFolder}/temp/blacklist.json`, (err, data) => {
			var packData;

			try {
				packData = JSON.parse(data);
			} catch (e) {
				packData = {};
			}

			if (packData[text]) return log(`"${text}" is already blacklisted`);

			packData[text] = true;

			cards.blackList = packData;

			fsExtended.mkdir(path.join(this.rootFolder, 'temp'));

			log(`Loaded blacklist`);

			fs.writeFile(`${this.rootFolder}/temp/blacklist.json`, JSON.stringify(packData, '\t', 1), err => {
				if (err) return log.error(`Error saving blacklist`, err);

				log(`Saved blacklist card ${text}`);
			});
		});
	},
});
