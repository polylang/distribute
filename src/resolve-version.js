import { runCommand } from './run-command.js';

/**
 * Resolve a distribution version from strategy or literal text.
 *
 * @param {string} strategy    Version strategy or literal.
 * @param {Object} options
 * @param {string} options.cwd Working directory for git commands.
 * @return {Promise<string>} Resolved version string.
 */
export async function resolveVersion( strategy, { cwd } ) {
	if ( strategy !== 'commit' && strategy !== 'tag' ) {
		return strategy;
	}

	if ( strategy === 'tag' ) {
		const tag = await resolveTagVersion( cwd );

		if ( tag ) {
			return tag;
		}
	}

	const commit = await resolveCommitVersion( cwd );

	if ( commit ) {
		return commit;
	}

	return timestampVersion();
}

/**
 * @param {string} cwd
 * @return {Promise<string|undefined>} Short commit hash when available.
 */
async function resolveCommitVersion( cwd ) {
	const result = await runCommand(
		'git',
		[ 'rev-parse', '--short', 'HEAD' ],
		{ cwd, silent: true, nothrow: true }
	);

	if ( result.code === 0 ) {
		return result.stdout.trim();
	}

	return undefined;
}

/**
 * @param {string} cwd
 * @return {Promise<string|undefined>} Latest tag name when available.
 */
async function resolveTagVersion( cwd ) {
	const result = await runCommand(
		'git',
		[ 'describe', '--tags', '--abbrev=0' ],
		{ cwd, silent: true, nothrow: true }
	);

	if ( result.code === 0 ) {
		return result.stdout.trim().replace( /^v/, '' );
	}

	return undefined;
}

/**
 * @return {string} YYYYMMDD fallback version.
 */
function timestampVersion() {
	return new Date().toISOString().slice( 0, 10 ).replace( /-/g, '' );
}
