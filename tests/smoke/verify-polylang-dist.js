/* eslint-disable no-console */

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDistribute } from '../../src/run-distribute.js';
import { VERIFY_DIST_TMP_PREFIX, verifyDist } from '../../src/verify-dist.js';
import { runCommand } from '../../src/run-command.js';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const MANIFEST_PATH = path.join( __dirname, 'polylang-dist-manifest.json' );
const POLYLANG_REPO = 'https://github.com/polylang/polylang.git';

/**
 * Remove verify-dist work directories from the consumer tmp folder.
 *
 * @param {string} consumerDir Consumer project root.
 */
function cleanupVerifyDistTmp( consumerDir ) {
	const tmpDir = path.join( consumerDir, 'tmp' );

	if ( ! existsSync( tmpDir ) ) {
		return;
	}

	for ( const entry of readdirSync( tmpDir ) ) {
		if ( entry.startsWith( VERIFY_DIST_TMP_PREFIX ) ) {
			rmSync( path.join( tmpDir, entry ), {
				recursive: true,
				force: true,
			} );
		}
	}
}

/**
 * Remove smoke-test artifacts from a disposable clone.
 *
 * @param {string} consumerDir Cloned consumer project root.
 */
function cleanupSmokeArtifacts( consumerDir ) {
	if ( ! consumerDir || ! existsSync( consumerDir ) ) {
		return;
	}

	for ( const dirName of [ 'dist', '.distribute-tmp' ] ) {
		const artifactDir = path.join( consumerDir, dirName );

		if ( existsSync( artifactDir ) ) {
			rmSync( artifactDir, { recursive: true, force: true } );
		}
	}

	cleanupVerifyDistTmp( consumerDir );
	rmSync( consumerDir, { recursive: true, force: true } );
}

/**
 * Clone polylang into a temp directory.
 *
 * @return {Promise<string>} Absolute path to the cloned project root.
 */
async function cloneConsumerRepo() {
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
	let exitCode = 0;

	try {
		consumerDir = await cloneConsumerRepo();

		console.log( `Running distribute in ${ consumerDir }` );

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
		exitCode = 1;
	} finally {
		cleanupSmokeArtifacts( consumerDir );
	}

	process.exit( exitCode );
}

main();
