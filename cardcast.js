const fs = require('fs');
const exec = require('child_process').exec;

const CardcastAPI = require('cardcast-api').CardcastAPI;
const api = new CardcastAPI();

if(process.argv[2] === 'search'){
	console.log(`------------------------\nSearching for decks named "${process.argv[3]}"...\n`);

	api.search(process.argv[3]).then(function(results){
			console.log(`found ${results.data.length} of decks\n------------------------`);

			for(var x = 0; x < results.data.length; ++x){
				console.log('\n----------- '+ results.data[x].code +'\n'+ results.data[x].name +'\nrating: '+ results.data[x].rating +'\ncategory: '+ results.data[x].category +'\nblacks: '+ results.data[x].call_count +'\nwhites: '+ results.data[x].response_count +'\n', (results.data[x].has_nsfw_cards ? 'NSFW' : 'CLEAN'));
			}
	});
}

else if(process.argv[2] === 'get'){
	console.log('Retrieving a deck...\n');
	api.deck(process.argv[3]).then(function(deck){
		deck.populatedPromise.then(function(){
			console.log('name:', deck.name);
			console.log(deck.description);
			console.log('blacks:', deck.calls.length);
			console.log('whites:', deck.responses.length);
			console.log('------------------------');

			const outFile = process.argv[4];

			console.log(`Writing: ./src/cards/${outFile}.json`);

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

			console.log(`read ${blacksInCount} blacks & ${whitesInCount} whites : wrote ${blacks_out.length} blacks & ${whites_out.length} whites`);

			fs.writeFile(`./src/cards/${outFile}.json`, JSON.stringify({ blacks: blacks_out, whites: whites_out }, ' ', 2), function(){
				exec('gulp dev');
			});
		});
	});
}

else{
	console.log('usage:\nsearch <term>\nget <code> <output_pack_name>');
}