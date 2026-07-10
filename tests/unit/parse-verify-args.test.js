import path from 'node:path';

import {
	parseVerifyArgs,
	showVerifyHelp,
} from '../../src/parse-verify-args.js';

describe( 'parseVerifyArgs', () => {
	const cwd = '/project';

	it( 'returns defaults', () => {
		expect( parseVerifyArgs( [], { cwd } ) ).toEqual( {
			zip: undefined,
			manifest: path.join( cwd, 'dist-manifest.json' ),
			tmpDir: path.join( cwd, 'tmp' ),
			cwd,
			help: false,
		} );
	} );

	it( 'resolves zip, manifest, and tmp-dir against cwd', () => {
		expect(
			parseVerifyArgs(
				[
					'--zip',
					'dist/plugin.zip',
					'--manifest',
					'manifests/prod.json',
					'--tmp-dir',
					'.cache/tmp',
				],
				{ cwd }
			)
		).toEqual( {
			zip: path.join( cwd, 'dist/plugin.zip' ),
			manifest: path.join( cwd, 'manifests/prod.json' ),
			tmpDir: path.join( cwd, '.cache/tmp' ),
			cwd,
			help: false,
		} );
	} );

	it( 'resolves absolute zip, manifest, and tmp-dir paths', () => {
		const options = parseVerifyArgs(
			[
				'--zip',
				'/tmp/plugin.zip',
				'--manifest',
				'/tmp/manifest.json',
				'--tmp-dir',
				'/tmp/stage',
			],
			{ cwd }
		);

		expect( options.zip ).toBe( '/tmp/plugin.zip' );
		expect( options.manifest ).toBe( '/tmp/manifest.json' );
		expect( options.tmpDir ).toBe( '/tmp/stage' );
	} );

	it( 'sets help for --help', () => {
		expect( parseVerifyArgs( [ '--help' ], { cwd } ).help ).toBe( true );
		expect( parseVerifyArgs( [ '-h' ], { cwd } ).help ).toBe( true );
	} );

	it( 'throws for unknown options', () => {
		expect( () => parseVerifyArgs( [ '--unknown' ], { cwd } ) ).toThrow(
			'Unknown option: --unknown'
		);
	} );

	it( 're-anchors relative zip, manifest, and tmp-dir to final --cwd', () => {
		const options = parseVerifyArgs(
			[
				'--zip',
				'dist/plugin.zip',
				'--manifest',
				'manifests/prod.json',
				'--tmp-dir',
				'.cache/tmp',
				'--cwd',
				'other',
			],
			{ cwd }
		);

		expect( options.cwd ).toBe( path.join( cwd, 'other' ) );
		expect( options.zip ).toBe(
			path.join( cwd, 'other', 'dist/plugin.zip' )
		);
		expect( options.manifest ).toBe(
			path.join( cwd, 'other', 'manifests/prod.json' )
		);
		expect( options.tmpDir ).toBe(
			path.join( cwd, 'other', '.cache/tmp' )
		);
	} );

	it( 'throws when a value flag is missing its value', () => {
		expect( () => parseVerifyArgs( [ '--zip' ], { cwd } ) ).toThrow(
			'Missing value for --zip.'
		);
		expect( () =>
			parseVerifyArgs( [ '--manifest', '--cwd', 'other' ], { cwd } )
		).toThrow( 'Missing value for --manifest.' );
	} );
} );

describe( 'showVerifyHelp', () => {
	it( 'documents CLI options', () => {
		expect( showVerifyHelp() ).toContain( '--tmp-dir' );
		expect( showVerifyHelp() ).toContain( '{cwd}/tmp' );
		expect( showVerifyHelp() ).toContain( '--zip <path>' );
	} );
} );
