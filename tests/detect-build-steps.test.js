import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { detectBuildSteps } from '../src/detect-build-steps.js';

describe( 'detectBuildSteps', () => {
	let tempDir;

	beforeEach( () => {
		tempDir = mkdtempSync( path.join( os.tmpdir(), 'distribute-detect-' ) );
	} );

	afterEach( () => {
		rmSync( tempDir, { recursive: true, force: true } );
	} );

	it( 'detects composer and npm steps', () => {
		writeFileSync( path.join( tempDir, 'composer.json' ), '{}' );
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( { scripts: { build: 'webpack' } } )
		);

		expect(
			detectBuildSteps( { cwd: tempDir, mode: 'production' } )
		).toEqual( {
			composer: true,
			npm: true,
			npmScript: 'build',
		} );
	} );

	it( 'skips steps when manifests are missing', () => {
		expect(
			detectBuildSteps( { cwd: tempDir, mode: 'production' } )
		).toEqual( {
			composer: false,
			npm: false,
			npmScript: null,
		} );
	} );

	it( 'uses build:dev in dev mode', () => {
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( {
				scripts: { 'build:dev': 'webpack --mode development' },
			} )
		);

		expect(
			detectBuildSteps( { cwd: tempDir, mode: 'dev' } ).npmScript
		).toBe( 'build:dev' );
	} );

	it( 'honors --npm-cmd override', () => {
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( { scripts: { 'build:staging': 'webpack' } } )
		);

		expect(
			detectBuildSteps( {
				cwd: tempDir,
				mode: 'dev',
				npmCmd: 'build:staging',
			} ).npmScript
		).toBe( 'build:staging' );
	} );

	it( 'skips npm when the resolved script is missing', () => {
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( { scripts: { build: 'webpack' } } )
		);

		expect( detectBuildSteps( { cwd: tempDir, mode: 'dev' } ) ).toEqual( {
			composer: false,
			npm: false,
			npmScript: null,
		} );
	} );

	it( 'throws when an explicit --npm-cmd script is missing', () => {
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( { scripts: { build: 'webpack' } } )
		);

		expect( () =>
			detectBuildSteps( {
				cwd: tempDir,
				mode: 'dev',
				npmCmd: 'build:dev',
			} )
		).toThrow(
			'Error: npm script "build:dev" not found in package.json. Pass --npm-cmd <script> to use a different script.'
		);
	} );
} );
