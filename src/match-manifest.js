import { minimatch } from 'minimatch';

/**
 * Normalize a manifest pattern for matching.
 *
 * @param {string} pattern Manifest entry.
 * @return {string} Normalized pattern.
 */
export function normalizePattern( pattern ) {
	if ( pattern.endsWith( '/' ) ) {
		return `${ pattern }**`;
	}

	return pattern;
}

/**
 * Check whether a file path matches a manifest pattern.
 *
 * @param {string} filePath Relative file path inside the plugin root.
 * @param {string} pattern  Manifest entry.
 * @return {boolean} Whether the file matches.
 */
export function fileMatchesPattern( filePath, pattern ) {
	if ( ! pattern.includes( '*' ) && ! pattern.includes( '?' ) ) {
		if ( pattern.endsWith( '/' ) ) {
			return filePath.startsWith( pattern );
		}

		return filePath === pattern;
	}

	return minimatch( filePath, normalizePattern( pattern ), {
		dot: true,
	} );
}

/**
 * Check whether a manifest pattern is satisfied by at least one file.
 *
 * @param {string}   pattern Manifest entry.
 * @param {string[]} files   Actual file paths.
 * @return {boolean} Whether the pattern is satisfied.
 */
export function patternIsSatisfied( pattern, files ) {
	return files.some( ( filePath ) => fileMatchesPattern( filePath, pattern ) );
}

/**
 * Compare actual ZIP files against manifest patterns.
 *
 * @param {string[]} actualFiles File paths relative to the plugin root.
 * @param {string[]} patterns    Manifest entries.
 * @return {{ unexpected: string[], unsatisfied: string[] }} Comparison result.
 */
export function matchManifest( actualFiles, patterns ) {
	const unexpected = actualFiles.filter(
		( filePath ) =>
			! patterns.some( ( pattern ) =>
				fileMatchesPattern( filePath, pattern )
			)
	);

	const unsatisfied = patterns.filter(
		( pattern ) => ! patternIsSatisfied( pattern, actualFiles )
	);

	return {
		unexpected: unexpected.sort(),
		unsatisfied: unsatisfied.sort(),
	};
}
