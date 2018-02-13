const fs = require('fs');
const exec = require('child_process').exec;
const Log = require(process.env.DIR +'/_log.js');

function browse(folder, cb){
	var folders = [];

	exec('ls -d "'+ folder +'"/*/', function(err, stdout, stderr){
		var folderNames = stdout.split('\n');

		folderNames.forEach(function(folderName){
			if(folderName && folderName.length) folders.push(/\/([^\/]*?)\/$/.exec(folderName)[1]);
		});

		var files = [];

		exec('ls -p "'+ folder +'/" | grep -v /', function(err, stdout, stderr){
			var fileNames = stdout.split('\n');

			fileNames.forEach(function(fileName){
				if(fileName && fileName.length) files.push(fileName);
			});

			cb({ folder: folder, folders: folders, files: files });
		});
	});
}

const Cards = {
	packs: {},
	init: function(){
		browse(process.env.DIR +'/cards', function(data){
			Log()(`Loading ${data.files.length} packs`);

			data.files.forEach(function(file){
				fs.readFile(data.folder +'/'+ file, function(err, data){
					var packData = JSON.parse(data), packName = file.replace('.json', '');

					Cards.packs[packName] = packData;

					Log()(`Loaded ${packName}`);
				});
			});
		});
	},
	get: function(packNames){
		var packCount = packNames.length, output = { blacks: [], whites: [] };

		for(var x = 0; x < packCount; ++x){
			output.blacks = output.blacks.concat(Cards.packs[packNames[x]].blacks);
			output.whites = output.whites.concat(Cards.packs[packNames[x]].whites);
		}

		return output;
	},
	recordCustom: function(text){
		Log()('cards', 'record custom: ', text);

		fs.readFile(process.env.DIR +'/../src/cards/custom.json', function(err, data){
			var packData;

			try{
				packData = JSON.parse(data);
			}
			catch(e){
				packData = { blacks: [], whites: [] };
			}

			packData.whites.push(text);

			Cards.packs.custom = packData;

			Log()(`Loaded custom`);

			fs.writeFile(process.env.DIR +'/../src/cards/custom.json', JSON.stringify(packData), function(err){
				Log()(`Saved custom`);
			});
		});
	}
};

module.exports = Cards;