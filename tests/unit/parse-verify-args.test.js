import path from 'node:path';

import { parseVerifyArgs, showVerifyHelp } from '../../src/parse-verify-args.js';

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

	it( 'prints help text', () => {
		expect( showVerifyHelp() ).toContain( '--tmp-dir' );
		expect( showVerifyHelp() ).toContain( '{cwd}/tmp' );
	} );
} );
