/* global Cjs, Dom, Log, Socket, Interact */

var Loaded = false;

function Load(){
	if(Loaded) return;
	Loaded = true;

	var Games;

	var Views = {
		main: function(){
			var joinGameForm = Dom.createElem('div', { id: 'JoinGameForm' });

			var nameInput = Dom.createElem('input', { id: 'JoinGameName', placeholder: 'Your Name', validation: /.{4,}/ });
			Dom.validate(nameInput);

			var createButton = Dom.createElem('button', { id: 'JoinGameCreateButton', textContent: 'Join' });

			joinGameForm.appendChild(nameInput);
			joinGameForm.appendChild(createButton);
			Dom.Content.appendChild(joinGameForm);
		}
	};

	Dom.draw = function draw(view){
		Dom.Content = Dom.Content || document.getElementById('Content');

		Dom.empty(Dom.Content);

		Dom.setTitle('humanity - lobby');

		Views[view || 'main'](arguments[1]);
	};

	Interact.onPointerUp = function(evt){
		console.log(evt);
	};

	function onmessage(data){
		console.log(data);

		if(data.command === 'challenge'){
			Socket.active.send('{ "command": "challenge_response", "room": "player" }');
		}

		else if(data.command === 'challenge_accept'){
			Dom.draw();
		}
	}

	Socket.init(null, onmessage);
}

document.addEventListener('DOMContentLoaded', Load);