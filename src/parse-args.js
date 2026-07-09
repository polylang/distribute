import path from 'node:path';

const VALID_MODES = new Set( [ 'production', 'dev' ] );

/**
 * Print CLI help text.
 *
 * @return {string} Help message.
 */
export function showHelp() {
	return `distribute [options]

Options:
  --mode <production|dev>     Default: production
  --version <strategy|text>   Default: commit
  --output <path>             Output directory or ZIP file path (default: {cwd}/dist)
  --slug <name>               Override slug (default: from package.json name)
  --tmp-dir <path>            Temp working directory (default: {cwd}/.distribute-tmp)
  --sequential                Run composer then npm (default: parallel when both apply)
  --npm-cmd <script>          Override npm script to run (default: build or build:dev per mode)
  --cwd <path>                Project root (default: process.cwd())
  -h, --help`;
}

/**
 * Parse CLI arguments.
 *
 * @param {string[]} argv        Raw argv slice (without node and script path).
 * @param {Object}   options
 * @param {string}   options.cwd Default working directory.
 * @return {Object} Parsed CLI options.
 */
export function parseArgs( argv, { cwd = process.cwd() } = {} ) {
	const options = {
		mode: 'production',
		version: 'commit',
		slug: undefined,
		sequential: false,
		npmCmd: undefined,
		cwd,
		help: false,
	};
	let outputValue = 'dist';
	let tmpDirValue = '.distribute-tmp';

	for ( let index = 0; index < argv.length; index++ ) {
		const arg = argv[ index ];

		switch ( arg ) {
			case '-h':
			case '--help':
				options.help = true;
				break;
			case '--mode':
				options.mode = argv[ ++index ];
				break;
			case '--version':
				options.version = argv[ ++index ];
				break;
			case '--output':
				outputValue = argv[ ++index ];
				break;
			case '--slug':
				options.slug = argv[ ++index ];
				break;
			case '--tmp-dir':
				tmpDirValue = argv[ ++index ];
				break;
			case '--sequential':
				options.sequential = true;
				break;
			case '--npm-cmd':
				options.npmCmd = argv[ ++index ];
				break;
			case '--cwd':
				options.cwd = resolvePath( argv[ ++index ], cwd );
				break;
			default:
				throw new Error( `Unknown option: ${ arg }` );
		}
	}

	if ( ! VALID_MODES.has( options.mode ) ) {
		throw new Error(
			`Invalid mode "${ options.mode }". Expected production or dev.`
		);
	}

	options.output = resolvePath( outputValue, options.cwd );
	options.tmpDir = resolvePath( tmpDirValue, options.cwd );

	return options;
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
