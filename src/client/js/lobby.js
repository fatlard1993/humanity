import { log, dom, socketClient } from '_common';

//todo player name default to random card

const lobby = {
	draw: function(){
		dom.empty(dom.getElemById('content'));

		delete lobby.nameInput;

		dom.createElem('button', { className: 'leftButton', textContent: 'Refresh', appendTo: dom.getElemById('content') });
		dom.createElem('button', { id: 'newGame', className: 'rightButton', textContent: 'New Game', appendTo: dom.getElemById('content') });

		var roomList = dom.createElem('ul', { appendTo: dom.getElemById('content') });

		if(!this.roomCount) return dom.createElem('li', { className: 'noGames', textContent: 'No Game Rooms Available', appendTo: roomList });

		for(var x = 0; x < this.roomCount; ++x) dom.createElem('li', { data: { name: this.roomNames[x] }, innerHTML: this.roomNames[x], appendChild: dom.createElem('span', { textContent: this.rooms[this.roomNames[x]].players }), appendTo: roomList });
	},
	draw_join: function(){
		dom.empty(dom.getElemById('content'));

		log()('joining', lobby.selectedGame, lobby.rooms[lobby.selectedGame]);

		lobby.nameInput = dom.createElem('input', { type: 'text', placeholder: 'Player Name', validation: /^.{3,32}$/, value: dom.storage.get('player_name') || '', validate: 0, validationWarning: 'Must be between 4 and 32 characters' });

		dom.appendChildren(dom.getElemById('content'), dom.createElem('button', { className: 'leftButton', textContent: 'Back' }), dom.createElem('button', { className: 'rightButton', textContent: 'Play' }), dom.createElem('button', { className: 'rightButton', textContent: 'View' }), lobby.nameInput);

		lobby.nameInput.focus();
	}
};

dom.onLoad(function onLoad(){
	socketClient.on('open', function(){
		socketClient.reply('join_room', { room: 'lobby' });
	});

	socketClient.on('state', function(data){
		log()('[lobby] state', data);

		if(data.rooms){
			lobby.rooms = data.rooms;
			lobby.roomNames = Object.keys(lobby.rooms);
			lobby.roomCount = lobby.roomNames.length;

			if(lobby.nameInput) return;

			lobby.draw();
		}
	});

	socketClient.on('player_register', function(payload){
		if(payload.err){
			dom.remove(document.getElementsByClassName('validationWarning'));

			dom.createElem('p', { className: 'validationWarning', textContent: payload.err, appendTo: dom.getElemById('content') });

			lobby.nameInput.classList.remove('validated');
			lobby.nameInput.classList.add('invalid');

			return;
		}

		dom.storage.set('player_name', payload.name);

		dom.location.change(`/${payload.action}?room=${payload.room}`);
	});

	dom.interact.on('pointerUp', (evt) => {
		if(evt.target.id === 'newGame'){
			evt.preventDefault();

			dom.location.change('/create');
		}

		else if(evt.target.className === 'leftButton'){
			evt.preventDefault();

			window.location.reload(false);
		}

		else if(evt.target.nodeName === 'LI'){
			evt.preventDefault();

			if(evt.target.classList.contains('noGames')) return dom.location.change('/create');

			lobby.selectedGame = evt.target.dataset.name;

			lobby.draw_join();
		}

		else if({ Play: 1, View: 1 }[evt.target.textContent]){
			evt.preventDefault();

			var warnings = dom.showValidationWarnings(dom.getElemById('content'));

			if(warnings) return;

			socketClient.reply('player_register', { room: lobby.selectedGame, action: evt.target.textContent.toLowerCase(), name: lobby.nameInput.value });
		}

		else if(evt.target.textContent === 'Back'){
			evt.preventDefault();

			lobby.draw();
		}
	});

	dom.interact.on('keyUp', (evt) => {
		if(evt.keyPressed === 'ENTER' && lobby.selectedGame){
			evt.preventDefault();

			var warnings = dom.showValidationWarnings(dom.getElemById('content'));

			if(warnings) return;

			socketClient.reply('player_register', { room: lobby.selectedGame, action: 'play', name: lobby.nameInput.value });
		}
	});

	dom.mobile.detect();

	socketClient.init();

	dom.setTitle('[humanity] Lobby');
});