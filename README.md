# Humanity

My take on the; wonderful, terrible, hilarious, hideous game provided by these [fine folks](https://cardsagainsthumanity.com/).

## Version 2.0

I really enjoyed working on this project initially and the play tests it provided.

## Prerequisites

1. Linux || UNIX || MacOS
2. node.js (version >= V6.10.1 [Check out NVM](https://github.com/creationix/nvm))


## Setup

/humanity$ ```npm i```


## Start

/humanity$ ```./server/index.js --port 1337```

### Flags


## Screenshots

More in [etc/screenshots](https://github.com/fatlard1993/humanity/tree/master/etc/screenshots)

![lobby_new_game](./etc/screenshots/lobby_new_game.png)
![player_enter_submission](./etc/screenshots/player_enter_submission.png)
![player_vote_results](./etc/screenshots/player_vote_results.png)


## Card packs

The decision to use only single entry cards was purposeful. I have found things to simply run smoother with single entry cards, even in the physical game. So the card pack importer scripts provided here will try to automatically strip any multiple entry blacks out.

[JSON cards](https://www.crhallberg.com/cah/)

1. Copy raw json string data from the above link
2. Paste into file, eg: temp.json
3. /humanity$ ```node ./scripts/conv_cah.js temp "output pack name"```

### CardCast pack support

1. Search for packs: /humanity$ ```node ./scripts/cardcast.js search "search term"```
2. Install a pack: /humanity$ ```node ./scripts/cardcast.js get "pack code" "output pack name"```

#### New UI for card cast install

```URL:port/cardCast```

### Even more content

Make your own, put it in etc/cards

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