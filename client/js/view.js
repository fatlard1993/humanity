// includes dom log socket-client _common js-util
// babel
/* global dom log socketClient playerColor util */

const view = {
	draw: function(){
		dom.empty(dom.getElemById('content'));

		dom.createElem('button', { id: 'leave', className: 'leftButton', textContent: 'Leave', appendTo: dom.getElemById('content') });

		this[`draw_${this.state.stage}`]();
	},
	draw_new: function(){
		var playersList = dom.createElem('ul', { appendTo: dom.getElemById('content'), id: 'playersList' });

		for(var x = 0; x < this.state.playerCount; ++x){
			var playerName = this.state.playerNames[x];

			if(!this.state.players[playerName] || this.state.players[playerName].type === 'view' || this.state.players[playerName].state === 'inactive') continue;

			var li = dom.createElem('li', { className: `player${this.state.players[playerName].state === 'done' ? ' ready' : ''}`, textContent: playerName });
			var colorSwatch = dom.createElem('span', { className: 'colorSwatch', appendTo: li });

			colorSwatch.style.backgroundColor = playerColor(playerName);

			playersList.appendChild(li);
		}
	},
	draw_submissions: function(){
		if(document.getElementById('whitesPile')) return;

		if(this.options.submissionTimer) dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'gameTimer' });

		dom.createElem('div', { id: 'blackCard', innerHTML: this.state.black, appendTo: dom.getElemById('content') });
		dom.createElem('div', { id: 'whitesPile', appendTo: dom.getElemById('content') });

		dom.maintenance.run();

		view.updateWhitesPile();
	},
	draw_voting: function(){
		if(this.options.voteTimer) dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'gameTimer' });

		dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'blackCard', innerHTML: this.state.black });

		var whitesList = dom.createElem('ul', { appendTo: dom.getElemById('content'), id: 'whitesList' });

		var whites = Object.keys(this.state.submissions), whiteCount = whites.length;

		for(var x = 0; x < whiteCount; ++x){
			var li = dom.createElem('li', { appendTo: whitesList, innerHTML: whites[x] });

			li.setAttribute('data-text', whites[x]);
		}
	},
	draw_end: function(){
		dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'blackCard', innerHTML: this.state.black });

		//todo show ties
		dom.createElem('div', { appendTo: dom.getElemById('content'), id: 'whiteCard', innerHTML: this.state.winner.submission +'<br><br>-'+ this.state.winner.player });

		var whitesList = dom.createElem('ul', { appendTo: dom.getElemById('content'), id: 'whitesList' });

		var whites = Object.keys(this.state.submissions), whiteCount = whites.length;

		for(var x = 0; x < whiteCount; ++x){
			var li = dom.createElem('li', { appendTo: whitesList, innerHTML: whites[x] });

			li.setAttribute('data-text', whites[x]);
		}
	},
	updateWhitesPile: function(){
		var whitesPile = document.getElementById('whitesPile');

		if(!whitesPile) return;

		for(var x = whitesPile.children.length, count = Object.keys(view.state.submissions).length; x < count; ++x){
			(function(){
				var card = dom.createElem('div', { appendTo: whitesPile });

				setTimeout(function(){
					card.style.top = util.rand(5, 40) +'%';
					card.style.left = util.rand(5, 80) +'%';
					card.style.transform = 'rotate('+ util.rand(-30, 70) +'deg)';
					// dom.setTransform(card, `translate(${util.rand(5, 40)}%, ${util.rand(5, 80)}%) rotate(${util.rand(-30, 70)}deg)`);
				}, 20);
			})();
		}
	},
	whitesPileFix: function(){
		if(!document.getElementById('whitesPile')) return;

		var height = dom.availableHeight - document.getElementById('blackCard').clientHeight - 100;

		document.getElementById('whitesPile').style.height = height +'px';
	}
};

dom.onLoad(function onLoad(){
	view.room = dom.location.query.get('room') || dom.storage.get('room');
	view.name = dom.location.query.get('name') || dom.storage.get('player_name');

	history.replaceState({}, document.title, '/view');

	socketClient.on('open', function(){
		socketClient.reply('join_room', { room: 'view', name: view.name, gameRoom: view.room });
	});

	socketClient.on('join_room', function(payload){
		if(payload.err){
			log()(`[view] Error joining room ... Returning to lobby`, view.room, payload);

			return dom.location.change('/lobby');
		}

		dom.storage.set('room', view.room);

		view.options = payload.options;
	});

	socketClient.on('player_submission', function(payload){
		log()('[view] player_submission', payload);
	});

	socketClient.on('player_update', function(payload){
		log()('[view] player_update', payload);
	});

	socketClient.on('game_update', function(data){
		log()('[view] game_update', data);

		view.state = data;

		if(document.getElementById('whitesPile') && view.state.stage === 'submissions') view.updateWhitesPile();

		else if(!document.getElementById('whitesList') && view.state.stage === 'voting') setTimeout(() => { view.draw(); }, 2000);

		else view.draw();
	});

	dom.interact.on('pointerUp', (evt) => {
		if(evt.target.id === 'leave'){
			evt.preventDefault();

			dom.location.change('/lobby');
		}

		log()(evt);
	});

	dom.maintenance.init([view.whitesPileFix]);

	dom.mobile.detect();

	socketClient.init();

	dom.setTitle('[humanity] View');
});