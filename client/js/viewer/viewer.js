/* global Dom, Log, WS, Interact */

var Vibrate = window.navigator.vibrate || window.navigator.webkitVibrate || window.navigator.mozVibrate || window.navigator.msVibrate;

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var wakelock;

	if(window.navigator.getWakeLock) wakelock = window.navigator.getWakeLock('screen');

	var Game = {
		room: Dom.location.query.get('room'),
		currentBlack: '',
		currentView: '',
		currentWhites: [],
		players: [],
		readyPlayers: [],
		waitingOn: []
	};

	var views = {
		waiting_room: function(){
			var waitingHeading = Dom.createElem('div', { id: 'WaitingHeading', textContent: 'Waiting on...' });

			var waitingOnPlayersList = Dom.createElem('ul', { id: 'WaitingOnPlayersList' });

			var waitingOnPlayerCount = Game.waitingOn.length;

			for(var x = 0; x < waitingOnPlayerCount; ++x){
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

			for(var x = 0; x < submissionCount; ++x){
				if(!submissions[x].submission.length) continue;

				var li = Dom.createElem('li', { className: 'submission', innerHTML: submissions[x].submission });

				li.setAttribute('data-text', submissions[x].submission);

				submissionList.appendChild(li);
			}

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
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var submissionList = Dom.createElem('ul', { id: 'SubmissionList' });
			var submissionNames = Object.keys(submissions), submissionCount = submissionNames.length;

			var playAgainButton = Dom.createElem('button', { id: 'PlayAgainButton', textContent: Game.winner ? 'Join New Game' : 'Keep Playing' });

			var scoresButton = Dom.createElem('button', { id: 'ScoresButton', textContent: 'Scores' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Back to Lobby' });

			for(var x = 0; x < submissionCount; ++x){
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

			for(var x = 0; x < scoreCount; ++x){
				var li = Dom.createElem('li', { textContent: 'Player:\t'+ scoreNames[x] +'\nWins:\t'+ Game.scores[scoreNames[x]].wins +'\nWinning Votes:\t'+ Game.scores[scoreNames[x]].winningVotes +'\nTotal Votes:\t'+ Game.scores[scoreNames[x]].votes +'\nTotal Points:\t'+ Game.scores[scoreNames[x]].points });

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

		for(var x = 0; x < playerCount; ++x){
			var playerNameText = Game.players[x], playerReady;
			if(Game.readyPlayers.includes(Game.players[x])){
				playerNameText += ' READY';
				playerReady = true;
			}
			var player_li = Dom.createElem('li', { className: 'player'+ (playerReady ? ' ready' : ''), textContent: playerNameText });

			playersList.appendChild(player_li);
		}
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

		Dom.setTitle('humanity - viewer');

		Game.currentView = view || 'waiting_room';

		views[Game.currentView](arguments[1]);
	};

	Interact.onPointerUp.push(function(evt){
		Log()(evt);

		if(evt.target.id === 'LobbyButton'){
			evt.preventDefault();
			Interact.pointerTarget = null;

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			Dom.changeLocation('/lobby');
		}
	});

	WS.onmessage = function(data){
		if(data.command === 'challenge_accept'){
			Game.players = data.players;
			Game.readyPlayers = data.readyPlayers;
			Game.activePlayers = data.activePlayers;

			Dom.draw();
		}

		else if(data.command === 'player_join_accept'){
			Game.currentBlack = data.black;
			Game.currentWhites = data.whites;
			Game.players = data.players;
			Game.readyPlayers = data.readyPlayers;
			Game.activePlayers = data.activePlayers;
			Game.options = data.options;

			Game.trashingWhiteCards = false;

			if(data.state === 'voting'){
				Dom.draw('waiting_room');
			}

			else if(data.state === 'entering_submissions'){
				Dom.draw('waiting_room');
			}

			else{
				Dom.draw('waiting_room');
			}
		}

		else if(data.command === 'player_waiting_on' && Game.currentView === 'main'){
			Game.activePlayers = data.activePlayers;
		}

		else if(data.command === 'player_vote_results' && Game.currentView === 'start_screen'){
			Dom.draw('start_screen');
		}

		else if(data.command === 'player_join'){
			Game.players.push(data.name);

			drawPlayersList();
			updateVetoDisplay();
		}

		else if(data.command === 'player_ready'){
			var playersList = document.getElementById('PlayersList');

			Game.readyPlayers.push(data.name);

			if(!playersList) return;

			var playerCount = playersList.children.length;

			for(var x = 0; x < playerCount; ++x){
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

		if(!data.room || !Game.room || data.room !== Game.room || Game.currentView === 'main' ||	Game.currentView === 'vote_results' ||	Game.currentView === 'scores') return;

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

		else if(data.command === 'veto_black'){
			updateVetoDisplay(1);
		}

		else if(data.command === 'player_bump'){
			if(Vibrate) Vibrate(300);
		}
	};

	WS.room = 'viewer_'+ Game.room;

	WS.connect();
}

document.addEventListener('DOMContentLoaded', Load);