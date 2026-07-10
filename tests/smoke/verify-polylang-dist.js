/* eslint-disable no-console */

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDistribute } from '../../src/run-distribute.js';
import { verifyDist } from '../../src/verify-dist.js';
import { runCommand } from '../../src/run-command.js';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const MANIFEST_PATH = path.join( __dirname, 'polylang-dist-manifest.json' );
const POLYLANG_REPO =
	process.env.POLYLANG_REPO ?? 'https://github.com/polylang/polylang.git';

/**
 * Clone polylang into a temp directory unless a local repo path is provided.
 *
 * @return {Promise<string>} Absolute path to the consumer project root.
 */
async function prepareConsumerRepo() {
	if ( existsSync( POLYLANG_REPO ) ) {
		return POLYLANG_REPO;
	}

	const cloneDir = mkdtempSync( path.join( os.tmpdir(), 'polylang-smoke-' ) );

	await runCommand(
		'git',
		[ 'clone', '--depth', '1', POLYLANG_REPO, cloneDir ],
		{ silent: true }
	);

	return cloneDir;
}

/**
 * Resolve the distribution ZIP created by runDistribute.
 *
 * @param {string} consumerDir Consumer project root.
 * @return {string} Absolute ZIP path.
 */
function resolveZipPath( consumerDir ) {
	const distDir = path.join( consumerDir, 'dist' );
	const zips = readdirSync( distDir ).filter( ( entry ) =>
		entry.endsWith( '.zip' )
	);

	if ( zips.length === 0 ) {
		throw new Error( `No ZIP file found in ${ distDir }.` );
	}

	return path.join( distDir, zips[ 0 ] );
}

async function main() {
	let consumerDir;
	let shouldCleanup = false;

	try {
		if ( existsSync( POLYLANG_REPO ) ) {
			consumerDir = POLYLANG_REPO;
		} else {
			consumerDir = await prepareConsumerRepo();
			shouldCleanup = true;
		}

		console.log( `Running distribute in ${ consumerDir }` );

		const distDir = path.join( consumerDir, 'dist' );
		if ( existsSync( distDir ) ) {
			rmSync( distDir, { recursive: true, force: true } );
		}

		await runDistribute( {
			cwd: consumerDir,
			mode: 'production',
			version: 'smoke-test',
			output: path.join( consumerDir, 'dist' ),
			tmpDir: path.join( consumerDir, '.distribute-tmp' ),
			sequential: true,
			npmCmd: undefined,
			slug: undefined,
			help: false,
		} );

		const zipPath = resolveZipPath( consumerDir );

		console.log( `Verifying ${ zipPath }` );

		await verifyDist( {
			zipPath,
			manifestPath: MANIFEST_PATH,
			tmpDir: path.join( consumerDir, 'tmp' ),
		} );

		console.log( 'Polylang smoke test passed.' );
	} catch ( error ) {
		console.error( error instanceof Error ? error.message : error );
		process.exit( 1 );
	} finally {
		if ( shouldCleanup && consumerDir ) {
			rmSync( consumerDir, { recursive: true, force: true } );
		}
	}
}

main();
