import { log, dom, socketClient, humanity } from '_humanity';
import util from 'js-util';

const { init, setHeaderButtons, setContent, validateForm } = humanity;

const create = {
	defaults: {
		submissionTimer: 0,
		voteTimer: 0,
		handSize: 7,
		winGoal: 5,
		npcCount: 0,
	},
	draw: function () {
		const back = dom.createElem('button', {
			textContent: 'Back',
			onPointerPress: () => dom.location.change('/lobby'),
		});

		const save = dom.createElem('button', {
			textContent: 'Create',
			onPointerPress: () => this.save(),
		});

		const name = dom.createElem('input', {
			type: 'text',
			id: 'nameInput',
			validation: /^.{3,128}$/,
			value: this.randomName || '',
			onblur: validateForm,
			validationWarning: 'Must be between 3 and 128 characters',
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

				dom.validate(name);
			},
		});

		const submissionTimer = dom.createElem('input', {
			type: 'text',
			onblur: validateForm,
			validation: /(^([0-9]{1,2}|1[01][0-9]|12[0-8])$)|(^(?![\s\S]))/,
			placeholder: this.defaults.submissionTimer,
			validationWarning: 'Must be a number between 0 and 128',
			validate: 0,
		});

		const voteTimer = dom.createElem('input', {
			type: 'text',
			onblur: validateForm,
			validation: /(^([0-9]{1,2}|1[01][0-9]|12[0-8])$)|(^(?![\s\S]))/,
			placeholder: this.defaults.voteTimer,
			validationWarning: 'Must be a number between 0 and 128',
			validate: 0,
		});

		const handSize = dom.createElem('input', {
			type: 'text',
			onblur: validateForm,
			validation: /(^([0-9]|10)$)|(^(?![\s\S]))/,
			placeholder: this.defaults.handSize,
			validationWarning: 'Must be a number between 0 and 10',
			validate: 0,
		});

		const winGoal = dom.createElem('input', {
			type: 'text',
			validation: /(^([0-9]|10)$)|(^(?![\s\S]))/,
			placeholder: this.defaults.winGoal,
			validationWarning: 'Must be a number between 0 and 10',
			validate: 0,
		});

		const npcCount = dom.createElem('input', {
			type: 'text',
			onblur: validateForm,
			validation: /(^([0-9]|10)$)|(^(?![\s\S]))/,
			placeholder: this.defaults.npcCount,
			validationWarning: 'Must be a number between 0 and 10',
			validate: 0,
		});

		const lastManOut = dom.createElem('button', {
			className: 'big_center',
			id: 'lastManOut',
			textContent: 'Last Man Out',
			onPointerPress: () => lastManOut.classList[lastManOut.classList.contains('selected') ? 'remove' : 'add']('selected'),
		});

		const fillMissing = dom.createElem('button', {
			className: 'big_center',
			id: 'fillMissing',
			textContent: 'Fill In Missing',
			onPointerPress: () => fillMissing.classList[fillMissing.classList.contains('selected') ? 'remove' : 'add']('selected'),
		});

		const editField = dom.createElem('button', {
			className: 'big_center selected',
			id: 'editField',
			textContent: 'Edit Field',
			onPointerPress: () => editField.classList[editField.classList.contains('selected') ? 'remove' : 'add']('selected'),
		});

		const packList = dom.createElem('ul', { id: 'packList' });

		const selectAll = dom.createElem('button', {
			className: 'big_center',
			id: 'selectAll',
			textContent: 'Select All Packs',
			onPointerPress: () => {
				const select = packList.querySelectorAll('.selected').length < packList.querySelectorAll(':not(.selected)').length;

				selectAll.textContent = `${select ? 'Des' : 'S'}elect All Packs`;

				Array.from(packList.children).forEach(pack => {
					const isSelected = pack.classList.contains('selected');

					if (select !== isSelected) pack.classList[select ? 'add' : 'remove']('selected');
				});
			},
		});

		this.packNames.forEach(name => {
			const pack = dom.createElem('li', {
				className: `pack ${name === 'base' ? ' selected' : ''}`,
				textContent: name,
				appendTo: packList,
				onPointerPress: () => {
					pack.classList[pack.classList.contains('selected') ? 'remove' : 'add']('selected');

					const select = packList.querySelectorAll('.selected').length < packList.querySelectorAll(':not(.selected)').length;

					selectAll.textContent = `${select ? 'S' : 'Des'}elect All Packs`;
				},
			});
		});

		const formContainer = dom.createElem('div', {
			id: 'form',
			appendChildren: [
				dom.createElem('label', { textContent: 'Name', appendChildren: [name, randomize, clear] }),
				dom.createElem('label', { textContent: 'Submission Timer', appendChildren: [submissionTimer] }),
				dom.createElem('label', { textContent: 'Vote Timer', appendChildren: [voteTimer] }),
				dom.createElem('label', { textContent: 'Hand Size', appendChildren: [handSize] }),
				dom.createElem('label', { textContent: 'Blacks To Win', appendChildren: [winGoal] }),
				dom.createElem('label', { textContent: 'NPC Count', appendChildren: [npcCount] }),
				lastManOut,
				fillMissing,
				editField,
				dom.createElem('div', { className: 'separator' }),
				selectAll,
				packList,
			],
		});

		this.save = () => {
			if (validateForm()) return;

			const options = {
				name: name.value,
				packs: Array.from(packList.querySelectorAll('.selected')).map(elem => elem.textContent),
				submissionTimer: submissionTimer.value.length ? parseInt(submissionTimer.value) : this.defaults.submissionTimer,
				voteTimer: voteTimer.value.length ? parseInt(voteTimer.value) : this.defaults.voteTimer,
				handSize: handSize.value.length ? parseInt(handSize.value) : this.defaults.handSize,
				winGoal: winGoal.value.length ? parseInt(winGoal.value) : this.defaults.winGoal,
				npcCount: npcCount.value.length ? parseInt(npcCount.value) : this.defaults.npcCount,
				lastManOut: lastManOut.classList.contains('selected'),
				fillInMissing: fillMissing.classList.contains('selected'),
				editField: editField.classList.contains('selected'),
				// pointGoal: pointGoal.value.length ? parseInt(pointGoal.value) : 50,
			};

			log()('[create] Create game', options);

			socketClient.reply('create_room', options);
		};

		setHeaderButtons(back, save);
		setContent(formContainer);

		name.focus();

		// var pointGoal = dom.createElem('input', { type: 'text', placeholder: '50 :: Point Goal 0-128', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be a number between 0 and 128' });
	},
	selectPack: function (packItem, selectBool) {
		if (typeof selectBool === 'undefined') selectBool = !this.selectedPacks[packItem.textContent];

		log()(`[create] ${selectBool ? 'S' : 'Uns'}elect pack "${packItem.textContent}"`);

		if (selectBool) this.selectedPacks[packItem.textContent] = 1;
		else delete this.selectedPacks[packItem.textContent];

		this.selectedCount = Object.keys(this.selectedPacks).length;

		packItem.classList[selectBool ? 'add' : 'remove']('selected');
	},
};

dom.onLoad(function onLoad() {
	socketClient.on('open', function () {
		socketClient.reply('join_room', { room: 'create' });
	});

	socketClient.on('create_data', function (data) {
		log()('[create] create_data', data);

		create.packs = data.packs;
		create.packNames = util.sortArrAlphaNumeric(Object.keys(data.packs));
		create.packCount = create.packNames.length;

		create.draw();
	});

	socketClient.on('random_white', function (data) {
		log()('[create] random_white', data);

		if (dom.getElemById('nameInput')) {
			dom.getElemById('nameInput').value = data;

			dom.validate(dom.getElemById('nameInput'));

			setTimeout(validateForm, 100);
		}

		create.randomName = data;
	});

	socketClient.on('create_room', function () {
		dom.location.change('/lobby');
	});

	dom.interact.on('keyUp', function (evt) {
		if (evt.keyPressed === 'ENTER') {
			evt.preventDefault();

			create.save();
		}
	});

	init('Create');
});
