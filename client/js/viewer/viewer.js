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

	var Game, Room = Dom.location.query.get('room');

	View.views = {
		new: function(){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Waiting for game to start' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			var playersList = Dom.createElem('ul', { id: 'PlayersList' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(lobbyButton);
			Dom.Content.appendChild(playersList);

			drawPlayersList();
		},
		entering_submissions: function(){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Entering Submissions' });

			var currentBlackCard = Dom.createElem('div', { id: 'BigBlack', innerHTML: Game.black });

			var currentWhitesPile = Dom.createElem('div', { id: 'WhitesPile' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(currentBlackCard);
			Dom.Content.appendChild(currentWhitesPile);

			Dom.maintenance.run();

			setTimeout(drawWhitesPile, 500);
		},
		voting: function(){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Voting' });

			var currentBlackCard = Dom.createElem('div', { id: 'BigBlack', innerHTML: Game.black });

			var currentWhitesList = Dom.createElem('div', { id: 'WhitesList' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(currentBlackCard);
			Dom.Content.appendChild(currentWhitesList);

			for(var x = 0; x < Game.whites.length; ++x){
				var card = Dom.createElem('div', {
					innerHTML: Game.whites[x].submission
				});

				currentWhitesList.appendChild(card);
			}
		},
		vote_results: function(){
			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			var currentHeading = Dom.createElem('div', { id: 'Heading', textContent: 'Vote Results' });

			var currentBlackCard = Dom.createElem('div', { id: 'BigBlack', innerHTML: Game.black });

			var currentWhitesList = Dom.createElem('div', { id: 'WhitesList' });

			Dom.Content.appendChild(currentHeading);
			Dom.Content.appendChild(currentBlackCard);
			Dom.Content.appendChild(currentWhitesList);

			for(var x = 0; x < Game.whites.length; ++x){
				var card = Dom.createElem('div', {
					innerHTML: Game.whites[x].submission,
					appendChild: Dom.createElem('span', { textContent: '- '+ Game.whites[x].player })
				});

				currentWhitesList.appendChild(card);
			}
		}
	};

	function drawPlayersList(){
		var playersList = document.getElementById('PlayersList');
		var playerCount = Game.players.length;

		if(!playersList) return;

		Dom.empty(playersList);

		for(var x = 0; x < playerCount; ++x){
			var playerNameText = Game.players[x], playerReady;
			if(Game.readyPlayers.includes(Game.players[x])){
				playerNameText += ' READY';
				playerReady = true;
			}
			var player_li = Dom.createElem('li', { className: 'player'+ (playerReady ? ' ready' : ''), textContent: playerNameText });

			player_li.style.backgroundColor = Cjs.stringToColor(Game.players[x]);

			playersList.appendChild(player_li);
		}
	}

	function drawWhitesPile(){
		var currentWhitesPile = document.getElementById('WhitesPile');

		for(var x = 0; x < Game.whites.length - currentWhitesPile.children.length; ++x){
			var card = Dom.createElem('div');

			currentWhitesPile.appendChild(card);

			setTimeout(function(){
				card.style.top = Cjs.rand(5, 80) +'%';
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
		var command = data.command;
		data = data.data;

		if(command === 'update'){
			Log()(command, data);

			Game = data;

			if(Game.view === 'entering_submissions' && View.current === Game.view){
				drawWhitesPile();
			}

			else if(Game.view === 'voting' && View.current === 'entering_submissions'){
				drawWhitesPile();

				setTimeout(function(){
					View.draw(Game.view);
				}, 2000);
			}

			else View.draw(Game.view);
		}

		else if(command === 'player_vote_results'){
			Log()(command, data);
		}
	};

	WS.room = 'viewer_'+ Room;

	WS.connect();

	View.init('?');
}

document.addEventListener('DOMContentLoaded', Load);