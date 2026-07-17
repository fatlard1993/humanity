import { Hub as BaseHub } from '@fatlard1993/web-game-framework/ui/GameRoom';

import GameInfoDialog from './shared/GameInfoDialog.js';

export default class Hub extends BaseHub {
	constructor(options, ...children) {
		super(
			{
				...options,
				body: { backgroundImage: false },
				toolbar: { heading: 'Hub', createText: 'Create Game' },
				buttons: { linkText: 'Share' },
				popoverOptions: { dialogComponent: GameInfoDialog },
			},
			...children,
		);
	}
}
