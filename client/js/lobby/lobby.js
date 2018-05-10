/* global Cjs, Dom, Log, WS, Interact */

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

			var submissionTimer = Dom.createElem('input', { type: 'text', id: 'NewGameSubmissionTimer', placeholder: '0 :: Submission Timer 0-128 sec', validation: /(^([0-9]{1,2}|1[01][0-9]|12[0-8])$)|(^(?![\s\S]))/ });
			Dom.validate(submissionTimer);

			var voteTimer = Dom.createElem('input', { type: 'text', id: 'NewGameVoteTimer', placeholder: '0 :: Vote Timer 0-128 sec', validation: /(^([0-9]{1,2}|1[01][0-9]|12[0-8])$)|(^(?![\s\S]))/ });
			Dom.validate(voteTimer);

			var whiteCardCount = Dom.createElem('input', { type: 'text', id: 'NewGameWhiteCardCount', placeholder: '7 :: Whites 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(whiteCardCount);

			var npcCount = Dom.createElem('input', { type: 'text', id: 'NewGameNPCCount', placeholder: '0 :: NPCs 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(npcCount);

			var winGoal = Dom.createElem('input', { type: 'text', id: 'NewGameWinGoal', placeholder: '5 :: Win Goal 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(winGoal);

			var pointGoal = Dom.createElem('input', { type: 'text', id: 'NewGamePointGoal', placeholder: '50 :: Point Goal 0-128', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/ });
			Dom.validate(pointGoal);

			var lastManOut = Dom.createElem('button', { id: 'NewGameLastManOut', className: 'toggle', textContent: 'Enable Last Man Out' });

			var fillInMissing = Dom.createElem('button', { id: 'NewGameFillInMissing', className: 'toggle', textContent: 'Enable Fill In Missing' });

			var editFieldToggle = Dom.createElem('button', { id: 'NewGameEditField', className: 'toggle selected', textContent: 'Enable Edit Field' });

			var persistentWhites = Dom.createElem('button', { id: 'NewGamePersistentWhites', className: 'toggle selected', textContent: 'Enable Persistent Whites' });

			var recordCustomWhites = Dom.createElem('button', { id: 'NewGameRecordCustomWhites', className: 'toggle', textContent: 'Enable Record Custom Whites' });

			var selectAllPacks = Dom.createElem('button', { id: 'SelectAllPacks', textContent: 'Select All Packs' });

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
			newGameForm.appendChild(winGoal);
			newGameForm.appendChild(pointGoal);
			newGameForm.appendChild(lastManOut);
			newGameForm.appendChild(fillInMissing);
			newGameForm.appendChild(editFieldToggle);
			newGameForm.appendChild(persistentWhites);
			newGameForm.appendChild(recordCustomWhites);
			newGameForm.appendChild(selectAllPacks);
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

	function createNewGame(){
		if(!document.querySelectorAll('.invalid').length){
			Dom.Content = Dom.Content || document.getElementById('Content');

			createdGame = document.getElementById('NewGameRoomName').value;
			var submissionTimer = document.getElementById('NewGameSubmissionTimer').value;
			var voteTimer = document.getElementById('NewGameVoteTimer').value;
			var whiteCardCount = document.getElementById('NewGameWhiteCardCount').value;
			var npcCount = document.getElementById('NewGameNPCCount').value;
			var winGoal = document.getElementById('NewGameWinGoal').value;
			var pointGoal = document.getElementById('NewGamePointGoal').value;

			var lastManOut = document.getElementById('NewGameLastManOut').className.includes('selected');
			var fillInMissing = document.getElementById('NewGameFillInMissing').className.includes('selected');
			var editField = document.getElementById('NewGameEditField').className.includes('selected');
			var persistentWhites = document.getElementById('NewGamePersistentWhites').className.includes('selected');
			var recordCustomWhites = document.getElementById('NewGameRecordCustomWhites').className.includes('selected');

			submissionTimer = submissionTimer.length ? parseInt(submissionTimer) : 0;
			voteTimer = voteTimer.length ? parseInt(voteTimer) : 0;
			whiteCardCount = whiteCardCount.length ? parseInt(whiteCardCount) : 7;
			npcCount = npcCount.length ? parseInt(npcCount) : 0;
			winGoal = winGoal.length ? parseInt(winGoal) : 5;
			pointGoal = pointGoal.length ? parseInt(pointGoal) : 50;

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
				winGoal: winGoal,
				pointGoal: pointGoal,
				lastManOut: lastManOut,
				fillInMissing: fillInMissing,
				editField: editField,
				persistentWhites: persistentWhites,
				recordCustomWhites: recordCustomWhites
			};

			Log()(createdGame, options);

			WS.send({ command: 'lobby_new_game', options: options });

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

	Interact.onPointerUp.push(function(evt){
		console.log(evt);

		if(evt.target.id === 'NewGame'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Log()(evt.target.textContent);

			Dom.draw('new_game');
		}

		else if(evt.target.className === 'game'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Log()(evt.target.textContent);

			// Dom.draw('existing_game', evt.target.children[0].textContent);
			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/player?room='+ evt.target.children[0].textContent;
		}

		else if(evt.target.id === 'SelectAllPacks'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			var packItems = document.querySelectorAll('li.pack');
			var selectedCount = document.querySelectorAll('li.pack.selected').length;
			var packCount = packs.length;
			var selectBool = selectedCount < packCount;

			for(var x = 0; x < packCount; ++x){
				packItems[x].className = 'pack'+ (selectBool ? ' selected' : '');
			}

			evt.target.textContent = (selectBool ? 'Uns' : 'S') +'elect All Packs';
		}

		else if(evt.target.className.includes('pack')){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Log()(evt.target.textContent);

			evt.target.className = evt.target.className.includes('selected') ? 'pack' : 'pack selected';
		}

		else if(evt.target.className.includes('toggle')){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Log()(evt.target.textContent);

			evt.target.className = evt.target.className.includes('selected') ? 'toggle' : 'toggle selected';
		}

		else if(evt.target.id === 'NewGameCreateButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			createNewGame();
		}

		else if(evt.target.id === 'ViewButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/viewer';
		}

		else if(evt.target.id === 'PlayButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/player?room='+ document.getElementsByClassName('gameTitle')[0].textContent;

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);
		}

		else if(evt.target.id === 'LobbyButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location.reload();
		}
	});

	Interact.onKeyUp.push(function(evt, keyPressed){
		if(keyPressed === 'ENTER'){
			if(document.getElementById('NewGameCreateButton')){
				evt.preventDefault();

				createNewGame();
			}
		}
	});

	WS.onmessage = function(data){
		console.log(data);

		if(data.command === 'challenge_accept' || data.command === 'lobby_reload'){
			games = data.games;
			packs = Cjs.sortArrAlphaNumeric(data.packs);

			if(WS.reconnecting){
				WS.reconnecting = false;

				WS.flushQueue();

				if(currentView === 'main') Dom.draw();
			}

			else if(data.command === 'lobby_reload' && createdGame) window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/player?room='+ createdGame;

			else if(currentView === 'main') Dom.draw();
		}
	};

	WS.room = 'lobby';

	WS.connect();
}

document.addEventListener('DOMContentLoaded', Load);