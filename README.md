# Humanity

My digital take on the; wonderful, terrible, hilarious, hideous game provided by [these fine folks](https://cardsagainsthumanity.com/), and inspired by [jackbox](https://www.jackboxgames.com/).

[Built with Bun](https://bun.sh/)

## Screenshots

![The hub: each open room a black card with who's in it and what it's played with, beside the white card that starts a new one](./img/hub.png)

![Creating a game: the room's name, the hand size and the card packs to play with, each with its size](./img/lobby_new_game.png)

![A player's hand under the black card, with one white card picked and raised, ready to play](./img/player_enter_submission.png)

![The same hand on a phone, two cards across](./img/player_enter_submission_phone.png)

![Round over: the winner and the winning card on the black card, the other cards with who played them and their votes, and the standings](./img/player_vote_results.png)

![The watch screen for a shared display: the cards up for the vote, the code to scan to join, and each player's seat](./img/watch_vote.png)

## Start

`bun install`, then `bun start` and open [http://localhost:8032](http://localhost:8032). Options: `--port`/`-p`, `--database`/`-d` (default `~/.humanity.json`) and `--verbosity`/`-v`.

`bun dev` restarts the server on save and rebuilds the client on change.

## Card packs

The decision to use only single entry cards was purposeful. I have found that things simply run smoother with single entry cards, even in the physical game.

### Even more content

Make your own pack, just put it in the cards folder.

Template:

```
{
	"blacks": [
		"card text _____"
	],
	"whites": [
		"card text"
	]
}
```
