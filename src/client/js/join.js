import { log, dom, socketClient, humanity } from '_humanity';

const { init, setPageTitle, setHeaderButtons, setContent, validateForm } = humanity;

// todo support full html room name

const join = {
	roomID: window.location.pathname.split('/')[2],
	draw_play_or_view: function () {
		const back = dom.createElem('button', {
			textContent: 'Back',
			onPointerPress: () => dom.location.change('/lobby'),
		});

		const play = dom.createElem('button', {
			textContent: 'Play',
			className: 'big_center',
			onPointerPress: join.draw_join,
		});

		const view = dom.createElem('button', {
			textContent: 'View',
			className: 'big_center',
			onPointerPress: function () {
				socketClient.reply('player_register', { roomID: join.roomID, action: 'view' });
			},
		});

		setHeaderButtons(back);

		setContent(play, dom.createElem('div', { className: 'big_center', textContent: 'OR' }), view);
	},
	draw_join: function () {
		const back = dom.createElem('button', {
			textContent: 'Back',
			onPointerPress: join.draw_play_or_view,
		});

		const play = dom.createElem('button', {
			textContent: 'Play',
			onPointerPress: join.register,
		});

		const name = dom.createElem('input', {
			type: 'text',
			id: 'nameInput',
			value: dom.storage.get('player_name') || join.randomName || '',
			onblur: validateForm,
			validation: /^.{3,32}$/,
			validationWarning: 'Must be between 3 and 32 characters',
			validate: 0,
		});

		const randomize = dom.createElem('button', {
			className: 'iconAction randomize',
			onPointerPress: () => socketClient.reply('get_random_white'),
		});

		const clear = dom.createElem('button', {
			className: 'iconAction clear',
			onPointerPress: () => {
				name.value = '';

				dom.storage.set('player_name', '');

				dom.validate(name);
			},
		});

		const formContainer = dom.createElem('div', {
			id: 'form',
			appendChildren: [dom.createElem('label', { textContent: 'Name', appendChildren: [name, randomize, clear] })],
		});

		setHeaderButtons(back, play);
		setContent(formContainer);

		name.focus();
	},
	register: function () {
		if (validateForm()) return;

		socketClient.reply('player_register', { roomID: join.roomID, action: 'play', name: dom.getElemById('nameInput').value });
	},
};

dom.onLoad(function onLoad() {
	socketClient.on('open', function () {
		socketClient.reply('join_room', { room: 'join', id: join.roomID });
	});

	socketClient.on('join_data', function (data) {
		log()('[join] join_data', data);

		if (!data || data.error) return dom.location.change('/lobby');

		join.room = data;

		setPageTitle(`Joining Game:\n${join.room.name}`);

		join.draw_play_or_view();
	});

	socketClient.on('random_white', function (data) {
		log()('[join] random_white', data);

		if (dom.getElemById('nameInput')) {
			dom.getElemById('nameInput').value = data;

			dom.validate(dom.getElemById('nameInput'));

			setTimeout(validateForm, 100);
		}

		join.randomName = data;
	});

	socketClient.on('player_register', function (payload) {
		if (payload.error) {
			dom.remove(document.getElementsByClassName('validationWarning'));

			dom.createElem('p', { className: 'validationWarning', textContent: payload.error, appendTo: dom.getElemById('nameInput') });

			dom.getElemById('nameInput').classList.remove('validated');
			dom.getElemById('nameInput').classList.add('invalid');

			return;
		}

		dom.storage.set('player_name', payload.name);

		dom.location.change(`/${payload.action}/${payload.roomID}${payload.action === 'play' ? '/' + payload.playerID : ''}`);
	});

	dom.interact.on('keyUp', evt => {
		if (evt.keyPressed === 'ENTER') {
			evt.preventDefault();

			join.register();
		}
	});

	init('Lobby', `Joining Game:\n"${join.roomID}"`);
});
