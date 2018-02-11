/* global Cjs, Dom, Log, Socket, Interact */

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var x;

	var Player = {
		room: Dom.location.query.get('room')
	};

	var Game = {
		currentBlack: '',
		currentView: '',
		currentWhites: [],
		players: [],
		playersReady: []
	};

	var views = {
		main: function(){
			var joinGameForm = Dom.createElem('div', { id: 'JoinGameForm' });

			var cachedName = Dom.cookie.get('player_name');

			var nameInput = Dom.createElem('input', { id: 'JoinGameName', placeholder: 'Your Name', validation: /^.{4,32}$/, value: cachedName ? cachedName : '' });
			Dom.validate(nameInput);

			var joinButton = Dom.createElem('button', { id: 'JoinGameButton', textContent: 'Join' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			joinGameForm.appendChild(nameInput);
			joinGameForm.appendChild(joinButton);
			joinGameForm.appendChild(lobbyButton);
			Dom.Content.appendChild(joinGameForm);

			nameInput.focus();
		},
		start_screen: function(){
			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });
			var startButton = Dom.createElem('button', { id: 'GameStartButton', textContent: 'Start' });

			var playersList = Dom.createElem('ul', { id: 'PlayersList' });

			Dom.Content.appendChild(lobbyButton);
			Dom.Content.appendChild(startButton);
			Dom.Content.appendChild(playersList);

			drawPlayersList();
		},
		enter_submission: function(){
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var submissionWrapper = Dom.createElem('div', { id: 'SubmissionEntryWrapper' });

			var submissionInput = Dom.createElem('input', { id: 'SubmissionEntry', validation: /^.{1,256}$/ });
			Dom.validate(submissionInput);

			var emptySubmissionButton = Dom.createElem('button', { id: 'EmptySubmissionEntry', textContent: 'Clear' });

			var doneButton = Dom.createElem('button', { id: 'EnterSubmission', textContent: 'Done' });

			var whitesList = Dom.createElem('ul', { id: 'WhitesList' });
			var whiteCount = Game.currentWhites.length;

			for(x = 0; x < whiteCount; ++x){
				var li = Dom.createElem('li', { className: 'white', textContent: Game.currentWhites[x] });

				whitesList.appendChild(li);
			}

			submissionWrapper.appendChild(submissionInput);
			submissionWrapper.appendChild(emptySubmissionButton);
			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionWrapper);
			Dom.Content.appendChild(doneButton);
			Dom.Content.appendChild(whitesList);

			submissionInput.focus();
		},
		waiting_room: function(){
			var waitingHeading = Dom.createElem('div', { id: 'WaitingHeading', textContent: 'Waiting...' });

			var playersList = Dom.createElem('ul', { id: 'WaitingOnPlayersList' });

			Dom.Content.appendChild(waitingHeading);
			Dom.Content.appendChild(playersList);
		},
		vote: function(submissions){
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack +'<br><br>Vote for your favorite!' });

			var submissionList = Dom.createElem('ul', { id: 'SubmissionList' });
			var submissionCount = submissions.length;

			if(!submissionCount){
				var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

				currentBlackHeading.textContent = 'No one is playing here';

				Dom.Content.appendChild(currentBlackHeading);
				Dom.Content.appendChild(lobbyButton);

				return;
			}

			for(x = 0; x < submissionCount; ++x){
				submissionList.appendChild(Dom.createElem('li', { className: 'submission' + (submissions[x].submission === Player.submission ? ' disabled' : ''), textContent: submissions[x].submission }));
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionList);
		},
		vote_results: function(submissions){
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var submissionList = Dom.createElem('ul', { id: 'SubmissionList' });
			var submissionNames = Object.keys(submissions), submissionCount = submissionNames.length;

			var playAgainButton = Dom.createElem('button', { id: 'PlayAgainButton', textContent: 'Play Again' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			for(x = 0; x < submissionCount; ++x){
				var li = Dom.createElem('li', { className: 'submission_result', textContent: 'Votes: '+ submissions[submissionNames[x]].count });
				li.appendChild(Dom.createElem('span', { innerHTML: submissionNames[x] +'<br>- '+ submissions[submissionNames[x]].player + (submissions[submissionNames[x]].winner ? '		WINNER' : '') }));

				submissionList.appendChild(li);
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionList);
			Dom.Content.appendChild(playAgainButton);
			Dom.Content.appendChild(lobbyButton);

			Socket.disconnect();
		}
	};

	function onSocketMessage(data){
		Log()(data);

		if(data.command === 'challenge'){
			Socket.active.send('{ "command": "challenge_response", "room": "player", "game_room": "'+ Player.room +'" }');
		}

		else if(data.command === 'challenge_accept'){
			Game.players = data.players;

			Dom.draw();
		}

		else if(data.command === 'player_join_accept'){
			Game.currentBlack = data.black;
			Game.players = data.players;
			Game.currentWhites = data.whites;

			if(data.state === 'voting') Dom.draw('vote', data.submissions);

			else if(data.state === 'entering_submissions') Dom.draw('enter_submission');

			else Dom.draw('start_screen');
		}

		else if(data.command === 'player_join'){
			if(data.name === Player.name) return;

			Game.players.push(data.name);

			drawPlayersList();
		}

		else if(data.command === 'player_leave'){
			Game.players.splice(Game.players.indexOf(data.name), 1);

			if(Game.playersReady.includes(data.name)) Game.playersReady.splice(Game.playersReady.indexOf(data.name), 1);

			drawPlayersList();
		}

		if(!data.room || !Player.room || data.room !== Player.room || Game.currentView === 'main' ||	Game.currentView === 'vote_results') return;

		if(data.command === 'player_start_voting'){
			Dom.draw('vote', data.submissions);
		}

		else if(data.command === 'player_vote_results'){
			Dom.draw('vote_results', data.votes);
		}

		else if(data.command === 'player_new_whites'){
			Game.currentWhites = data.whites;

			var whitesList = document.getElementById('WhitesList');
			var whiteCount = Game.currentWhites.length;

			if(!whitesList) return;

			Dom.empty(whitesList);

			for(x = 0; x < whiteCount; ++x){
				var li = Dom.createElem('li', { className: 'white', textContent: Game.currentWhites[x] });

				whitesList.appendChild(li);
			}
		}

		else if(data.command === 'player_ready'){
			var playersList = document.getElementById('PlayersList');
			var playerCount = playersList.children.length;

			Game.playersReady.push(data.name);

			for(x = 0; x < playerCount; ++x){
				var player_li = playersList.children[x];

				if(player_li.textContent.replace(' (you)', '') === data.name) player_li.textContent += ' READY';
			}
		}

		else if(data.command === 'player_start_entering_submissions'){
			Dom.draw('enter_submission');
		}
	}

	function drawPlayersList(){
		var playersList = document.getElementById('PlayersList');
		var playerCount = Game.players.length;

		if(!playersList) return;

		Dom.empty(playersList);

		for(x = 0; x < playerCount; ++x){
			var playerNameText = Game.players[x] === Player.name ? Game.players[x] +' (you)' : Game.players[x];
			if(Game.playersReady.includes(Game.players[x])) playerNameText += ' READY';
			var player_li = Dom.createElem('li', { className: 'player', textContent: playerNameText });

			playersList.appendChild(player_li);
		}
	}

	function joinGame(){
		if(!document.querySelectorAll('.invalid').length){
			var nameInput = document.getElementById('JoinGameName');

			if(Game.players.includes(nameInput.value)){
				nameInput.className = nameInput.className.replace(/\svalidated|\sinvalid/g, '') + ' invalid';

				return;
			}

			Player.name = nameInput.value;

			Dom.cookie.set('player_name', Player.name);

			Socket.active.send('{ "command": "player_join", "game_room": "'+ Player.room +'", "playerName": "'+ Player.name +'" }');

			Dom.draw('waiting_room');
		}
	}

	function enterSubmission(){
		if(!document.querySelectorAll('.invalid').length){
			var submission = document.getElementById('SubmissionEntry').value;

			Player.submission = submission;

			Socket.active.send('{ "command": "player_enter_submission", "submission": "'+ submission.replace(/"/gm, '\\"') +'" }');

			Dom.draw('waiting_room');
		}
	}

	function voteOnSubmission(submission){
		Socket.active.send('{ "command": "player_place_vote", "vote": "'+ submission.replace(/"/gm, '\\"') +'" }');

		Dom.draw('waiting_room');
	}

	Dom.draw = function draw(view){
		Dom.Content = Dom.Content || document.getElementById('Content');

		Dom.empty(Dom.Content);

		Dom.setTitle('humanity - player');

		Game.currentView = view || 'main';

		views[view || 'main'](arguments[1]);
	};

	Interact.onPointerUp = function(evt){
		Log()(evt);

		if(evt.target.id === 'JoinGameButton'){
			evt.preventDefault();

			joinGame();
		}

		else if(evt.target.id === 'GameStartButton'){
			evt.preventDefault();

			Dom.remove(evt.target);

			Socket.active.send('{ "command": "player_ready_to_play" }');
		}

		else if(evt.target.id === 'PlayAgainButton'){
			evt.preventDefault();

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location.reload();

			// Socket.active.send('{ "command": "player_play_again" }');
		}

		else if(evt.target.id === 'LobbyButton'){
			evt.preventDefault();

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/lobby';
		}

		else if(evt.target.id === 'EnterSubmission'){
			evt.preventDefault();

			enterSubmission();
		}

		else if(evt.target.className === 'white'){
			evt.preventDefault();

			var submissionInput = document.getElementById('SubmissionEntry');

			submissionInput.value = evt.target.textContent;
			Dom.validate(submissionInput);

			Socket.active.send('{ "command": "player_remove_white", "text": "'+ evt.target.textContent.replace(/"/gm, '\\"') +'" }');
		}

		else if(evt.target.className === 'submission'){
			evt.preventDefault();

			voteOnSubmission(evt.target.textContent);
		}

		else if(evt.target.id === 'EmptySubmissionEntry'){
			evt.preventDefault();

			document.getElementById('SubmissionEntry').value = '';
			Dom.validate(document.getElementById('SubmissionEntry'));
		}
	};

	Interact.onKeyUp = function(evt, keyPressed){
		if(keyPressed === 'ENTER'){
			if(document.getElementById('JoinGameButton')){
				evt.preventDefault();

				joinGame();
			}

			else if(document.getElementById('EnterSubmission')){
				evt.preventDefault();

				enterSubmission();
			}
		}
	};

	Socket.init(null, onSocketMessage);
}

document.addEventListener('DOMContentLoaded', Load);