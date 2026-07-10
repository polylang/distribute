#!/usr/bin/env node
/* eslint-disable no-console */

import { parseVerifyArgs, showVerifyHelp } from '../src/parse-verify-args.js';
import { verifyDist } from '../src/verify-dist.js';

async function main() {
	const options = parseVerifyArgs( process.argv.slice( 2 ) );

	if ( options.help ) {
		console.log( showVerifyHelp() );
		process.exit( 0 );
	}

	if ( ! options.zip ) {
		console.error( 'Missing required option: --zip' );
		process.exit( 1 );
	}

	try {
		await verifyDist( {
			zipPath: options.zip,
			manifestPath: options.manifest,
			tmpDir: options.tmpDir,
		} );
	} catch ( error ) {
		console.error( error instanceof Error ? error.message : error );
		process.exit( 1 );
	}
}

main();
