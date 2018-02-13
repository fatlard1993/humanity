/* global Cjs, Dom, Log, Socket, Interact */

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var x;

	var Player = {
		room: Dom.location.query.get('room'),
		usedWhite: ''
	};

	var Game = {
		currentBlack: '',
		currentView: '',
		currentWhites: [],
		players: [],
		readyPlayers: [],
		waitingOn: []
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

			var submissionInput = Dom.createElem('input', { type: 'text', id: 'SubmissionEntry', validation: /^.{1,256}$/ });
			if(!Game.options.editField) submissionInput.disabled = 'true';
			Dom.validate(submissionInput);

			var emptySubmissionButton = Dom.createElem('button', { id: 'EmptySubmissionEntry', textContent: 'Clear' });

			var doneButton = Dom.createElem('button', { id: 'EnterSubmission', textContent: 'Done' });

			var whitesList = Dom.createElem('ul', { id: 'WhitesList' });

			if(Game.options.submissionTimer){
				var gameTimer = Dom.createElem('div', { id: 'GameTimer' });

				Dom.Content.appendChild(gameTimer);

				updateGameTimer(Game.options.submissionTimer);
			}

			submissionWrapper.appendChild(submissionInput);
			submissionWrapper.appendChild(emptySubmissionButton);
			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionWrapper);
			Dom.Content.appendChild(doneButton);
			Dom.Content.appendChild(whitesList);

			drawWhitesList();

			submissionInput.focus();
		},
		waiting_room: function(){
			var waitingHeading = Dom.createElem('div', { id: 'WaitingHeading', textContent: 'Waiting on...' });

			var waitingOnPlayersList = Dom.createElem('ul', { id: 'WaitingOnPlayersList' });

			var waitingOnPlayerCount = Game.waitingOn.length;

			for(x = 0; x < waitingOnPlayerCount; ++x){
				var li = Dom.createElem('li', { textContent: Game.waitingOn[x] });

				waitingOnPlayersList.appendChild(li);
			}

			Dom.Content.appendChild(waitingHeading);
			Dom.Content.appendChild(waitingOnPlayersList);
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
				var isPlayerSubmission = submissions[x].submission === Player.submission;
				var li = Dom.createElem('li', { className: 'submission' + (isPlayerSubmission ? ' disabled' : ''), innerHTML: submissions[x].submission });

				li.setAttribute('data-text', submissions[x].submission);

				submissionList[isPlayerSubmission ? 'insertBefore' : 'appendChild'](li, isPlayerSubmission && submissionList.children.length ? submissionList.children[0] : null);
			}

			if(Game.options.voteTimer){
				var gameTimer = Dom.createElem('div', { id: 'GameTimer' });

				Dom.Content.appendChild(gameTimer);

				updateGameTimer(Game.options.voteTimer);
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionList);
		},
		vote_results: function(submissions){
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var submissionList = Dom.createElem('ul', { id: 'SubmissionList' });
			var submissionNames = Object.keys(submissions), submissionCount = submissionNames.length;

			var playAgainButton = Dom.createElem('button', { id: 'PlayAgainButton', textContent: 'Play Again' });

			var scoresButton = Dom.createElem('button', { id: 'ScoresButton', textContent: 'Scores' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			for(x = 0; x < submissionCount; ++x){
				var li = Dom.createElem('li', { className: 'submission_result', textContent: 'Votes: '+ submissions[submissionNames[x]].count });
				var winnerText = '		'+ (submissions[submissionNames[x]].player === Game.winner ? 'BIG ' : '') + (submissions[submissionNames[x]].winner ? 'WINNER' : '');
				li.appendChild(Dom.createElem('span', { innerHTML: submissionNames[x] +'<br>- '+ submissions[submissionNames[x]].player + winnerText }));

				submissionList[submissions[submissionNames[x]].winner ? 'insertBefore' : 'appendChild'](li, submissions[submissionNames[x]].winner && submissionList.children.length ? submissionList.children[0] : null);
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionList);
			Dom.Content.appendChild(scoresButton);
			if(!Game.winner) Dom.Content.appendChild(playAgainButton);
			Dom.Content.appendChild(lobbyButton);
		},
		scores: function(){
			var scoresList = Dom.createElem('ul', { id: 'ScoresList' });
			var scoreNames = Object.keys(Game.scores), scoreCount = scoreNames.length;

			for(x = 0; x < scoreCount; ++x){
				var li = Dom.createElem('li', { textContent: 'Player:\t'+ scoreNames[x] +'\nWins:\t'+ Game.scores[scoreNames[x]].wins +'\nWinning Votes:\t'+ Game.scores[scoreNames[x]].winningVotes +'\nTotal Votes:\t'+ Game.scores[scoreNames[x]].votes +'\nTotal Points:\t'+ Game.scores[scoreNames[x]].points });

				scoresList.appendChild(li);
			}

			var playAgainButton = Dom.createElem('button', { id: 'PlayAgainButton', textContent: 'Play Again' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			Dom.Content.appendChild(scoresList);
			if(!Game.winner) Dom.Content.appendChild(playAgainButton);
			Dom.Content.appendChild(lobbyButton);
		}
	};

	function onSocketMessage(data){
		Log()(data);

		if(data.command === 'challenge'){
			Socket.active.send('{ "command": "challenge_response", "room": "player", "game_room": "'+ Player.room +'" }');
		}

		else if(data.command === 'challenge_accept'){
			Game.players = data.players;
			Game.readyPlayers = data.readyPlayers;

			Dom.draw();
		}

		else if(data.command === 'player_join_accept'){
			Game.currentBlack = data.black;
			Game.currentWhites = data.whites;
			Game.players = data.players;
			Game.readyPlayers = data.readyPlayers;
			Game.options = data.options;

			if(data.state === 'voting') Dom.draw('vote', data.submissions);

			else if(data.state === 'entering_submissions') Dom.draw('enter_submission');

			else Dom.draw('start_screen');
		}

		else if(data.command === 'player_join'){
			if(data.name === Player.name) return;

			Game.players.push(data.name);

			drawPlayersList();
		}

		else if(data.command === 'player_ready'){
			var playersList = document.getElementById('PlayersList');

			Game.readyPlayers.push(data.name);

			if(!playersList) return;

			var playerCount = playersList.children.length;

			for(x = 0; x < playerCount; ++x){
				var player_li = playersList.children[x];

				if(player_li.textContent === data.name) player_li.textContent += ' READY';
			}
		}

		else if(data.command === 'player_leave'){
			Game.players.splice(Game.players.indexOf(data.name), 1);

			if(Game.readyPlayers.includes(data.name)) Game.readyPlayers.splice(Game.readyPlayers.indexOf(data.name), 1);

			drawPlayersList();
		}

		else if(data.command === 'player_new_white'){
			Game.currentWhites.push(data.white);

			drawWhitesList();
		}

		if(!data.room || !Player.room || data.room !== Player.room || Game.currentView === 'main' ||	Game.currentView === 'vote_results') return;

		if(data.command === 'player_start_entering_submissions'){
			Dom.draw('enter_submission');
		}

		else if(data.command === 'player_start_voting'){
			Dom.draw('vote', data.submissions);
		}

		else if(data.command === 'player_vote_results'){
			Game.scores = data.scores;
			Game.winner = data.gameWinner;

			Dom.draw('vote_results', data.votes);
		}

		else if(data.command === 'player_waiting_on'){
			var waitingOnPlayersList = document.getElementById('WaitingOnPlayersList');

			Game.waitingOn = data.players;

			var waitingOnPlayerCount = data.players.length;

			if(!waitingOnPlayersList) return;

			Dom.empty(waitingOnPlayersList);

			for(x = 0; x < waitingOnPlayerCount; ++x){
				var li = Dom.createElem('li', { textContent: data.players[x] });

				waitingOnPlayersList.appendChild(li);
			}
		}
	}

	function updateGameTimer(timeLeft){
		var gameTimer = document.getElementById('GameTimer');

		if(!gameTimer) return;

		gameTimer.textContent = timeLeft +' Seconds Remaining';

		if(timeLeft === 0) return;

		setTimeout(function(){
			updateGameTimer(timeLeft - 1);
		}, 1000);
	}

	function drawPlayersList(){
		var playersList = document.getElementById('PlayersList');
		var playerCount = Game.players.length;

		if(!playersList) return;

		Dom.empty(playersList);

		for(x = 0; x < playerCount; ++x){
			var playerNameText = Game.players[x];
			if(Game.readyPlayers.includes(Game.players[x])) playerNameText += ' READY';
			var player_li = Dom.createElem('li', { className: 'player'+ (Game.players[x] === Player.name ? ' disabled' : ''), textContent: playerNameText });

				playersList[Game.players[x] === Player.name ? 'insertBefore' : 'appendChild'](player_li, Game.players[x] === Player.name && playersList.children.length ? playersList.children[0] : null);
		}
	}

	function drawWhitesList(){
		var whitesList = document.getElementById('WhitesList');
		var whiteCount = Game.currentWhites.length;

		if(!whitesList) return;

		Dom.empty(whitesList);

		for(x = 0; x < whiteCount; ++x){
			var li = Dom.createElem('li', { className: 'white', innerHTML: Game.currentWhites[x] });
			li.setAttribute('data-text', Game.currentWhites[x]);

			whitesList.appendChild(li);
		}
	}

	function joinGame(){
		if(!document.querySelectorAll('.invalid').length){
			var nameInput = document.getElementById('JoinGameName');

			if(Game.players.includes(nameInput.value)){
				nameInput.className = nameInput.className.replace(/\svalidated|\sinvalid/g, '') + ' invalid';

				return;
			}

			Dom.Content = Dom.Content || document.getElementById('Content');

			Player.name = nameInput.value;

			Dom.cookie.set('player_name', Player.name);

			Socket.active.send('{ "command": "player_join", "game_room": "'+ Player.room +'", "playerName": "'+ Player.name +'" }');

			Dom.empty(Dom.Content);
		}
	}

	function enterSubmission(){
		if(!document.querySelectorAll('.invalid').length){
			var submission = document.getElementById('SubmissionEntry').value;

			Player.submission = submission;

			var submissionCommand = {
				command: 'player_enter_submission',
				submission: submission
			};

			if(submission !== Player.usedWhite) submissionCommand.customWhite = true;

			if(Player.usedWhite.length){
				Socket.active.send(JSON.stringify({ command: 'player_use_white', text: Player.usedWhite }));
				Player.usedWhite = '';
			}

			Socket.active.send(JSON.stringify(submissionCommand));

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

		else if(evt.target.id === 'ScoresButton'){
			evt.preventDefault();

			Dom.draw('scores');
		}

		else if(evt.target.id === 'PlayAgainButton'){
			evt.preventDefault();

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			Socket.active.send('{ "command": "player_play_again" }');
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
			var whiteText = evt.target.getAttribute('data-text');

			submissionInput.value = whiteText;
			Dom.validate(submissionInput);

			Player.usedWhite = whiteText;
		}

		else if(evt.target.className === 'submission'){
			evt.preventDefault();

			voteOnSubmission(evt.target.getAttribute('data-text'));
		}

		else if(evt.target.id === 'EmptySubmissionEntry'){
			evt.preventDefault();

			document.getElementById('SubmissionEntry').value = '';
			Dom.validate(document.getElementById('SubmissionEntry'));

			Player.usedWhite = '';
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

		else if(evt.target.id === 'SubmissionEntry' && keyPressed === 'BACK_SPACE' && evt.target.value.length < 5){
			Player.usedWhite = '';
		}
	};

	Socket.init(null, onSocketMessage);
}

document.addEventListener('DOMContentLoaded', Load);