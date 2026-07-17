import { View as BaseView } from '@fatlard1993/web-game-framework/ui/layout';

export default class View extends BaseView {
	static schema = {
		body: {
			// No background art (yet); the framework default expects img/background.svg
			get default() {
				return { backgroundImage: false };
			},
		},
	};
}
