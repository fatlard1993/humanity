const fs = require('fs');
const log = require('log');
const exec = require('child_process').exec;

const CardcastAPI = require('cardcast-api').CardcastAPI;
const api = new CardcastAPI();

if(process.argv[2] === 'search'){
	log(`------------------------\nSearching for decks named "${process.argv[3]}"...\n`);

	api.search(process.argv[3]).then(function(results){
			log(`found ${results.data.length} of decks\n------------------------`);

			for(var x = 0; x < results.data.length; ++x){
				log('\n----------- '+ results.data[x].code +'\n'+ results.data[x].name +'\nrating: '+ results.data[x].rating +'\ncategory: '+ results.data[x].category +'\nblacks: '+ results.data[x].call_count +'\nwhites: '+ results.data[x].response_count +'\n', (results.data[x].has_nsfw_cards ? 'NSFW' : 'CLEAN'));
			}
	});
}

else if(process.argv[2] === 'get'){
	log('Retrieving a deck...\n');

	api.deck(process.argv[3]).then(function(deck){
		deck.populatedPromise.then(function(){
			log('name:', deck.name);
			log(deck.description);
			log('blacks:', deck.calls.length);
			log('whites:', deck.responses.length);
			log('------------------------');

			const outFile = process.argv[4];

			log(`Writing: ./server/cards/${outFile}.json`);

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

			fs.writeFile(`./server/cards/${outFile}.json`, JSON.stringify({ blacks: blacks_out, whites: whites_out }, ' ', 2), function(){
				exec('gulp dev');
			});
		});
	});
}

else{
	log('usage:\nsearch <term>\nget <code> <output_pack_name>');
}