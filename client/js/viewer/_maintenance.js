/* global Dom, View */

Dom.maintenance.init([
	function whitesPileFix(){
		Dom.Content = Dom.Content || document.getElementById('Content');

		if(!document.getElementById('WhitesPile')) return;

		var height = Dom.availableHeight - document.getElementById('BigBlack').clientHeight - 100;

		document.getElementById('WhitesPile').style.height = height +'px';
	}
]);