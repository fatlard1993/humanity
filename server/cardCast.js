const fs = require('fs');
const path = require('path');
const log = require('log');
const fsExtended = require('fs-extended');
const ccApi = new (require('cardcast-api')).CardcastAPI();

const cardCast = {
	init: function(socketServer, rootFolder){
		this.rootFolder = rootFolder;

		socketServer.registerEndpoints(this.socketEndpoints);
	},
	socketEndpoints: {
		cardCast_search: function(query){
			log('Search: ', query);

			ccApi.search(query).then((results) => {
				log(`Found ${results.data.length} of decks`);

				for(var x = 0; x < results.data.length; ++x){
					log(1)('\n----------- '+ results.data[x].code +'\n'+ results.data[x].name +'\nrating: '+ results.data[x].rating +'\ncategory: '+ results.data[x].category +'\nblacks: '+ results.data[x].call_count +'\nwhites: '+ results.data[x].response_count +'\n', (results.data[x].has_nsfw_cards ? 'NSFW' : 'CLEAN'));
				}

				this.reply('cardCast_packs', results.data);
			});
		},
		cardCast_install: function(code){
			log('Install: ', code);

			ccApi.deck(code).then(function(deck){
				deck.populatedPromise.then(function(){
					log('name:', deck.name);
					log(deck.description);
					log('blacks:', deck.calls.length);
					log('whites:', deck.responses.length);
					log('------------------------');

					const outFile = deck.name;

					fsExtended.mkdir(path.join(cardCast.rootFolder, 'temp/cards'));

					log(`Writing: ${cardCast.rootFolder}/temp/cards/${outFile}.json`);

					var x, blackText, whiteText;
					var blacks = deck.calls, blacksInCount = blacks.length, blacks_out = [];
					var whites = deck.responses, whitesInCount = whites.length, whites_out = [];

					for(x = 0; x < blacksInCount; ++x){
						if(blacks[x].text.length <= 2){
							blackText = blacks[x].text.join('_____');
							blackText = blackText.replace(/\s?\.$/gm, '');

							blacks_out.push(blackText);
						}
					}

					for(x = 0; x < whitesInCount; ++x){
						whiteText = whites[x].text;
						whiteText = whiteText.replace(/\s?\.$/gm, '');

						whites_out.push(whiteText);
					}

					log(`read ${blacksInCount} blacks & ${whitesInCount} whites : wrote ${blacks_out.length} blacks & ${whites_out.length} whites`);

					fs.writeFile(path.join(cardCast.rootFolder, 'temp/cards', `${outFile}.json`), JSON.stringify({ blacks: blacks_out, whites: whites_out }, ' ', 2), function(){
						log(arguments);

						//todo reload packs
					});
				});
			});
		}
	}
};

module.exports = cardCast;