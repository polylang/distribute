import path from 'node:path';

/**
 * Print verify-dist CLI help text.
 *
 * @return {string} Help message.
 */
export function showVerifyHelp() {
	return `verify-dist [options]

Options:
  --zip <path>        Path to distribution ZIP (required)
  --manifest <path>   Path to dist-manifest.json (default: {cwd}/dist-manifest.json)
  --tmp-dir <path>    Temp working directory (default: {cwd}/tmp)
  --cwd <path>        Consumer project root (default: process.cwd())
  -h, --help`;
}

/**
 * Parse verify-dist CLI arguments.
 *
 * @param {string[]} argv        Raw argv slice (without node and script path).
 * @param {Object}   options
 * @param {string}   options.cwd Default working directory.
 * @return {Object} Parsed CLI options.
 */
export function parseVerifyArgs( argv, { cwd = process.cwd() } = {} ) {
	const options = {
		zip: undefined,
		manifest: 'dist-manifest.json',
		tmpDir: 'tmp',
		cwd,
		help: false,
	};

	for ( let index = 0; index < argv.length; index++ ) {
		const arg = argv[ index ];

		switch ( arg ) {
			case '-h':
			case '--help':
				options.help = true;
				break;
			case '--zip':
				options.zip = readArgvValue( argv, index, arg );
				index++;
				break;
			case '--manifest':
				options.manifest = readArgvValue( argv, index, arg );
				index++;
				break;
			case '--tmp-dir':
				options.tmpDir = readArgvValue( argv, index, arg );
				index++;
				break;
			case '--cwd':
				options.cwd = resolvePath(
					readArgvValue( argv, index, arg ),
					cwd
				);
				index++;
				break;
			default:
				throw new Error( `Unknown option: ${ arg }` );
		}
	}

	options.manifest = resolvePath( options.manifest, options.cwd );
	options.tmpDir = resolvePath( options.tmpDir, options.cwd );

	if ( options.zip ) {
		options.zip = resolvePath( options.zip, options.cwd );
	}

	return options;
}

/**
 * Read the value following a flag from argv.
 *
 * @param {string[]} argv  Raw argv slice.
 * @param {number}   index Current flag index.
 * @param {string}   flag  Flag name.
 * @return {string} Flag value.
 */
function readArgvValue( argv, index, flag ) {
	const value = argv[ index + 1 ];

	if ( ! value || value.startsWith( '-' ) ) {
		throw new Error( `Missing value for ${ flag }.` );
	}

	return value;
}

/**
 * Resolve a path against cwd when relative.
 *
 * @param {string} value Path value.
 * @param {string} cwd   Base directory.
 * @return {string} Resolved absolute path.
 */
function resolvePath( value, cwd ) {
	return path.isAbsolute( value ) ? value : path.join( cwd, value );
}
