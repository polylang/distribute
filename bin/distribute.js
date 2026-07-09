#!/usr/bin/env node
/* eslint-disable no-console */

import { parseArgs, showHelp } from '../src/parse-args.js';
import { runDistribute } from '../src/run-distribute.js';

async function main() {
	const options = parseArgs( process.argv.slice( 2 ) );

	if ( options.help ) {
		console.log( showHelp() );
		process.exit( 0 );
	}

	try {
		await runDistribute( options );
	} catch ( error ) {
		console.error( error instanceof Error ? error.message : error );
		process.exit( 1 );
	}
}

main();
