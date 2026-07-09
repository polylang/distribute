import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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
	const steps = {
		composer: existsSync( path.join( cwd, 'composer.json' ) ),
		npm: existsSync( path.join( cwd, 'package.json' ) ),
		npmScript: null,
	};

	if ( ! steps.npm ) {
		return steps;
	}

	const packageJson = JSON.parse(
		readFileSync( path.join( cwd, 'package.json' ), 'utf8' )
	);
	const script = npmCmd ?? ( mode === 'dev' ? 'build:dev' : 'build' );

	if ( ! packageJson.scripts?.[ script ] ) {
		throw new Error(
			`Error: npm script "${ script }" not found in package.json. Pass --npm-cmd <script> to use a different script.`
		);
	}

	steps.npmScript = script;
	return steps;
}
