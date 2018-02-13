/* global Cjs, Dom, Log, Socket, Interact */

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var games;
	var packs;
	var createdGame = false;
	var currentView = 'main';

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

			var nameInput = Dom.createElem('input', { type: 'text', id: 'NewGameRoomName', placeholder: 'Room Name', validation: /^.{4,32}$/ });
			Dom.validate(nameInput);

			var submissionTimer = Dom.createElem('input', { type: 'text', id: 'NewGameSubmissionTimer', placeholder: '0 :: Submission Timer 0-128 sec', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(submissionTimer);

			var voteTimer = Dom.createElem('input', { type: 'text', id: 'NewGameVoteTimer', placeholder: '0 :: Vote Timer 0-128 sec', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(voteTimer);

			var whiteCardCount = Dom.createElem('input', { type: 'text', id: 'NewGameWhiteCardCount', placeholder: '7 :: Whites 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(whiteCardCount);

			var npcCount = Dom.createElem('input', { type: 'text', id: 'NewGameNPCCount', placeholder: '0 :: NPCs 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(npcCount);

			var lastManOut = Dom.createElem('button', { id: 'NewGameLastManOut', className: 'toggle', textContent: 'Enable Last Man Out' });

			var fillInMissing = Dom.createElem('button', { id: 'NewGameFillInMissing', className: 'toggle', textContent: 'Enable Fill In Missing' });

			var editFieldToggle = Dom.createElem('button', { id: 'NewGameEditField', className: 'toggle selected', textContent: 'Enable Edit Field' });

			var persistentWhites = Dom.createElem('button', { id: 'NewGamePersistentWhites', className: 'toggle selected', textContent: 'Enable Persistent Whites' });

			var recordCustomWhites = Dom.createElem('button', { id: 'NewGameRecordCustomWhites', className: 'toggle', textContent: 'Enable Record Custom Whites' });

			var packsList = Dom.createElem('ul', { id: 'PacksList' });
			var packCount = packs.length;

			for(var x = 0; x < packCount; ++x){
				var li = Dom.createElem('li', { className: 'pack', textContent: packs[x] });

				packsList.appendChild(li);
			}

			var createButton = Dom.createElem('button', { id: 'NewGameCreateButton', textContent: 'Create' });
			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			newGameForm.appendChild(nameInput);
			newGameForm.appendChild(submissionTimer);
			newGameForm.appendChild(voteTimer);
			newGameForm.appendChild(whiteCardCount);
			newGameForm.appendChild(npcCount);
			newGameForm.appendChild(lastManOut);
			newGameForm.appendChild(fillInMissing);
			newGameForm.appendChild(editFieldToggle);
			newGameForm.appendChild(persistentWhites);
			newGameForm.appendChild(recordCustomWhites);
			newGameForm.appendChild(packsList);
			newGameForm.appendChild(createButton);
			newGameForm.appendChild(lobbyButton);
			Dom.Content.appendChild(newGameForm);

			nameInput.focus();
		},
		existing_game: function(name){
			var title = Dom.createElem('div', { className: 'gameTitle', textContent: name });

			var viewButton = Dom.createElem('button', { id: 'ViewButton', textContent: 'View' });
			var playButton = Dom.createElem('button', { id: 'PlayButton', textContent: 'Play' });
			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			Dom.Content.appendChild(title);
			Dom.Content.appendChild(viewButton);
			Dom.Content.appendChild(playButton);
			Dom.Content.appendChild(lobbyButton);
		}
	};

	function onSocketMessage(data){
		console.log(data);

		if(data.command === 'challenge'){
			Socket.active.send('{ "command": "challenge_response", "room": "lobby" }');
		}

		else if(data.command === 'challenge_accept' || data.command === 'lobby_reload'){
			games = data.games;

			packs = data.packs;

			if(data.command === 'lobby_reload' && createdGame) return Dom.draw('existing_game', createdGame);

			if(currentView === 'main') Dom.draw();
		}
	}

	function createNewGame(){
		if(!document.querySelectorAll('.invalid').length){
			Dom.Content = Dom.Content || document.getElementById('Content');

			createdGame = document.getElementById('NewGameRoomName').value;
			var submissionTimer = document.getElementById('NewGameSubmissionTimer').value;
			var voteTimer = document.getElementById('NewGameVoteTimer').value;
			var whiteCardCount = document.getElementById('NewGameWhiteCardCount').value;
			var npcCount = document.getElementById('NewGameNPCCount').value;

			var lastManOut = document.getElementById('NewGameLastManOut').className.includes('selected');
			var fillInMissing = document.getElementById('NewGameFillInMissing').className.includes('selected');
			var editField = document.getElementById('NewGameEditField').className.includes('selected');
			var persistentWhites = document.getElementById('NewGamePersistentWhites').className.includes('selected');
			var recordCustomWhites = document.getElementById('NewGameRecordCustomWhites').className.includes('selected');

			submissionTimer = submissionTimer.length ? parseInt(submissionTimer) : 0;
			voteTimer = voteTimer.length ? parseInt(voteTimer) : 0;
			whiteCardCount = whiteCardCount.length ? parseInt(whiteCardCount) : 7;
			npcCount = npcCount.length ? parseInt(npcCount) : 0;

			var newGamePacksList = [];

			var packsList = document.getElementById('PacksList');
			var packNames = Object.keys(packsList.children), packCount = packNames.length;

			for(var x = 0; x < packCount; ++x){
				if(packsList.children[x].className.includes('selected')) newGamePacksList.push(packsList.children[x].textContent);
			}

			newGamePacksList = newGamePacksList.length ? newGamePacksList : ['base'];

			var options = {
				name: createdGame,
				packs: newGamePacksList,
				submissionTimer: submissionTimer,
				voteTimer: voteTimer,
				whiteCardCount: whiteCardCount,
				npcCount: npcCount,
				lastManOut: lastManOut,
				fillInMissing: fillInMissing,
				editField: editField,
				persistentWhites: persistentWhites,
				recordCustomWhites: recordCustomWhites
			};

			Log()(createdGame, options);

			Socket.active.send(JSON.stringify({ command: 'lobby_new_game', options: options }));

			Dom.empty(Dom.Content);
		}
	}

	Dom.draw = function draw(view){
		currentView = view || 'main';

		Dom.Content = Dom.Content || document.getElementById('Content');

		Dom.empty(Dom.Content);

		Dom.setTitle('humanity - lobby');

		views[currentView](arguments[1]);
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

		else if(evt.target.className.includes('toggle')){
			evt.preventDefault();

			Log()(evt.target.textContent);

			evt.target.className = evt.target.className.includes('selected') ? 'toggle' : 'toggle selected';
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

		else if(evt.target.id === 'LobbyButton'){
			evt.preventDefault();

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location.reload();
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