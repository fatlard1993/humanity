// The tiebreak's rewrite of a card: up to three characters changed, added or taken out, and none of the card's markup
// touched. Asked by the page as the player types and by the server before it takes the rewrite.

export const MAX_CHANGES = 3;

// A card's markup: its tags and character entities (a pack's cards may hold line breaks, icons, accents)
const MARKUP = /<[^>]*>|&[#\w]+;/g;

/**
 * How many single characters must be changed, added or removed to turn one text into the other
 * @param {string} from - A text
 * @param {string} to - Another
 * @returns {number} The count
 */
export const changes = (from, to) => {
	let row = Array.from({ length: to.length + 1 }, (_, index) => index);

	for (let i = 1; i <= from.length; i++) {
		const next = [i];

		for (let j = 1; j <= to.length; j++)
			next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (from[i - 1] === to[j - 1] ? 0 : 1));

		row = next;
	}

	return row[to.length];
};

// The markup itself, then whatever of its characters stand loose in the text (an ampersand in a name)
const markupOf = text => [...(text.match(MARKUP) ?? []), text.replace(MARKUP, '').replace(/[^<>&]/g, '')].join('\n');

/**
 * What's wrong with a rewrite of a card, if anything
 * @param {string} original - The card as it stands
 * @param {*} text - What it would become
 * @returns {string|null} Why it can't be taken, or null when it can
 */
export const editProblem = (original, text) => {
	if (typeof text !== 'string' || !text.replace(MARKUP, '').trim()) return 'A card needs some text';
	if (markupOf(original) !== markupOf(text)) return "Leave the card's markup as it is";
	if (changes(original, text) > MAX_CHANGES) return `Change ${MAX_CHANGES} characters at most`;

	return null;
};
