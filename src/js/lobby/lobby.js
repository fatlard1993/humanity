/* global Cjs, Dom, Log, Socket, Interact */

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var games;
	var packs;
	var createdGame = false;

	var views = {
		main: function(){
			var gamesList = Dom.createElem('ul', { id: 'GamesList' });
			var gameNames = Object.keys(games), gameCount = gameNames.length;

			gamesList.appendChild(Dom.createElem('li', { id: 'NewGame', className: 'game', textContent: 'New Game' }));

			for(var x = 0; x < gameCount; ++x){
				var li = Dom.createElem('li', { className: 'game', textContent: games[gameNames[x]].players.length });
				li.appendChild(Dom.createElem('span', { textContent: gameNames[x] }));

				gamesList.appendChild(li);
			}

			Dom.Content.appendChild(gamesList);
		},
		new_game: function(){
			var newGameForm = Dom.createElem('div', { id: 'NewGameForm' });

			var nameInput = Dom.createElem('input', { id: 'NewGameRoomName', placeholder: 'Room Name', validation: /.{4,}/ });
			Dom.validate(nameInput);

			var timerInput = Dom.createElem('input', { id: 'NewGameTimer', placeholder: 'Timer (1-10 min, def: 2)', validation: /(^([1-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(timerInput);

			var packsList = Dom.createElem('ul', { id: 'PacksList' });
			var packCount = packs.length;

			for(var x = 0; x < packCount; ++x){
				var li = Dom.createElem('li', { className: 'pack', textContent: packs[x] });

				packsList.appendChild(li);
			}

			var createButton = Dom.createElem('button', { id: 'NewGameCreateButton', textContent: 'Create' });

			newGameForm.appendChild(nameInput);
			newGameForm.appendChild(timerInput);
			newGameForm.appendChild(packsList);
			newGameForm.appendChild(createButton);
			Dom.Content.appendChild(newGameForm);

			nameInput.focus();
		},
		existing_game: function(name){
			var title = Dom.createElem('div', { className: 'gameTitle', textContent: name });

			var viewButton = Dom.createElem('button', { id: 'ViewButton', textContent: 'View' });
			var playButton = Dom.createElem('button', { id: 'PlayButton', textContent: 'Play' });

			Dom.Content.appendChild(title);
			Dom.Content.appendChild(viewButton);
			Dom.Content.appendChild(playButton);
		}
	};

	function onSocketMessage(data){
		console.log(data);

		if(data.command === 'challenge'){
			Socket.active.send('{ "command": "challenge_response", "room": "lobby" }');
		}

		else if(data.command === 'challenge_accept' || data.command === 'reload_lobby'){
			games = data.games;

			packs = data.packs;

			if(data.command === 'reload_lobby' && createdGame) return Dom.draw('existing_game', createdGame);

			Dom.draw();
		}
	}

	function createNewGame(){
		if(!document.querySelectorAll('.invalid').length){
			Dom.Content = Dom.Content || document.getElementById('Content');

			createdGame = document.getElementById('NewGameRoomName').value;
			var newGameTimer = document.getElementById('NewGameTimer').value;
			var newGamePacksList = [];

			var packsList = document.getElementById('PacksList');
			var packNames = Object.keys(packsList.children), packCount = packNames.length;

			newGameTimer = typeof newGameTimer === 'number' ? newGameTimer : 2;

			for(var x = 0; x < packCount; ++x){
				if(packsList.children[x].className.includes('selected')) newGamePacksList.push(packsList.children[x].textContent);
			}

			Log()(createdGame, newGamePacksList);

			Socket.active.send(JSON.stringify({ command: 'new_game', name: createdGame, timer: newGameTimer, packs: newGamePacksList }));

			Dom.empty(Dom.Content);
		}
	}

	Dom.draw = function draw(view){
		Dom.Content = Dom.Content || document.getElementById('Content');

		Dom.empty(Dom.Content);

		Dom.setTitle('humanity - lobby');

		views[view || 'main'](arguments[1]);
	};

	Interact.onPointerUp = function(evt){
		console.log(evt);

		if(evt.target.id === 'NewGame'){
			evt.preventDefault();

			Log()(evt.target.textContent);

			Dom.draw('new_game');
		}

		else if(evt.target.className === 'game'){
			evt.preventDefault();

			Log()(evt.target.textContent);

			Dom.draw('existing_game', evt.target.children[0].textContent);
		}

		else if(evt.target.className.includes('pack')){
			evt.preventDefault();

			Log()(evt.target.textContent);

			evt.target.className = evt.target.className.includes('selected') ? 'pack' : 'pack selected';
		}

		else if(evt.target.id === 'NewGameCreateButton'){
			evt.preventDefault();

			createNewGame();
		}

		else if(evt.target.id === 'ViewButton'){
			evt.preventDefault();

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/viewer';
		}

		else if(evt.target.id === 'PlayButton'){
			evt.preventDefault();

			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/player?room='+ document.getElementsByClassName('gameTitle')[0].textContent;

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);
		}
	};

	Interact.onKeyUp = function(evt, keyPressed){
		if(keyPressed === 'ENTER'){
			if(document.getElementById('NewGameCreateButton')){
				evt.preventDefault();

				createNewGame();
			}
		}
	};

	Socket.init(null, onSocketMessage);
}

document.addEventListener('DOMContentLoaded', Load);