import path from 'node:path';

import { parseArgs, showHelp } from '../src/parse-args.js';

describe( 'parseArgs', () => {
	const cwd = '/project';

	it( 'returns defaults', () => {
		expect( parseArgs( [], { cwd } ) ).toEqual( {
			mode: 'production',
			version: 'commit',
			output: path.join( cwd, 'dist' ),
			slug: undefined,
			tmpDir: path.join( cwd, '.distribute-tmp' ),
			sequential: false,
			npmCmd: undefined,
			cwd,
			help: false,
		} );
	} );

	it( 'parses all flags', () => {
		const options = parseArgs(
			[
				'--mode',
				'dev',
				'--version',
				'3.8.0',
				'--output',
				'artifacts',
				'--slug',
				'custom-slug',
				'--tmp-dir',
				'.tmp',
				'--sequential',
				'--npm-cmd',
				'build:staging',
				'--cwd',
				'other',
			],
			{ cwd }
		);

		expect( options ).toEqual( {
			mode: 'dev',
			version: '3.8.0',
			output: path.join( cwd, 'artifacts' ),
			slug: 'custom-slug',
			tmpDir: path.join( cwd, '.tmp' ),
			sequential: true,
			npmCmd: 'build:staging',
			cwd: path.join( cwd, 'other' ),
			help: false,
		} );
	} );

	it( 'resolves absolute output and tmp-dir paths', () => {
		const options = parseArgs(
			[ '--output', '/tmp/out.zip', '--tmp-dir', '/tmp/stage' ],
			{ cwd }
		);

		expect( options.output ).toBe( '/tmp/out.zip' );
		expect( options.tmpDir ).toBe( '/tmp/stage' );
	} );

	it( 'sets help for --help', () => {
		expect( parseArgs( [ '--help' ], { cwd } ).help ).toBe( true );
		expect( parseArgs( [ '-h' ], { cwd } ).help ).toBe( true );
	} );

	it( 'throws for invalid mode', () => {
		expect( () => parseArgs( [ '--mode', 'staging' ], { cwd } ) ).toThrow(
			'Invalid mode "staging". Expected production or dev.'
		);
	} );

	it( 'throws for unknown options', () => {
		expect( () => parseArgs( [ '--unknown' ], { cwd } ) ).toThrow(
			'Unknown option: --unknown'
		);
	} );
} );

describe( 'showHelp', () => {
	it( 'documents CLI options', () => {
		expect( showHelp() ).toContain( '--mode <production|dev>' );
		expect( showHelp() ).toContain( '--tmp-dir <path>' );
	} );
} );
