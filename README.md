# Humanity

This is just a platform that allows for playing a version of the wonderful/terrible/hilarious/hideous game provided by these [fine folks](https://cardsagainsthumanity.com/).

## Prerequisites

1. Linux or UNIX
2. node.js [Check out NVM](https://github.com/creationix/nvm)


## Setup

/humanity$ ```./scripts/setup```


## Run

/humanity$ ```./scripts/start```

OR

/humanity$ ```./scripts/start <port>```

OR

/humanity$ ```./scripts/start dbg <port>```

OR

/humanity$ ```./scripts/start dbg lvl <debug_level> <port>```


## Create dist folder

The dist folder contains all files required to run and can be extracted from the project by itsself and ran anywhere.

/humanity$ ```gulp dist```


## Run from dist

All standard options are available, simply prepend any options with "dist" eg:

/dist$ ```./start dist <other_options>```


## Compile changes

This will also refresh any connected client pages.

/humanity$ ```gulp dev```

### Problems

```sudo: node: command not found``` to fix this (if you used NVM) run: ```sudo ln -s "$NVM_DIR/versions/node/$(nvm version)/bin/node" "/usr/local/bin/node"```


## Screenshots

More in ```./etc/screenshots```

![lobby_new_game](./etc/screenshots/lobby_new_game.png)
![player_enter_submission](./etc/screenshots/player_enter_submission.png)
![player_vote_results](./etc/screenshots/player_vote_results.png)


## More card packs

The decision to use only single pick cards was purposeful. I have found things to simply run smoother with single pick cards, even in the physical game. So the card pack importer scripts provided here will try to automatically strip any non single pick blacks out.

[JSON cards](https://www.crhallberg.com/cah/)

1. copy raw json string data from the above link
2. paste into file, eg: temp.json
3. run: ```node ./scripts/conv_cah.js temp "output pack name"```

### Cardcast pack support

1. search for packs: ```node ./scripts/cardcast.js search "search term"```
2. install a pack: ```node ./scripts/cardcast.js get "pack code" "output pack name"```

### Even more content

Make your own, put it in: ```./server/cards/```!

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