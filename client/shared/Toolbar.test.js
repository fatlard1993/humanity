import { Button, Component } from '@vanilla-bean/components';

import Toolbar from './Toolbar.js';

describe('Toolbar', () => {
	let toolbar;

	afterEach(() => {
		toolbar?.destroy?.();
		toolbar = null;
	});

	describe('initial render', () => {
		test('renders an empty heading and no side content by default', () => {
			toolbar = new Toolbar({ appendTo: container });

			const heading = container.querySelector('h1');
			expect(heading).not.toBeNull();
			expect(heading).toHaveTextContent('');
			expect(toolbar._left.elem.children.length).toBe(0);
			expect(toolbar._right.elem.children.length).toBe(0);
		});

		test('renders heading, left, and right from options', () => {
			toolbar = new Toolbar({
				appendTo: container,
				heading: 'Game Name',
				left: [new Button({ content: 'Exit' })],
				right: [new Component({ textContent: 'status' })],
			});

			expect(container.querySelector('h1')).toHaveTextContent('Game Name');
			expect(toolbar._left.elem).toHaveTextContent('Exit');
			expect(toolbar._right.elem).toHaveTextContent('status');
		});
	});

	describe('post-render option updates', () => {
		test('setting heading updates the existing heading text', () => {
			toolbar = new Toolbar({ appendTo: container, heading: 'Before' });

			toolbar.options.heading = 'After';

			const headings = container.querySelectorAll('h1');
			expect(headings.length).toBe(1);
			expect(headings[0]).toHaveTextContent('After');
		});

		test('setting right replaces existing content', () => {
			toolbar = new Toolbar({ appendTo: container, right: [new Button({ content: 'Play' })] });

			toolbar.options.right = [new Button({ content: 'Vote' })];

			expect(toolbar._right.elem).not.toHaveTextContent('Play');
			expect(toolbar._right.elem).toHaveTextContent('Vote');
			expect(toolbar._right.elem.children.length).toBe(1);
		});

		test('setting right to an empty array clears it', () => {
			toolbar = new Toolbar({ appendTo: container, right: [new Button({ content: 'Play' })] });

			toolbar.options.right = [];

			expect(toolbar._right.elem.children.length).toBe(0);
		});
	});
});
