/* global Dom, Log, WS, Interact, Cjs, View */

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var wakelock;

	if(window.navigator.getWakeLock){
		wakelock = window.navigator.getWakeLock('screen');
		wakelock.createRequest();
	}

	var Room = Dom.location.query.get('room');
	var viewUpdate_TO;

	View.views = {
		new: function(data){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Waiting for game to start' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			var playersList = Dom.createElem('ul', { id: 'PlayersList' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(lobbyButton);
			Dom.Content.appendChild(playersList);

			drawPlayersList(data);
		},
		entering_submissions: function(data){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Entering Submissions' });

			var currentBlackCard = Dom.createElem('div', { id: 'BigBlack', innerHTML: data.black });

			var currentWhitesPile = Dom.createElem('div', { id: 'WhitesPile' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(currentBlackCard);
			Dom.Content.appendChild(currentWhitesPile);

			Dom.maintenance.run();

			setTimeout(function(){
				drawWhitesPile(data);
			}, 500);
		},
		voting: function(data){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Voting' });

			var currentBlackCard = Dom.createElem('div', { id: 'BigBlack', innerHTML: data.black });

			var currentWhitesList = Dom.createElem('div', { id: 'WhitesList' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(currentBlackCard);
			Dom.Content.appendChild(currentWhitesList);

			for(var x = 0; x < data.whites.length; ++x){
				var card = Dom.createElem('div', {
					innerHTML: data.whites[x].submission
				});

				currentWhitesList.appendChild(card);
			}
		},
		vote_results: function(data){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Vote Results' });

			var currentBlackCard = Dom.createElem('div', { id: 'BigBlack', innerHTML: data.black });

			var currentWhitesList = Dom.createElem('div', { id: 'WhitesList' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(currentBlackCard);
			Dom.Content.appendChild(currentWhitesList);

			for(var x = 0; x < data.whites.length; ++x){
				var card = Dom.createElem('div', {
					className: data.votes[data.whites[x].submission] && data.votes[data.whites[x].submission].winner ? 'winner' : '',
					innerHTML: data.whites[x].submission,
					appendChild: Dom.createElem('span', { textContent: '- '+ data.whites[x].player })
				});

				currentWhitesList[data.whites[x].player === data.winner ? 'insertBefore' : 'appendChild'](card, data.whites[x].player === data.winner && currentWhitesList.children.length ? currentWhitesList.children[0] : null);
			}
		}
	};

	function drawPlayersList(data){
		var playersList = document.getElementById('PlayersList');

		if(!playersList) return;

		Dom.empty(playersList);

		var playerCount = data.players.length, playerNameText, playerReady, li, x;

		for(x = 0; x < playerCount; ++x){
			playerNameText = data.players[x];
			playerReady = false;

			if(data.readyPlayers.includes(data.players[x])){
				playerNameText += ' READY';
				playerReady = true;
			}

			li = Dom.createElem('li', { className: 'player'+ (playerReady ? ' ready' : ''), textContent: playerNameText });

			li.style.backgroundColor = Cjs.stringToColor(data.players[x]);

			playersList.appendChild(li);
		}
	}

	function drawWhitesPile(data){
		var currentWhitesPile = document.getElementById('WhitesPile');

		for(var x = 0; x < data.whites.length - (currentWhitesPile && currentWhitesPile.children ? currentWhitesPile.children.length : 0); ++x){
			var card = Dom.createElem('div');

			currentWhitesPile.appendChild(card);

			setTimeout(function(){
				card.style.top = Cjs.rand(5, 40) +'%';
				card.style.left = Cjs.rand(5, 80) +'%';
				card.style.transform = 'rotate('+ Cjs.rand(-30, 70) +'deg)';
			}, 10);
		}
	}

	Interact.onPointerUp.push(function(evt){
		Log()(evt);

		if(evt.target.id === 'LobbyButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Dom.changeLocation('/lobby');
		}
	});

	WS.onmessage = function(data){
		var command = data.command, change;
		data = data.data;

		if(command === 'update'){
			Log()(command, data);

			if(viewUpdate_TO) clearTimeout(viewUpdate_TO);

			if(!View.current) change = 'now';

			else if(data.view === 'new' && data.players.length){
				if(data.view === View.current) drawPlayersList(data);

				else change = 'now';
			}

			else if(data.view === 'entering_submissions' && View.current === data.view) drawWhitesPile(data);

			else if(data.view === 'entering_submissions') change = 'now';

			else if(data.view === 'voting' && View.current === 'entering_submissions'){
				drawWhitesPile(data);

				change = 'delay';
			}

			else if(data.view === 'voting') change = 'now';

			else if(data.view === 'vote_results') change = 'now';

			if(change === 'delay'){
				viewUpdate_TO = setTimeout(function(){
					View.draw(data.view, data);
				}, 2000);
			}
			else if(change === 'now'){
				View.draw(data.view, data);
			}
		}
	};

	WS.room = 'viewer_'+ Room;

	WS.connect();

	View.init('?');
}

document.addEventListener('DOMContentLoaded', Load);