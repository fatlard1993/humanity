#!/usr/bin/env node

const yargs = require('yargs');

yargs.alias({
	h: 'help',
	ver: 'version',
	c: 'color',
	v: 'verbosity',
	p: 'port'
});

yargs.boolean(['h', 'ver', 'c']);

yargs.default({
	v: 1,
	p: 80
});

yargs.describe({
	h: 'This',
	c: 'Enables colored logs',
	v: '<level>',
	p: '<port>'
});

var args = yargs.argv;

if(args.dbg){
	args.c = true;
	args.v = Number(args.dbg);
}

else if(args.v) args.v = Number(args.v);

//log args polyfill
process.env.DBG = args.v;
process.env.COLOR = args.ver || args.c;

const log = require('log');

log('[humanity] Starting');
log(1)(args);

require('./humanity');