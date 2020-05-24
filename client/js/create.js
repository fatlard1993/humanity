// includes dom log socket-client js-util _common
// babel
/* global dom log socketClient util */

const create = {
	draw: function draw(){
		dom.empty(dom.getElemById('content'));

		var nameInput = dom.createElem('input', { type: 'text', placeholder: create.name +' :: Room Name', validation: /^.{4,32}$|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be between 4 and 32 characters' });
		var submissionTimer = dom.createElem('input', { type: 'text', placeholder: '0 :: Submission Timer 0-128 sec', validation: /(^([0-9]{1,2}|1[01][0-9]|12[0-8])$)|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be a number between 0 and 128' });
		var voteTimer = dom.createElem('input', { type: 'text', placeholder: '0 :: Vote Timer 0-128 sec', validation: /(^([0-9]{1,2}|1[01][0-9]|12[0-8])$)|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be a number between 0 and 128' });
		var whiteCardCount = dom.createElem('input', { type: 'text', placeholder: '7 :: Whites 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be a number between 0 and 10' });
		var winGoal = dom.createElem('input', { type: 'text', placeholder: '5 :: Win Goal 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be a number between 0 and 10' });
		// var npcCount = dom.createElem('input', { type: 'text', placeholder: '0 :: NPCs 0-10', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be a number between 0 and 10' });
		// var pointGoal = dom.createElem('input', { type: 'text', placeholder: '50 :: Point Goal 0-128', validation: /(^([0-9]|10)$)|(^(?![\s\S]))/, validate: 0, validationWarning: 'Must be a number between 0 and 128' });
		var lastManOut = dom.createElem('button', { className: 'option', id: 'lastManOut', textContent: 'Last Man Out' });
		var fillInMissing = dom.createElem('button', { className: 'option', id: 'fillMissing', textContent: 'Fill In Missing' });
		var editFieldToggle = dom.createElem('button', { className: 'option selected', id: 'editField', textContent: 'Edit Field' });
		var selectAllPacks = dom.createElem('button', { id: 'selectAll', textContent: 'Select All Packs' });
		var packsList = dom.createElem('ul', { id: 'packsList' });

		this.packItems = [];
		this.selectedPacks = {
			base: 1
		};
		this.selectedCount = 0;
		this.options = {
			editField: 1
		};

		for(var x = 0; x < this.packCount; ++x) this.packItems.push(dom.createElem('li', { className: 'pack'+ (this.packNames[x] === 'base' ? ' selected' : ''), textContent: this.packNames[x], appendTo: packsList }));

		dom.createElem('button', { className: 'leftButton', textContent: 'Back', appendTo: dom.getElemById('content') });
		dom.createElem('button', { className: 'rightButton', textContent: 'Done', appendTo: dom.getElemById('content') });
		// dom.createElem('button', { className: 'rightButton', textContent: 'Packs', appendTo: dom.getElemById('content') });

		var newGameForm = dom.createElem('div', { id: 'newGameForm', appendTo: dom.getElemById('content'), appendChildren: [nameInput, submissionTimer, voteTimer, whiteCardCount, winGoal, /* npcCount, pointGoal, */ lastManOut, fillInMissing, editFieldToggle, selectAllPacks, packsList] });

		nameInput.focus();

		this.save = () => {
			var warnings = dom.showValidationWarnings(newGameForm);

			if(warnings) return;

			var options = {
				name: nameInput.value.length ? nameInput.value : create.name,
				packs: Object.keys(this.selectedPacks),
				submissionTimer: submissionTimer.value.length ? parseInt(submissionTimer.value) : 0,
				voteTimer: voteTimer.value.length ? parseInt(voteTimer.value) : 0,
				whiteCardCount: whiteCardCount.value.length ? parseInt(whiteCardCount.value) : 7,
				winGoal: winGoal.value.length ? parseInt(winGoal.value) : 5,
				// npcCount: npcCount.value.length ? parseInt(npcCount.value) : 0,
				// pointGoal: pointGoal.value.length ? parseInt(pointGoal.value) : 50,
				npcCount: 0,
				pointGoal: 50,
				lastManOut: this.options.lastManOut,
				fillInMissing: this.options.fillMissing,
				editField: this.options.editField
			};

			log()('[create] Create game', options);

			socketClient.reply('create_room', options);
		};
	},
	selectPack: function(packItem, selectBool){
		if(typeof selectBool === 'undefined') selectBool = !this.selectedPacks[packItem.textContent];

		log()(`[create] ${selectBool ? 'S' : 'Uns'}elect pack "${packItem.textContent}"`);

		if(selectBool) this.selectedPacks[packItem.textContent] = 1;

		else delete this.selectedPacks[packItem.textContent];

		this.selectedCount = Object.keys(this.selectedPacks).length;

		packItem.classList[selectBool ? 'add' : 'remove']('selected');
	}
};

dom.onLoad(function onLoad(){
	socketClient.on('open', function(){
		socketClient.reply('join_room', { room: 'create' });
	});

	socketClient.on('create_data', function(data){
		log()('[lobby] create_data', data);

		create.name = data.name;
		create.packs = data.packs;
		create.packNames = util.sortArrAlphaNumeric(Object.keys(data.packs));
		create.packCount = create.packNames.length;

		create.draw();
	});

	socketClient.on('create_room', function(){
		dom.location.change('/lobby');
	});

	dom.interact.on('keyUp', function(evt){
		if(evt.keyPressed === 'ENTER'){
			evt.preventDefault();

			create.save();
		}
	});

	dom.interact.on('pointerUp', (evt) => {
		var selectBool, updateSelectAll;

		if(evt.target.id === 'selectAll'){
			evt.preventDefault();

			updateSelectAll = true;
			selectBool = create.selectedCount < create.packCount / 2;

			for(var x = 0; x < create.packCount; ++x) create.selectPack(create.packItems[x], selectBool);
		}

		else if(evt.target.textContent === 'Packs'){
			evt.preventDefault();

			dom.location.change('/cardCast');
		}

		else if(evt.target.classList.contains('pack')){
			evt.preventDefault();

			updateSelectAll = true;

			create.selectPack(evt.target);
		}

		else if(evt.target.classList.contains('option')){
			evt.preventDefault();

			selectBool = !create.options[evt.target.id];

			log()('[create] Toggle option', evt.target.textContent);

			if(selectBool) create.options[evt.target.id] = 1;

			else delete create.options[evt.target.id];

			evt.target.classList[selectBool ? 'add' : 'remove']('selected');
		}

		else if(evt.target.textContent === 'Back'){
			evt.preventDefault();

			dom.location.change('/lobby');
		}

		else if(evt.target.textContent === 'Done'){
			evt.preventDefault();

			create.save();
		}

		if(updateSelectAll) document.getElementById('selectAll').textContent = `${create.selectedCount < create.packCount / 2 ? 'S' : 'Uns'}elect All Packs`;
	});

	dom.mobile.detect();

	socketClient.init();

	dom.setTitle('[humanity] Create');

	dom.maintenance.init([
		function heightFix(){
			dom.getElemById('content').style.height = dom.availableHeight +'px';
		}
	]);
});