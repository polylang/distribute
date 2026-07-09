/* eslint-disable no-console */

import {
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
	rmSync,
	unlinkSync,
} from 'node:fs';
import path from 'node:path';

import { detectBuildSteps } from './detect-build-steps.js';
import { resolveSlug } from './resolve-slug.js';
import { resolveVersion } from './resolve-version.js';
import { runCommand } from './run-command.js';

/**
 * Resolve the ZIP output path.
 *
 * @param {Object} options
 * @param {string} options.output  Output directory or ZIP file path.
 * @param {string} options.slug    Plugin slug.
 * @param {string} options.version Distribution version.
 * @param {string} options.mode    Distribution mode.
 * @return {string} Absolute ZIP output path.
 */
export function resolveOutputPath( { output, slug, version, mode } ) {
	const suffix = mode === 'dev' ? '-dev' : '';
	const fileName = `${ slug }-${ version }${ suffix }.zip`;

	if ( output.endsWith( '.zip' ) ) {
		return output;
	}

	return path.join( output, fileName );
}

/**
 * Clean the output target before creating the ZIP.
 *
 * @param {string} outputPath Resolved ZIP path.
 * @param {string} outputArg  Original --output value.
 */
export function cleanOutputTarget( outputPath, outputArg ) {
	if ( outputArg.endsWith( '.zip' ) ) {
		if ( existsSync( outputPath ) ) {
			unlinkSync( outputPath );
		}

		mkdirSync( path.dirname( outputPath ), { recursive: true } );
		return;
	}

	mkdirSync( outputArg, { recursive: true } );

	for ( const entry of readdirSync( outputArg ) ) {
		rmSync( path.join( outputArg, entry ), {
			recursive: true,
			force: true,
		} );
	}
}

/**
 * Build and package a WordPress plugin distribution ZIP.
 *
 * @param {Object} options Parsed CLI options.
 * @return {Promise<string>} Path to the created ZIP file.
 */
export async function runDistribute( options ) {
	const {
		cwd,
		mode,
		version: versionStrategy,
		output,
		slug: slugOverride,
		tmpDir,
		sequential,
		npmCmd,
	} = options;

	const slug = resolveSlug( { cwd, slugOverride } );
	const version = await resolveVersion( versionStrategy, { cwd } );
	const outputPath = resolveOutputPath( {
		output,
		slug,
		version,
		mode,
	} );
	const distignorePath = path.join( cwd, '.distignore' );

	if ( ! existsSync( distignorePath ) ) {
		throw new Error(
			`.distignore not found at ${ distignorePath }. Create one at the project root before distributing.`
		);
	}

	const steps = detectBuildSteps( { cwd, mode, npmCmd } );

	if ( steps.composer ) {
		console.log( 'Composer build step detected.' );
	} else {
		console.log( 'No composer.json found; skipping Composer step.' );
	}

	if ( steps.npm ) {
		console.log(
			`NPM build step detected (script: ${ steps.npmScript }).`
		);
	} else if ( existsSync( path.join( cwd, 'package.json' ) ) ) {
		const script =
			npmCmd ?? ( mode === 'dev' ? 'build:dev' : 'build' );
		console.log(
			`No npm script "${ script }" found; skipping NPM step.`
		);
	} else {
		console.log( 'No package.json found; skipping NPM step.' );
	}

	await runBuildSteps( {
		cwd,
		mode,
		sequential,
		steps,
	} );

	const stagingDir = path.join( tmpDir, slug );
	const tempZipPath = path.join( tmpDir, path.basename( outputPath ) );

	mkdirSync( tmpDir, { recursive: true } );

	try {
		mkdirSync( stagingDir, { recursive: true } );

		await runCommand(
			'rsync',
			[
				'-rc',
				'--delete',
				'--delete-excluded',
				`--exclude-from=${ distignorePath }`,
				'.',
				`${ stagingDir }/`,
			],
			{ cwd }
		);

		await runCommand( 'zip', [ '-r', tempZipPath, slug ], { cwd: tmpDir } );

		cleanOutputTarget( outputPath, output );
		mkdirSync( path.dirname( outputPath ), { recursive: true } );
		renameSync( tempZipPath, outputPath );

		console.log( `Distribution created at: ${ outputPath }` );
		return outputPath;
	} finally {
		rmSync( stagingDir, { recursive: true, force: true } );

		if ( existsSync( tempZipPath ) ) {
			unlinkSync( tempZipPath );
		}
	}
}

/**
 * Run detected build steps in parallel or sequence.
 *
 * @param {Object}  options
 * @param {string}  options.cwd        Consumer project root.
 * @param {string}  options.mode       Distribution mode.
 * @param {boolean} options.sequential Whether to run steps sequentially.
 * @param {Object}  options.steps      Detected build steps.
 */
async function runBuildSteps( { cwd, mode, sequential, steps } ) {
	const tasks = [];

	if ( steps.composer ) {
		tasks.push( {
			name: 'composer',
			run: ( signal ) => runComposer( { cwd, mode, signal } ),
		} );
	}

	if ( steps.npm ) {
		tasks.push( {
			name: 'npm',
			run: ( signal ) =>
				runNpm( { cwd, npmScript: steps.npmScript, signal } ),
		} );
	}

	if ( tasks.length === 0 ) {
		return;
	}

	if ( tasks.length === 1 || sequential ) {
		for ( const task of tasks ) {
			await task.run();
		}

		return;
	}

	const controller = new AbortController();

	try {
		await Promise.all(
			tasks.map( ( task ) => task.run( controller.signal ) )
		);
	} catch ( error ) {
		controller.abort();
		throw error;
	}
}

/**
 * Run the Composer install step.
 *
 * @param {Object}      options
 * @param {string}      options.cwd      Consumer project root.
 * @param {string}      options.mode     Distribution mode.
 * @param {AbortSignal} [options.signal] Abort signal.
 */
async function runComposer( { cwd, mode, signal } ) {
	if ( mode === 'production' ) {
		await runCommand( 'rm', [ '-rf', 'vendor' ], {
			cwd,
			prefix: 'composer',
			signal,
		} );
		await runCommand( 'rm', [ '-f', 'composer.lock' ], {
			cwd,
			prefix: 'composer',
			signal,
		} );
		await runCommand(
			'composer',
			[ 'install', '--optimize-autoloader', '--no-dev' ],
			{ cwd, prefix: 'composer', signal }
		);
		return;
	}

	await runCommand( 'composer', [ 'install' ], {
		cwd,
		prefix: 'composer',
		signal,
	} );
}

/**
 * Run the NPM install and build step.
 *
 * @param {Object}      options
 * @param {string}      options.cwd       Consumer project root.
 * @param {string}      options.npmScript NPM script to run.
 * @param {AbortSignal} [options.signal]  Abort signal.
 */
async function runNpm( { cwd, npmScript, signal } ) {
	const installArgs = existsSync( path.join( cwd, 'package-lock.json' ) )
		? [ 'ci' ]
		: [ 'install' ];

	await runCommand( 'npm', installArgs, { cwd, prefix: 'npm', signal } );
	await runCommand( 'npm', [ 'run', npmScript ], {
		cwd,
		prefix: 'npm',
		signal,
	} );
}
