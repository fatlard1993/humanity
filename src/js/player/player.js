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
		currentWhites: []
	};

	var views = {
		main: function(){
			var joinGameForm = Dom.createElem('div', { id: 'JoinGameForm' });

			var nameInput = Dom.createElem('input', { id: 'JoinGameName', placeholder: 'Your Name', validation: /.{4,}/ });
			Dom.validate(nameInput);

			var joinButton = Dom.createElem('button', { id: 'JoinGameButton', textContent: 'Join' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Lobby' });

			joinGameForm.appendChild(nameInput);
			joinGameForm.appendChild(joinButton);
			joinGameForm.appendChild(lobbyButton);
			Dom.Content.appendChild(joinGameForm);

			nameInput.focus();
		},
		guess: function(){
			var joinGameForm = Dom.createElem('div', { id: 'GameGuessForm' });

			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var guessInput = Dom.createElem('input', { id: 'GameGuess', validation: /.{1,}/ });
			Dom.validate(guessInput);

			var doneButton = Dom.createElem('button', { id: 'GameGuessDoneButton', textContent: 'Done' });

			var whitesList = Dom.createElem('ul', { id: 'WhitesList' });
			var whiteCount = Game.currentWhites.length;

			for(x = 0; x < whiteCount; ++x){
				var li = Dom.createElem('li', { className: 'white', textContent: Game.currentWhites[x] });

				whitesList.appendChild(li);
			}

			joinGameForm.appendChild(currentBlackHeading);
			joinGameForm.appendChild(guessInput);
			joinGameForm.appendChild(doneButton);
			joinGameForm.appendChild(whitesList);
			Dom.Content.appendChild(joinGameForm);

			guessInput.focus();
		},
		waiting_room: function(){
			var waitingHeading = Dom.createElem('div', { id: 'WaitingHeading', textContent: 'Waiting...' });

			Dom.Content.appendChild(waitingHeading);
		},
		vote: function(submissions){
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack +'<br><br>Vote for your favorite!' });

			var submissionList = Dom.createElem('ul', { id: 'SubmissionList' });
			var submissionCount = submissions.length;

			if(!submissionCount){
				var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Lobby' });

				currentBlackHeading.textContent = 'No one is playing here';

				Dom.Content.appendChild(currentBlackHeading);
				Dom.Content.appendChild(lobbyButton);

				return;
			}

			for(x = 0; x < submissionCount; ++x){
				submissionList.appendChild(Dom.createElem('li', { className: 'submission', textContent: submissions[x].guess }));
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionList);
		},
		vote_results: function(submissions){
			var currentBlackHeading = Dom.createElem('div', { id: 'CurrentBlackHeading', innerHTML: Game.currentBlack });

			var submissionList = Dom.createElem('ul', { id: 'SubmissionList' });
			var submissionNames = Object.keys(submissions), submissionCount = submissionNames.length;

			var playAgainButton = Dom.createElem('button', { id: 'PlayAgainButton', textContent: 'Play Again' });

			var lobbyButton = Dom.createElem('button', { id: 'LobbyButton', textContent: 'Lobby' });

			for(x = 0; x < submissionCount; ++x){
				var li = Dom.createElem('li', { className: 'submission_result', textContent: 'Votes: '+ submissions[submissionNames[x]].count });
				li.appendChild(Dom.createElem('span', { innerHTML: submissionNames[x] +'<br>- '+ submissions[submissionNames[x]].player + (submissions[submissionNames[x]].winner ? '		WINNER' : '') }));

				submissionList.appendChild(li);
			}

			Dom.Content.appendChild(currentBlackHeading);
			Dom.Content.appendChild(submissionList);
			Dom.Content.appendChild(playAgainButton);
			Dom.Content.appendChild(lobbyButton);
		}
	};

	function onSocketMessage(data){
		Log()(data);

		if(data.command === 'challenge'){
			Dom.draw();
		}

		else if(data.command === 'challenge_accept'){
			Game.currentBlack = data.black;
			if(data.whites) Game.currentWhites = data.whites;

			Dom.draw('guess', data.black);
		}

		else if(data.command === 'new_whites'){
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

		if(!data.room || !Player.room || data.room !== Player.room) return;

		if(data.command === 'vote'){
			var submissions = Cjs.clone(data.submissions), submissionCount = data.submissions.length;

			for(x = 0; x < submissionCount; ++x){
				if(data.submissions[x].guess === Player.currentGuess) submissions.splice(x, 1);
			}

			Dom.draw('vote', submissions);
		}

		else if(data.command === 'vote_results'){
			Dom.draw('vote_results', data.votes);
		}

		else if(data.command === 'start_timer'){
			Game.started = true;
		}
	}

	function joinGame(){
		var name = document.getElementById('JoinGameName').value;

		Player.name = name;

		Socket.active.send('{ "command": "challenge_response", "room": "player", "game_room": "'+ Player.room +'", "playerName": "'+ name +'" }');

		Dom.draw('waiting_room');
	}

	function makeGuess(){
		var guess = document.getElementById('GameGuess').value;

		Player.currentGuess = guess;

		Socket.active.send('{ "command": "game_guess", "guess": "'+ guess +'" }');

		Dom.draw('waiting_room');
	}

	function voteOnSubmission(submission){
		Socket.active.send('{ "command": "game_vote", "vote": "'+ submission +'" }');

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

		else if(evt.target.id === 'PlayAgainButton'){
			evt.preventDefault();

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			Socket.active.send('{ "command": "play_again" }');
		}

		else if(evt.target.id === 'LobbyButton'){
			evt.preventDefault();

			Dom.Content = Dom.Content || document.getElementById('Content');

			Dom.empty(Dom.Content);

			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/lobby';
		}

		else if(evt.target.id === 'GameGuessDoneButton'){
			evt.preventDefault();

			makeGuess();
		}

		else if(evt.target.className === 'white'){
			evt.preventDefault();

			var guessInput = document.getElementById('GameGuess');

			guessInput.value = evt.target.textContent;
			Dom.validate(guessInput);

			Game.started = true;

			Socket.active.send('{ "command": "game_start" }');

			Socket.active.send('{ "command": "remove_white", "text": "'+ evt.target.textContent +'" }');
		}

		else if(evt.target.className === 'submission'){
			evt.preventDefault();

			voteOnSubmission(evt.target.textContent);
		}
	};

	Interact.onKeyUp = function(evt, keyPressed){
		if(keyPressed === 'ENTER'){
			if(document.getElementById('JoinGameButton')){
				evt.preventDefault();

				joinGame();
			}

			else if(document.getElementById('GameGuessDoneButton')){
				evt.preventDefault();

				makeGuess();
			}
		}

		else if(!Game.started && evt.target.id === 'GameGuess' && evt.target.value.length){
			Game.started = true;

			Socket.active.send('{ "command": "game_start" }');
		}
	};

	Socket.init(null, onSocketMessage);
}

document.addEventListener('DOMContentLoaded', Load);