# Humanity

This is just a platform that allows for playing my take on the; wonderful, terrible, hilarious, hideous game provided by these [fine folks](https://cardsagainsthumanity.com/).

## Prerequisites

1. Linux or UNIX
2. node.js >= V6.10.1 [Check out NVM](https://github.com/creationix/nvm)


## Setup and/or update the project and dependencies

/humanity$ ```./SETUP```


## Run from the project

/humanity$ ```./server/start```

OR

/humanity$ ```./server/start <port>```

OR

/humanity$ ```./server/start dbg <port>```

OR

/humanity$ ```./server/start dbg lvl <debug_level> <port>```


## Create dist folder

The dist folder contains a copy of all of the required files, which can be extracted from the rest of the project and ran elsewhere.

/humanity$ ```gulp dist```


## Run from a dist

All aforementioned options are available, simply prepended with "dist" eg:

/dist$ ```./start dist <other_options>```


## Compile changes

Running this will compile all of the client js, scss, and html into the public folder which is then served via the node app. This will also trigger a refresh request socket to any connected client pages upon completion.

/humanity$ ```gulp dev```

### Problems

If you used NVM to install node and are getting the following error on first run: ```sudo: node: command not found```
Run the following snippet to fix it: ```sudo ln -s "$NVM_DIR/versions/node/$(nvm version)/bin/node" "/usr/local/bin/node"```


## Screenshots

More in [etc/screenshots](https://github.com/fatlard1993/humanity/tree/master/etc/screenshots)

![lobby_new_game](./etc/screenshots/lobby_new_game.png)
![player_enter_submission](./etc/screenshots/player_enter_submission.png)
![player_vote_results](./etc/screenshots/player_vote_results.png)


## More card packs

The decision to use only single entry cards was purposeful. I have found things to simply run smoother with single entry cards, even in the physical game. So the card pack importer scripts provided here will try to automatically strip any multiple entry blacks out.

[JSON cards](https://www.crhallberg.com/cah/)

1. Copy raw json string data from the above link
2. Paste into file, eg: temp.json
3. /humanity$ ```node ./scripts/conv_cah.js temp "output pack name"```

### Cardcast pack support

1. Search for packs: /humanity$ ```node ./scripts/cardcast.js search "search term"```
2. Install a pack: /humanity$ ```node ./scripts/cardcast.js get "pack code" "output pack name"```

### Even more content

Make your own, put it in server/cards

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