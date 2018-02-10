const fs = require('fs');

fs.readFile(process.env.IF, function(err, data){
	var inJSON = JSON.parse(data), x, blackText;
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
		whites_out.push(whites[x]);
	}

	console.log(`read ${blacksInCount} blacks & ${whitesInCount} whites : wrote ${blacks_out.length} blacks & ${whites_out.length} whites`);

	fs.writeFile('./src/cards/'+ (process.env.O || 'out') +'.json', JSON.stringify({ blacks: blacks_out, whites: whites_out }, '	'));
});