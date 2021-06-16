import Log from 'log';
import util from 'js-util';
import dom from 'dom';
import socketClient from 'socket-client';

const log = new Log({ tag: 'humanity', defaults: { verbosity: parseInt(dom.storage.get('logVerbosity') || 0) } });

socketClient.on('close', function(evt){
	log()('Socket disconnect', arguments);

	if(evt.code !== 1005) socketClient.reconnect();
});

const humanity = {
	init: function(tabTitle, pageTitle){
		dom.mobile.detect();

		socketClient.init();

		if(tabTitle) humanity.setTabTitle(tabTitle);

		if(pageTitle) humanity.setPageTitle(pageTitle);
	},
	setTabTitle: function(tabTitle){
		dom.setTitle(`[humanity] ${tabTitle}`);
	},
	setPageTitle: function(pageTitle){
		dom.getElemById('title').innerHTML = pageTitle;
	},
	setHeaderButtons: function(...args){
		dom.remove(document.querySelectorAll('#header button'));

		dom.appendChildren(dom.getElemById('header'), ...util.cleanArr(args));
	},
	setContent: function(...args){
		dom.empty(dom.getElemById('content'));

		dom.appendChildren(dom.getElemById('content'), ...util.cleanArr(args));
	},
	validateForm: function() {
		return dom.showValidationWarnings(dom.getElemById('form'));
	},
	playerColor: function(str){
		var hash = 0, colour = '#', x;

		for(x = 0; x < str.length; ++x) hash = str.charCodeAt(x) + ((hash << 5) - hash);

		hash *= 100;

		for(x = 0; x < 3; ++x) colour += `00${((hash >> (x * 8)) & 0xFF).toString(16)}`.substr(-2);

		return colour;
	}
};