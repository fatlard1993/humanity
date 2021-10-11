import { log, dom, socketClient, humanity } from '_humanity';

const { init, setPageTitle, setHeaderButtons, setContent, validateForm } = humanity;

const join = {
	roomId: window.location.pathname.split('/')[2],
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
				socketClient.reply('register', { roomId: join.roomId, action: 'view' });
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
			id: 'playButton',
			textContent: 'Play',
			onPointerPress: join.register,
		});

		join.updatePlayButton = () => play[`${name.classList.contains('invalid') ? 'set' : 'remove'}Attribute`]('disabled', true);

		const name = dom.createElem('input', {
			type: 'text',
			id: 'nameInput',
			value: dom.storage.get('player_name') || join.randomName || '',
			onblur: validateForm,
			validation: /^.{3,32}$/,
			validationWarning: 'Must be between 3 and 32 characters',
			validate: 0,
			onKeyUp: () => requestAnimationFrame(join.updatePlayButton),
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

				join.updatePlayButton();
			},
		});

		const formContainer = dom.createElem('div', {
			id: 'form',
			appendChildren: [dom.createElem('label', { textContent: 'Name', appendChildren: [name, randomize, clear] })],
		});

		setHeaderButtons(back, play);
		setContent(formContainer);

		name.focus();

		join.updatePlayButton();
	},
	register: function () {
		if (validateForm()) return;

		socketClient.reply('register', { roomId: join.roomId, name: dom.getElemById('nameInput').value, type: 'play' });
	},
};

dom.onLoad(function onLoad() {
	socketClient.on('open', function () {
		socketClient.reply('join', { room: 'join', roomId: join.roomId });

		join.timeout = setTimeout(() => dom.location.change('/lobby'), 1000);
	});

	socketClient.on('state', function (state) {
		log()('[join] state', state);

		clearTimeout(join.timeout);

		if (!state || state.error) return dom.location.change('/lobby');

		join.state = { ...join.state, ...state };

		setPageTitle(`Joining Game:\n${join.state.room.name}`);

		join.draw_play_or_view();
	});

	socketClient.on('random_white', function (data) {
		log()('[join] random_white', data);

		if (dom.getElemById('nameInput')) {
			dom.getElemById('nameInput').value = data;

			dom.validate(dom.getElemById('nameInput'));

			join.updatePlayButton();

			setTimeout(validateForm, 100);
		}

		join.randomName = data;
	});

	socketClient.on('register', function (payload) {
		if (payload.error) {
			dom.remove(document.getElementsByClassName('validationWarning'));

			dom.createElem('p', { className: 'validationWarning', textContent: payload.error, appendTo: dom.getElemById('nameInput').parentElement });

			dom.getElemById('nameInput').classList.remove('validated');
			dom.getElemById('nameInput').classList.add('invalid');

			join.updatePlayButton();

			return;
		}

		dom.storage.set('player_name', payload.name);

		dom.location.change(`/${payload.type}/${join.roomId}${payload.type === 'play' ? `/${payload.id}` : ''}`);
	});

	dom.interact.on('keyUp', evt => {
		if (evt.keyPressed === 'ENTER') {
			evt.preventDefault();

			join.register();
		} else if (evt.keyPressed === 'ESCAPE') {
			evt.preventDefault();

			dom.location.change('/lobby');
		}
	});

	init('Lobby', `Joining Game:\n"${join.roomId}"`);
});
