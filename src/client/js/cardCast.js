import Log from 'log';
import dom from 'dom';
import socketClient from 'socket-client';

const log = new Log({ verbosity: parseInt(dom.storage.get('logVerbosity') || 0) });

const cardCast = {
	packs: [],
	draw: function(){
		dom.empty(dom.getElemById('content'));

		dom.createElem('button', { className: 'leftButton', textContent: 'Back', appendTo: dom.getElemById('content') });

		cardCast.searchElem = dom.createElem('input', dom.basicTextElem({ placeholder: 'Search', appendTo: dom.getElemById('content') }));

		cardCast.packsListElem = dom.createElem('ul', { appendTo: dom.getElemById('content') });
	},
	renderPacksList: function(){
		dom.empty(cardCast.packsListElem);

		for(var x = 0, count = cardCast.packs.length, pack; x < count; ++x){
			pack = cardCast.packs[x];

			dom.createElem('li', { textContent: `"${pack.name}"\n\nblacks: ${pack.call_count} whites: ${pack.response_count} rating: ${pack.rating}`, data: { code: pack.code }, appendTo: cardCast.packsListElem });
		}
	},
	search: function(){
		log()('search', cardCast.searchElem.value);

		socketClient.reply('cardCast_search', cardCast.searchElem.value);
	}
};

dom.onLoad(function onLoad(){
	socketClient.on('open', function(){
		cardCast.draw();

		socketClient.reply('join_room', { room: 'cardCast' });
	});

	socketClient.on('cardCast_packs', function(packs){
		log()('packs', packs);

		cardCast.packs = packs;

		cardCast.renderPacksList();
	});

	dom.interact.on('pointerUp', (evt) => {
		if(evt.target.textContent === 'Back'){
			evt.stop();

			dom.location.change('/create');
		}

		else if(evt.target.nodeName === 'LI'){
			evt.stop();

			log()('install', evt.target.dataset.code);

			socketClient.reply('cardCast_install', evt.target.dataset.code);
		}
	});

	dom.interact.on('keyUp', (evt) => {
		if(evt.target.nodeName === 'INPUT'){
			if(cardCast.searchTimeout) clearTimeout(cardCast.searchTimeout);

			cardCast.searchTimeout = setTimeout(cardCast.search, 500);
		}
	});

	dom.mobile.detect();

	socketClient.init();

	dom.setTitle('[humanity] Card Cast');
});