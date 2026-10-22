# Humanity

My digital take on the; wonderful, terrible, hilarious, hideous game provided by [these fine folks](https://cardsagainsthumanity.com/), and inspired by [jackbox](https://www.jackboxgames.com/).

[Built with Bun](https://bun.sh/)

## Screenshots

![Creating a game: room name, submission and vote timers, hand size, NPCs and the card packs to play with](./img/lobby_new_game.png)

![A player's hand under the black card, with one white card picked and raised, ready to Play](./img/player_enter_submission.png)

![The same hand on a phone, two cards across](./img/player_enter_submission_phone.png)

![Round over: the winner, their votes and wins, and the winning card under the black card](./img/player_vote_results.png)

The timer, custom card and NPC options are on the form, but the server doesn't use them yet.

## Start

`bun install`, then `bun start` and open [http://localhost:8032](http://localhost:8032). Options: `--port`/`-p`, `--database`/`-d` (default `~/.humanity.json`) and `--verbosity`/`-v`.

`bun dev` runs it with hot reload, rebuilding the client on change.

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
