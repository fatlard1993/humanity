// includes dom log socket-client _common
// babel
/* global dom log socketClient */

// todo modified card isnt used up

//todo trash whites doesnt work

//todo unready button

//todo player customized color

//todo block multiple connections from the same device

const game = {
	playerColor: function(str){
		var hash = 0, colour = '#', x;

		for(x = 0; x < str.length; ++x) hash = str.charCodeAt(x) + ((hash << 5) - hash);

		hash *= 100;

		for(x = 0; x < 3; ++x) colour += `00${((hash >> (x * 8)) & 0xFF).toString(16)}`.substr(-2);

		return colour;
	},
	draw: function(view){
		dom.empty(dom.getElemById('content'));

		dom.createElem('button', { id: 'leave', className: 'leftButton', textContent: 'Leave', appendTo: dom.getElemById('content') });

		delete game.waiting;

		if(!view && (this.state.stage !== 'new' && game.player.state === 'done')) return this.draw_waiting();

		this[`draw_${view || this.state.stage}`]();
	},
	draw_new: function(){
		if(this.player.state !== 'done') dom.createElem('button', { id: 'ready', appendTo: dom.getElemById('content'), className: 'rightButton', textContent: 'Ready' });

		var playersList = dom.createElem('ul', { appendTo: dom.getElemById('content'), id: 'playersList' });

		for(var x = 0; x < this.state.playerCount; ++x){
			var playerName = this.state.playerNames[x], isLocalPlayer = playerName === this.player.name;

			if(!this.state.players[playerName] || this.state.players[playerName].type === 'view' || this.state.players[playerName].state === 'inactive') continue;

			var li = dom.createElem('li', { className: `player${isLocalPlayer ? ' marked' : ''}${this.state.players[playerName].state === 'done' ? ' ready' : ''}`, textContent: playerName });
			var colorSwatch = dom.createElem('span', { className: 'colorSwatch', appendTo: li });

			colorSwatch.style.backgroundColor = this.playerColor(playerName);

			playersList[isLocalPlayer ? 'insertBefore' : 'appendChild'](li, isLocalPlayer && playersList.children.length ? playersList.children[0] : null);
		}
	},
	draw_submissions: function(){
		if(this.options.submissionTimer) dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'gameTimer' });

		var vetoBlackDisplay = dom.createElem('div', { id: 'vetoBlackDisplay', textContent: `${this.state.vetoVotes}/${this.state.activePlayers}` });
		var vetoBlackButton = dom.createElem('button', { id: 'vetoBlackButton' });
		var blackCard = dom.createElem('div', { id: 'blackCard', innerHTML: this.state.black });

		// if(this.state.waitingOnCount === this.state.activePlayers)
		dom.appendChildren(blackCard, vetoBlackDisplay, vetoBlackButton);

		var submissionWrapper = dom.createElem('div', { id: 'submissionEntryWrapper' });

		if(this.options.editField){
			this.submissionEntry = dom.createElem('input', { appendTo: submissionWrapper, type: 'text', id: 'submissionEntry', disabled: !this.options.editField, validation: /^.{1,256}$/, validate: 0, validationWarning: 'Must be between 1 and 256 characters' });
			dom.createElem('button', { appendTo: submissionWrapper, id: 'clear', textContent: 'Clear' });
		}

		var doneButton = dom.createElem('button', { id: 'enterSubmission', className: 'rightButton', textContent: 'Submit' });
		var whitesList = dom.createElem('ul', { id: 'whitesList' });
		var trashWhites = dom.createElem('button', { id: 'trashWhites', textContent: 'Trash Whites' });

		dom.appendChildren(dom.getElemById('content'), doneButton, blackCard, submissionWrapper, whitesList, trashWhites);

		var whiteCount = this.player.hand.length;

		for(var x = 0; x < whiteCount; ++x){
			var li = dom.createElem('li', { appendTo: whitesList, innerHTML: this.player.hand[x] });

			li.setAttribute('data-text', this.player.hand[x]);
		}

		if(this.options.editField) this.submissionEntry.focus();
	},
	draw_voting: function(){
		if(this.options.voteTimer) dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'gameTimer' });

		dom.createElem('button', { appendTo: dom.getElemById('content'), id: 'confirmVote', className: 'rightButton', textContent: 'Vote' });
		dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'blackCard', innerHTML: this.state.black });

		var whitesList = dom.createElem('ul', { appendTo: dom.getElemById('content'), id: 'whitesList' });

		var whites = Object.keys(this.state.submissions), whiteCount = whites.length;

		for(var x = 0; x < whiteCount; ++x){
			if(this.state.submissions[whites[x]] === game.player.name) continue;

			var li = dom.createElem('li', { appendTo: whitesList, innerHTML: whites[x] });

			li.setAttribute('data-text', whites[x]);
		}
	},
	draw_end: function(){
		dom.createElem('button', { appendTo: dom.getElemById('content'), id: 'playAgain', className: 'rightButton', textContent: 'Play Again' });
		dom.createElem('button', { appendTo: dom.getElemById('content'), id: 'scores', className: 'rightButton', textContent: 'Scores' });

		dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'blackCard', innerHTML: this.state.black });

		if(this.state.winners.length > 1) dom.createElem('div', { appendTo: dom.getElemById('content'), className: 'banner', textContent: 'TIE' });

		this.state.winners.forEach((winner) => {
			dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'whiteCard', innerHTML: winner.submission +'<br><br>-'+ winner.player });
		});
	},
	draw_waiting: function(){
		game.waiting = true;

		dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'waitingHeading', textContent: 'Waiting on...' });

		var playersList = dom.createElem('ul', { appendTo: dom.getElemById('content'), id: 'playersList' });

		for(var x = 0; x < this.state.playerCount; ++x){
			var playerName = this.state.playerNames[x];

			if(!this.state.players[playerName] || this.state.players[playerName].type === 'view' || { inactive: 1, done: 1 }[this.state.players[playerName].state]) continue;

			var li = dom.createElem('li', { appendTo: playersList, className: 'player', textContent: playerName });
			var colorSwatch = dom.createElem('span', { className: 'colorSwatch', appendTo: li });

			colorSwatch.style.backgroundColor = this.playerColor(playerName);
		}
	},
	draw_scores: function(){
		dom.createElem('button', { appendTo: dom.getElemById('content'), id: 'playAgain', className: 'rightButton', textContent: 'Play Again' });

		var scoresList = dom.createElem('ul', { appendTo: dom.getElemById('content'), id: 'scoresList' });

		for(var x = 0; x < this.state.playerCount; ++x){
			var playerName = this.state.playerNames[x];

			if(!this.state.players[playerName] || this.state.players[playerName].type === 'view') continue;

			var li = dom.createElem('li', { appendTo: scoresList, className: 'player', textContent: `${playerName}: ${this.state.players[playerName].score}` });
			var colorSwatch = dom.createElem('span', { className: 'colorSwatch', appendTo: li });

			colorSwatch.style.backgroundColor = this.playerColor(playerName);
		}
	}
};

dom.onLoad(function onLoad(){
	game.room = dom.location.query.get('room') || dom.storage.get('room');
	game.player = {
		name: dom.location.query.get('name') || dom.storage.get('player_name')
	};

	if(!game.room || !game.player.name){
		log()(`[play] Missing player or room: player=${game.player.name} room=${game.room} ... Returning to lobby`);

		return dom.location.change('/lobby');
	}

	history.replaceState({}, document.title, '/play');

	log()(`[play] Game room: ${game.room}`);

	socketClient.on('open', function(){
		socketClient.reply('join_room', { room: 'play', name: game.player.name, gameRoom: game.room });
	});

	socketClient.on('join_room', function(payload){
		if(payload.err){
			log()(`[play] Error joining room ... Returning to lobby`, game.room, payload);

			return dom.location.change('/lobby');
		}

		dom.storage.set('room', game.room);

		game.options = payload.options;
	});

	socketClient.on('player_submission', function(payload){
		if(payload.err && game.options.editField){
			dom.remove(document.getElementsByClassName('validationWarning'));

			dom.createElem('p', { className: 'validationWarning', textContent: payload.err, appendTo: game.submissionEntry.parentElement });

			game.submissionEntry.classList.remove('validated');
			game.submissionEntry.classList.add('invalid');
		}
	});

	socketClient.on('player_update', function(payload){
		if(payload.name && payload.name !== game.player.name) return;

		log()('[play] player_update', payload);

		game.player.state = payload.state;
		if(payload.hand) game.player.hand = payload.hand;

		if(game.state) game.draw();
	});

	socketClient.on('player_nudge', function(vibration = 200){
		if(navigator.vibrate) navigator.vibrate(parseInt(vibration));
	});

	socketClient.on('game_update', function(data){
		log()('[play] game_update', data);

		var reDraw = game.waiting || ((game.state && game.state.stage === data.stage) && { submissions: 1, voting: 1 }[data.stage]) ? false : true;

		game.state = data;

		if(data.stage === 'end') socketClient.ws.close();

		if(reDraw) game.draw();

		else if(data.stage === 'submissions' && document.getElementById('vetoBlackDisplay')) document.getElementById('vetoBlackDisplay').textContent = `${data.vetoVotes}/${data.activePlayers}`;
	});

	dom.interact.on('pointerUp', (evt) => {
		if(evt.target.id === 'leave'){
			evt.preventDefault();

			dom.location.change('/lobby');
		}

		else if(evt.target.id === 'ready'){
			evt.preventDefault();

			socketClient.reply('player_update', { state: 'done' });
		}

		else if(evt.target.id === 'playAgain'){
			evt.preventDefault();

			dom.location.change(`/play?room=${game.room}&name=${encodeURIComponent(game.player.name)}`);
		}

		else if(evt.target.id === 'scores'){
			evt.preventDefault();

			game.draw('scores');
		}

		else if(evt.target.id === 'clear'){
			evt.preventDefault();

			game.submissionEntry.value = '';
			dom.validate(game.submissionEntry);
		}

		else if(evt.target.id === 'vetoBlackButton'){
			evt.preventDefault();

			socketClient.reply('player_update', { state: 'veto' });
		}

		else if(evt.target.id === 'enterSubmission'){
			evt.preventDefault();

			if(game.trashing){
				socketClient.reply('player_update', { state: 'done', trash: Object.keys(game.trash) });

				delete game.trash;
				delete game.trashing;
			}

			else{
				if(game.options.editField){
					var warnings = dom.showValidationWarnings(dom.getElemById('submissionEntryWrapper'));

					if(warnings) return;

					socketClient.reply('player_update', { state: 'done', submission: game.submissionEntry.value });
				}

				else{
					socketClient.reply('player_update', { state: 'done', submission: document.getElementById('whitesList').querySelector('.selected').dataset.text });
				}
			}
		}

		else if(evt.target.id === 'confirmVote'){
			evt.preventDefault();

			socketClient.reply('player_update', { state: 'done', vote: game.player.vote });
		}

		else if(evt.target.id === 'trashWhites'){
			evt.preventDefault();

			game.trashing = !game.trashing;

			evt.target.classList[game.trashing ? 'add' : 'remove']('selected');

			if(!game.trashing) dom.classList(document.getElementById('whitesList').children, 'remove', 'selected');

			else game.trash = {};
		}

		else if(evt.target.parentElement && evt.target.parentElement.id === 'playersList'){
			evt.preventDefault();

			socketClient.reply('player_nudge', { name: evt.target.textContent });
		}

		else if(evt.target.parentElement && evt.target.parentElement.id === 'whitesList'){
			evt.preventDefault();

			if(!game.trashing){
				if(evt.target.parentElement.getElementsByClassName('selected')[0]) evt.target.parentElement.getElementsByClassName('selected')[0].classList.remove('selected');

				evt.target.classList.add('selected');
			}

			if(game.trashing){
				if(evt.target.classList.contains('selected')) game.trash[evt.target.innerHTML] = 1;

				else delete game.trash[evt.target.innerHTML];

				evt.target.classList[evt.target.classList.contains('selected') ? 'remove' : 'add']('selected');
			}

			else if(game.state.stage === 'voting'){
				game.player.vote = evt.target.getAttribute('data-text');
			}

			else if(game.options.editField){
				game.submissionEntry.value = evt.target.getAttribute('data-text');
				dom.validate(game.submissionEntry);
			}
		}
	});

	dom.mobile.detect();

	socketClient.init();

	dom.setTitle('[humanity] Play');
});