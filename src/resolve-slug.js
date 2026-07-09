import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolve the plugin slug from package.json or an override.
 *
 * @param {Object} options
 * @param {string} options.cwd            Consumer project root.
 * @param {string} [options.slugOverride]
 * @return {string} Plugin slug.
 */
export function resolveSlug( { cwd, slugOverride } ) {
	if ( slugOverride ) {
		return slugOverride;
	}

	const packageJsonPath = path.join( cwd, 'package.json' );

	let packageJson;

	try {
		packageJson = JSON.parse( readFileSync( packageJsonPath, 'utf8' ) );
	} catch {
		throw new Error(
			`package.json not found in ${ cwd }. Add package.json or pass --slug.`
		);
	}

	if ( ! packageJson.name ) {
		throw new Error( 'package.json is missing a name field.' );
	}

	return stripScope( packageJson.name );
}

/**
 * @param {string} name Package name.
 * @return {string} Slug without scope prefix.
 */
function stripScope( name ) {
	return name.replace( /^@wpsyntex\//, '' ).replace( /^@[^/]+\//, '' );
}
