/* global Dom, Log, WS, Interact */

var Vibrate = window.navigator.vibrate || window.navigator.webkitVibrate || window.navigator.mozVibrate || window.navigator.msVibrate;

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var wakelock;

	if(window.navigator.getWakeLock) wakelock = window.navigator.getWakeLock('screen');

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
			var startButton = Dom.createElem('button', { id: 'GameStartButton', textContent: 'Ready' });

			var playersList = Dom.createElem('ul', { id: 'PlayersList' });

			Dom.Content.appendChild(lobbyButton);
			if(!Player.ready) Dom.Content.appendChild(startButton);
			Dom.Content.appendChild(playersList);

			drawPlayersList();
		},
		enter_submission: function(){
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var vetoBlackDisplay = Dom.createElem('div', { id: 'VetoBlackDisplay', textContent: '0/'+ Game.players.length });

			var vetoBlackButton = Dom.createElem('button', { id: 'VetoBlackButton' });

			var submissionWrapper = Dom.createElem('div', { id: 'SubmissionEntryWrapper' });

			var submissionInput = Dom.createElem('input', { type: 'text', id: 'SubmissionEntry', validation: /^.{1,256}$/ });
			if(!Game.options.editField) submissionInput.disabled = 'true';
			Dom.validate(submissionInput);

			var emptySubmissionButton = Dom.createElem('button', { id: 'EmptySubmissionEntry', textContent: 'Clear' });

			var trashWhiteCards = Dom.createElem('button', { id: 'TrashWhiteCards', textContent: 'Skip Turn & Trash Whites' });

			var doneButton = Dom.createElem('button', { id: 'EnterSubmission', textContent: 'Submit' });

			var whitesList = Dom.createElem('ul', { id: 'WhitesList' });

			if(Game.options.submissionTimer){
				var gameTimer = Dom.createElem('div', { id: 'GameTimer' });

				Dom.Content.appendChild(gameTimer);

				updateGameTimer(Game.options.submissionTimer);
			}

			submissionWrapper.appendChild(submissionInput);
			submissionWrapper.appendChild(emptySubmissionButton);

			currentBlackHeading.appendChild(vetoBlackDisplay);
			currentBlackHeading.appendChild(vetoBlackButton);

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionWrapper);
			Dom.Content.appendChild(doneButton);
			Dom.Content.appendChild(whitesList);
			Dom.Content.appendChild(trashWhiteCards);

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
			var voteConfirmButton = Dom.createElem('button', { id: 'VoteConfirmButton', textContent: 'Confirm Vote' });
			var submissionCount = submissions.length;

			// if(submissionCount <= 1){
			// 	var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			// 	currentBlackHeading.textContent = 'No one is playing here';

			// 	Dom.Content.appendChild(currentBlackHeading);
			// 	Dom.Content.appendChild(lobbyButton);

			// 	return;
			// }

			Player.cantVote = 1;

			for(x = 0; x < submissionCount; ++x){
				if(!submissions[x].submission.length) continue;

				var isPlayerSubmission = submissions[x].submission === Player.submission;
				var li = Dom.createElem('li', { className: 'submission' + (isPlayerSubmission ? ' disabled' : ''), innerHTML: submissions[x].submission });

				li.setAttribute('data-text', submissions[x].submission);

				submissionList[isPlayerSubmission ? 'insertBefore' : 'appendChild'](li, isPlayerSubmission && submissionList.children.length ? submissionList.children[0] : null);

				if(!isPlayerSubmission) Player.cantVote = 0;
			}

			if(Player.cantVote) voteConfirmButton.textContent = 'Continue';

			if(Game.options.voteTimer){
				var gameTimer = Dom.createElem('div', { id: 'GameTimer' });

				Dom.Content.appendChild(gameTimer);

				updateGameTimer(Game.options.voteTimer);
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(voteConfirmButton);
			Dom.Content.appendChild(submissionList);
		},
		vote_results: function(submissions){
			Player.ready = 0;
			Player.submission = 0;
			Player.placedVote = 0;

			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var submissionList = Dom.createElem('ul', { id: 'SubmissionList' });
			var submissionNames = Object.keys(submissions), submissionCount = submissionNames.length;

			var playAgainButton = Dom.createElem('button', { id: 'PlayAgainButton', textContent: Game.winner ? 'Join New Game' : 'Keep Playing' });

			var scoresButton = Dom.createElem('button', { id: 'ScoresButton', textContent: 'Scores' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			for(x = 0; x < submissionCount; ++x){
				var li = Dom.createElem('li', { className: 'submission_result'+ (submissions[submissionNames[x]].player === Game.winner ? ' big_winner' : (submissions[submissionNames[x]].winner ? ' winner' : '')), textContent: 'Votes: '+ submissions[submissionNames[x]].count });
				var winnerText = '		'+ (submissions[submissionNames[x]].player === Game.winner ? 'GAME ' : '') + (submissions[submissionNames[x]].winner ? 'WINNER' : '');
				li.appendChild(Dom.createElem('span', { innerHTML: submissionNames[x] +'<br>- '+ submissions[submissionNames[x]].player + winnerText }));

				submissionList[submissions[submissionNames[x]].winner ? 'insertBefore' : 'appendChild'](li, submissions[submissionNames[x]].winner && submissionList.children.length ? submissionList.children[0] : null);
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionList);
			Dom.Content.appendChild(scoresButton);
			Dom.Content.appendChild(playAgainButton);
			Dom.Content.appendChild(lobbyButton);

			if(wakelock) wakelock.cancel();

			screen.keepAwake = 0;
		},
		scores: function(){
			var scoresList = Dom.createElem('ul', { id: 'ScoresList' });
			var scoreNames = Object.keys(Game.scores), scoreCount = scoreNames.length;

			for(x = 0; x < scoreCount; ++x){
				var li = Dom.createElem('li', { textContent: 'Player:\t'+ scoreNames[x] +'\nWins:\t'+ Game.scores[scoreNames[x]].wins +'\nWinning Votes:\t'+ Game.scores[scoreNames[x]].winningVotes +'\nTotal Votes:\t'+ Game.scores[scoreNames[x]].votes +'\nTotal Points:\t'+ Game.scores[scoreNames[x]].points });

				if(scoreNames[x] === Player.name) li.className = 'selected';

				scoresList.appendChild(li);
			}

			var playAgainButton = Dom.createElem('button', { id: 'PlayAgainButton', textContent: Game.winner ? 'Join New Game' : 'Keep Playing' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			Dom.Content.appendChild(scoresList);
			Dom.Content.appendChild(playAgainButton);
			Dom.Content.appendChild(lobbyButton);
		}
	};

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
			var playerNameText = Game.players[x], playerReady;
			if(Game.readyPlayers.includes(Game.players[x])){
				playerNameText += ' READY';
				playerReady = true;
			}
			var player_li = Dom.createElem('li', { className: 'player'+ (Game.players[x] === Player.name ? ' disabled' : '') + (playerReady ? ' ready' : ''), textContent: playerNameText });

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

			if(Game.activePlayers.includes(nameInput.value)){
				nameInput.className = nameInput.className.replace(/\svalidated|\sinvalid/g, '') +' invalid';

				return;
			}

			Dom.Content = Dom.Content || document.getElementById('Content');

			Player.name = nameInput.value;

			Dom.cookie.set('player_name', Player.name);

			WS.send({ command: 'player_join', game_room: Player.room, playerName: Player.name });

			Dom.empty(Dom.Content);
		}
	}

	function enterSubmission(){
		if(Game.trashingWhiteCards || !document.querySelectorAll('.invalid').length){
			var submission = document.getElementById('SubmissionEntry').value;

			Player.submission = submission;

			var submissionCommand = {
				command: 'player_enter_submission',
				submission: submission
			};

			if(submission !== Player.usedWhite) submissionCommand.customWhite = true;

			WS.send(submissionCommand);

			if(Player.usedWhite.length){
				WS.send({ command: 'player_use_white', text: Player.usedWhite });
				Player.usedWhite = '';
			}

			Dom.draw('waiting_room');
		}
	}

	function voteOnSubmission(submission){
		Player.placedVote = 1;

		Player.cantVote = 0;

		WS.send({ command: 'player_place_vote', vote: submission });

		Dom.draw('waiting_room');
	}

	function updateVetoDisplay(count){
		var vetoBlackDisplay = document.getElementById('VetoBlackDisplay');

		if(!vetoBlackDisplay) return;

		var vetoCount = parseInt(vetoBlackDisplay.textContent.split('/')[0]);

		vetoCount += count || 0;

		vetoBlackDisplay.textContent = vetoCount +'/'+ Game.players.length;
	}

	Dom.draw = function draw(view){
		Dom.Content = Dom.Content || document.getElementById('Content');

		Dom.empty(Dom.Content);

		Dom.setTitle('humanity - player');

		Game.currentView = view || 'main';

		views[view || 'main'](arguments[1]);
	};

	Interact.onPointerUp.push(function(evt){
		Log()(evt);

		if(evt.target.id === 'JoinGameButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			joinGame();
		}

		else if(evt.target.id === 'GameStartButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			if(wakelock) wakelock.createRequest();

			screen.keepAwake = 1;

			Dom.remove(evt.target);

			Player.ready = 1;

			WS.send({ command: 'player_ready_to_play' });
		}

		else if(evt.target.id === 'ScoresButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Dom.draw('scores');
		}

		else if(evt.target.id === 'PlayAgainButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			WS.send({ command: 'player_play_again' }, 1);
		}

		else if(evt.target.id === 'LobbyButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/lobby';
		}

		else if(evt.target.id === 'EnterSubmission'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			enterSubmission();
		}

		else if(evt.target.className === 'white'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			var whiteText = evt.target.getAttribute('data-text');

			if(Game.trashingWhiteCards){
				Dom.remove(evt.target);

				WS.send({ command: 'player_use_white', text: whiteText });
			}

			else{
				var submissionInput = document.getElementById('SubmissionEntry');

				submissionInput.value = whiteText;
				Dom.validate(submissionInput);

				Player.usedWhite = whiteText;
			}
		}

		else if(evt.target.className === 'submission'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Log()(evt.target.textContent);

			var oldSelection = document.querySelector('.selected');

			if(oldSelection) oldSelection.className = 'submission';

			Player.vote = evt.target.getAttribute('data-text');

			evt.target.className = 'submission selected';
		}

		else if(evt.target.id === 'VoteConfirmButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			if(Player.vote || Player.cantVote) voteOnSubmission(Player.vote);
		}

		else if(evt.target.id === 'EmptySubmissionEntry'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			document.getElementById('SubmissionEntry').value = '';
			Dom.validate(document.getElementById('SubmissionEntry'));

			Player.usedWhite = '';
		}

		else if(evt.target.id === 'VetoBlackButton' && evt.target.className !== 'active'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			evt.target.className = 'active';

			WS.send({ command: 'veto_black' });

			updateVetoDisplay(1);
		}

		else if(evt.target.id === 'TrashWhiteCards'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Game.trashingWhiteCards = true;

			document.getElementById('CurrentBlackHeading').appendChild(Dom.createElem('div', { textContent: '\n\n - Trashing White Cards - ' }));

			document.getElementById('EnterSubmission').textContent = 'Done Trashing';
			Dom.remove(evt.target);

			var submissionEntryField = document.getElementById('SubmissionEntry');

			submissionEntryField.value = '';
			Dom.validate(submissionEntryField, 1);

			Player.usedWhite = '';

			submissionEntryField.disabled = true;
		}

		else if(evt.target.parentElement.id === 'WaitingOnPlayersList'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			WS.send({ command: 'player_bump', player: evt.target.textContent });
		}
	});

	Interact.onKeyUp.push(function(evt, keyPressed){
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
	});

	WS.onmessage = function(data){
		if(data.command === 'challenge_accept'){
			Game.players = data.players;
			Game.readyPlayers = data.readyPlayers;
			Game.activePlayers = data.activePlayers;

			if(WS.reconnecting){
				WS.reconnecting = false;

				if(WS.disconnectedQueue.length) WS.flushQueue();

				else if(['start_screen', 'enter_submission', 'waiting_room', 'vote'].includes(Game.currentView)) WS.send({ command: 'player_join', game_room: Player.room, playerName: Player.name });

				// else if(Game.currentView !== 'main') Dom.draw();
			}

			else Dom.draw();
		}

		else if(data.command === 'player_join_accept'){
			Game.currentBlack = data.black;
			Game.currentWhites = data.whites;
			Game.players = data.players;
			Game.readyPlayers = data.readyPlayers;
			Game.activePlayers = data.activePlayers;
			Game.options = data.options;
			Player.submission = data.submission;

			Player.ready = 1;
			Game.trashingWhiteCards = false;

			if(Player.retry_command){
				WS.send(Player.retry_command);

				delete Player.retry_command;
			}

			else if(data.state === 'voting'){
				if(Game.readyPlayers.includes(Player.name) || Player.placedVote) Dom.draw('waiting_room');

				else Dom.draw('vote', data.submissions);
			}

			else if(data.state === 'entering_submissions'){
				if(Player.submission) Dom.draw('waiting_room');

				else if(Game.currentView !== 'enter_submission') Dom.draw('enter_submission');
			}

			else{
				Player.ready = 0;

				Dom.draw('start_screen');
			}
		}

		else if(data.command === 'rejoin_request'){
			if(!Player.name || !Player.room) return Dom.draw('main');

			Player.retry_command = data.retry_command;

			WS.send({ command: 'player_join', game_room: Player.room, playerName: Player.name });
		}

		else if(data.command === 'player_waiting_on' && Game.currentView === 'main'){
			Game.activePlayers = data.activePlayers;
		}

		else if(data.command === 'player_vote_results' && Game.currentView === 'start_screen'){
			Dom.draw('start_screen');
		}

		else if(data.command === 'player_join'){
			if(data.name === Player.name) return;

			Game.players.push(data.name);

			drawPlayersList();
			updateVetoDisplay();
		}

		else if(data.command === 'player_ready'){
			var playersList = document.getElementById('PlayersList');

			Game.readyPlayers.push(data.name);

			if(!playersList) return;

			var playerCount = playersList.children.length;

			for(x = 0; x < playerCount; ++x){
				var player_li = playersList.children[x];

				if(player_li.textContent === data.name){
					player_li.textContent += ' READY';
					player_li.className += ' ready';
				}
			}
		}

		else if(data.command === 'player_leave'){
			Game.players.splice(Game.players.indexOf(data.name), 1);

			if(Game.readyPlayers.includes(data.name)) Game.readyPlayers.splice(Game.readyPlayers.indexOf(data.name), 1);

			drawPlayersList();
			updateVetoDisplay();
		}

		else if(data.command === 'player_new_whites'){
			Game.currentWhites = data.whites;

			drawWhitesList();
		}

		if(!data.room || !Player.room || data.room !== Player.room || Game.currentView === 'main' ||	Game.currentView === 'vote_results' ||	Game.currentView === 'scores') return;

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

		else if(data.command === 'veto_black' && data.player !== Player.name){
			updateVetoDisplay(1);
		}

		else if(data.command === 'player_bump' && data.player === Player.name){
			if(Vibrate) Vibrate(300);
		}
	};

	WS.room = 'player_'+ Player.room;

	WS.connect();
}

document.addEventListener('DOMContentLoaded', Load);