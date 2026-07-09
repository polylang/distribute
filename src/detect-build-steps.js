import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolve the npm script to run, if any.
 *
 * @param {Object} options
 * @param {string} options.cwd      Consumer project root.
 * @param {string} options.mode     Distribution mode.
 * @param {string} [options.npmCmd]
 * @return {string|null} NPM script name or null when the step should be skipped.
 */
function resolveNpmScript( { cwd, mode, npmCmd } ) {
	if ( ! existsSync( path.join( cwd, 'package.json' ) ) ) {
		return null;
	}

	const packageJson = JSON.parse(
		readFileSync( path.join( cwd, 'package.json' ), 'utf8' )
	);
	const script = npmCmd ?? ( mode === 'dev' ? 'build:dev' : 'build' );

	if ( ! packageJson.scripts?.[ script ] ) {
		if ( npmCmd ) {
			throw new Error(
				`Error: npm script "${ script }" not found in package.json. Pass --npm-cmd <script> to use a different script.`
			);
		}

		return null;
	}

	return script;
}

/**
 * Detect applicable build steps and validate npm scripts.
 *
 * @param {Object} options
 * @param {string} options.cwd      Consumer project root.
 * @param {string} options.mode     Distribution mode.
 * @param {string} [options.npmCmd]
 * @return {{ composer: boolean, npm: boolean, npmScript: string|null }} Detected build steps.
 */
export function detectBuildSteps( { cwd, mode, npmCmd } ) {
	const npmScript = resolveNpmScript( { cwd, mode, npmCmd } );

	return {
		composer: existsSync( path.join( cwd, 'composer.json' ) ),
		npm: npmScript !== null,
		npmScript,
	};
}
