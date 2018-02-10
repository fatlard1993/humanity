const fs = require('fs');

const inFile = process.argv[2];
const outFile = process.argv[3];

console.log(`Reading: ./${inFile}.json | Writing: ./src/cards/${outFile}.json`);

fs.readFile(`./${inFile}.json`, function(err, data){
	var inJSON = JSON.parse(data), x, blackText, whiteText;
	var blacks = inJSON.blackCards, blacksInCount = blacks.length, blacks_out = [];
	var whites = inJSON.whiteCards, whitesInCount = whites.length, whites_out = [];

	for(x = 0; x < blacksInCount; ++x){
		if(blacks[x].pick === 1){
			blackText = blacks[x].text;
			blackText = blackText.replace(/[^_]?(__?)[^_]/gm, '_____');
			blackText = blackText.replace(/\.$/gm, '');
			
			blacks_out.push(blackText);
		}
	}

	for(x = 0; x < whitesInCount; ++x){
		whiteText = whites[x];
		whiteText = whiteText.replace(/\.$/gm, '');

		whites_out.push(whiteText);
	}

	console.log(`read ${blacksInCount} blacks & ${whitesInCount} whites : wrote ${blacks_out.length} blacks & ${whites_out.length} whites`);

	fs.writeFile(`./src/cards/${outFile}.json`, JSON.stringify({ blacks: blacks_out, whites: whites_out }, '	'));
});