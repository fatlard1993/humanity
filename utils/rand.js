export const rand = (min, max) => Math.random() * (max - min) + min;

export const randInt = (min, max) => Number.parseInt(rand(min, max));

export const randFromArray = array => array[randInt(0, array.length)];

export const shuffleArray = array => {
	for (let index = array.length - 1; index > 0; index--) {
		const rIndex = Math.floor(Math.random() * (index + 1));
		[array[index], array[rIndex]] = [array[rIndex], array[index]];
	}

	return array;
};
