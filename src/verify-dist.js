/* eslint-disable no-console */

import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
} from 'node:fs';
import path from 'node:path';

import { matchManifest } from './match-manifest.js';
import { runCommand } from './run-command.js';

/**
 * Load and validate a dist-manifest.json file.
 *
 * @param {string} manifestPath Path to dist-manifest.json.
 * @return {string[]} Manifest entries.
 */
export function loadManifest( manifestPath ) {
	if ( ! existsSync( manifestPath ) ) {
		throw new Error(
			`dist-manifest.json not found at ${ manifestPath }. Create one before verifying.`
		);
	}

	const manifest = JSON.parse( readFileSync( manifestPath, 'utf8' ) );

	if ( ! Array.isArray( manifest.files ) || manifest.files.length === 0 ) {
		throw new Error(
			`Invalid manifest at ${ manifestPath }: "files" must be a non-empty array.`
		);
	}

	return manifest.files.map( ( entry ) => String( entry ) );
}

/**
 * Walk a directory recursively and return file paths relative to rootDir.
 *
 * @param {string} rootDir Directory to walk.
 * @return {string[]} Relative file paths.
 */
export function walkFiles( rootDir ) {
	const files = [];

	function walk( currentDir, prefix = '' ) {
		for ( const entry of readdirSync( currentDir, { withFileTypes: true } ) ) {
			const relativePath = prefix ? `${ prefix }/${ entry.name }` : entry.name;

			if ( entry.isDirectory() ) {
				walk( path.join( currentDir, entry.name ), relativePath );
				continue;
			}

			if ( entry.isFile() ) {
				files.push( relativePath );
			}
		}
	}

	walk( rootDir );
	return files.sort();
}

/**
 * Resolve the single plugin root directory inside an unzip directory.
 *
 * @param {string} unzipDir Directory containing the unzipped archive.
 * @return {string} Absolute path to the plugin root.
 */
export function resolvePluginRoot( unzipDir ) {
	const entries = readdirSync( unzipDir, { withFileTypes: true } ).filter(
		( entry ) => entry.isDirectory()
	);

	if ( entries.length !== 1 ) {
		throw new Error(
			`Expected exactly one top-level directory in the ZIP, found ${ entries.length }.`
		);
	}

	return path.join( unzipDir, entries[ 0 ].name );
}

/**
 * Create a temp directory for verify-dist operations.
 *
 * @param {string} tmpDir Configured temp parent directory.
 * @return {string} Absolute path to a unique temp directory.
 */
export function createWorkDir( tmpDir ) {
	mkdirSync( tmpDir, { recursive: true } );
	return mkdtempSync( path.join( tmpDir, 'verify-dist-' ) );
}

/**
 * Unzip an archive and return file paths relative to the plugin root.
 *
 * @param {Object} options
 * @param {string} options.zipPath Path to the ZIP file.
 * @param {string} options.tmpDir  Temp parent directory.
 * @return {Promise<string[]>} Relative file paths inside the plugin root.
 */
export async function listZipFiles( { zipPath, tmpDir } ) {
	const workDir = createWorkDir( tmpDir );

	try {
		await runCommand( 'unzip', [ '-q', zipPath, '-d', workDir ], {
			silent: true,
		} );

		const pluginRoot = resolvePluginRoot( workDir );
		return walkFiles( pluginRoot );
	} finally {
		rmSync( workDir, { recursive: true, force: true } );
	}
}

/**
 * Collapse a file list into exact paths and directory-prefix entries.
 *
 * @param {string[]} files File paths relative to the plugin root.
 * @return {{ files: string[] }} Manifest-shaped object.
 */
export function compactToManifest( files ) {
	const topLevel = new Set();
	const directories = new Set();

	for ( const filePath of files ) {
		const slashIndex = filePath.indexOf( '/' );

		if ( slashIndex === -1 ) {
			topLevel.add( filePath );
			continue;
		}

		directories.add( `${ filePath.slice( 0, slashIndex ) }/` );
	}

	return {
		files: [ ...topLevel, ...directories ].sort(),
	};
}

/**
 * Verify a distribution ZIP against a dist-manifest.json file.
 *
 * @param {Object} options
 * @param {string} options.zipPath      Path to the distribution ZIP.
 * @param {string} options.manifestPath Path to dist-manifest.json.
 * @param {string} options.tmpDir       Temp parent directory.
 * @return {Promise<string[]>} Actual file paths from the ZIP.
 */
export async function verifyDist( { zipPath, manifestPath, tmpDir } ) {
	if ( ! existsSync( zipPath ) ) {
		throw new Error( `ZIP file not found at ${ zipPath }.` );
	}

	const patterns = loadManifest( manifestPath );
	const actualFiles = await listZipFiles( { zipPath, tmpDir } );
	const { unexpected, unsatisfied } = matchManifest( actualFiles, patterns );

	if ( unexpected.length === 0 && unsatisfied.length === 0 ) {
		console.log(
			`Distribution verified: ${ actualFiles.length } files match manifest.`
		);
		return actualFiles;
	}

	const details = [];

	if ( unexpected.length > 0 ) {
		details.push(
			`Unexpected files (${ unexpected.length }):\n${ unexpected
				.map( ( filePath ) => `  - ${ filePath }` )
				.join( '\n' ) }`
		);
	}

	if ( unsatisfied.length > 0 ) {
		details.push(
			`Unsatisfied manifest entries (${ unsatisfied.length }):\n${ unsatisfied
				.map( ( pattern ) => `  - ${ pattern }` )
				.join( '\n' ) }`
		);
	}

	throw new Error( `Distribution verification failed.\n\n${ details.join( '\n\n' ) }` );
}
