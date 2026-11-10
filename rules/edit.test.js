import { expect, test } from 'bun:test';

import { changes, editProblem } from './edit.js';

test('changes counts the characters changed, added or removed', () => {
	expect(changes('Grandma', 'Grandma')).toBe(0);
	expect(changes('Grandma', 'Grandpa')).toBe(1);
	expect(changes('A sad handjob', 'A sad handjobs!')).toBe(2);
	expect(changes('Vikings', 'Kings')).toBe(3);
	expect(changes('', 'abc')).toBe(3);
});

test('a rewrite is three changes at most, keeps some text, and leaves markup alone', () => {
	expect(editProblem('Hot Pockets', 'Hot Rockets')).toBe(null);
	expect(editProblem('Hot Pockets', 'Not Rockets!')).toBe(null);
	expect(editProblem('Hot Pockets', 'Cold Rockets')).toBe('Change 3 characters at most');
	expect(editProblem('Hi', '  ')).toBe('A card needs some text');
	expect(editProblem('Hi', undefined)).toBe('A card needs some text');
	// Markup can be neither added, removed nor changed, though the text around it can
	expect(editProblem('War!<br>What for?', 'Wax!<br>What for?')).toBe(null);
	expect(editProblem('War!<br>What for?', 'War!<b>What for?')).toBe("Leave the card's markup as it is");
	expect(editProblem('Hi', 'H<i>')).toBe("Leave the card's markup as it is");
	expect(editProblem('Dal&iacute;', 'Dal&iacute;s')).toBe(null);
	expect(editProblem('Dal&iacute;', 'Dal&lt;')).toBe("Leave the card's markup as it is");
	expect(editProblem('Ben & Jerry', 'Ben & Terry')).toBe(null);
	expect(editProblem('Ben and Jerry', 'Ben & Jerry')).toBe("Leave the card's markup as it is");
});
