import qrCode from 'qrcode';
import { DomElem } from 'vanilla-bean-components';

export default class QRCode extends DomElem {
	constructor(options) {
		super({ ...options, tag: 'canvas' });
	}

	render() {
		super.render();

		qrCode.toCanvas(this.elem, this.options.src, this.options.qrCodeConfig || {}, error => {
			if (error) this.options?.onError(error);
		});
	}
}
