import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveSlug } from '../../src/resolve-slug.js';

describe( 'resolveSlug', () => {
	let tempDir;

	beforeEach( () => {
		tempDir = mkdtempSync( path.join( os.tmpdir(), 'distribute-slug-' ) );
	} );

	afterEach( () => {
		rmSync( tempDir, { recursive: true, force: true } );
	} );

	it( 'reads slug from package.json and strips @wpsyntex scope', () => {
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( { name: '@wpsyntex/polylang-pro' } )
		);

		expect( resolveSlug( { cwd: tempDir } ) ).toBe( 'polylang-pro' );
	} );

	it( 'strips other scopes', () => {
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( { name: '@scope/plugin-name' } )
		);

		expect( resolveSlug( { cwd: tempDir } ) ).toBe( 'plugin-name' );
	} );

	it( 'uses --slug override', () => {
		expect(
			resolveSlug( { cwd: tempDir, slugOverride: 'custom-slug' } )
		).toBe( 'custom-slug' );
	} );

	it( 'throws when package.json is missing', () => {
		expect( () => resolveSlug( { cwd: tempDir } ) ).toThrow(
			'package.json not found'
		);
	} );

	it( 'throws when package.json has no name', () => {
		writeFileSync(
			path.join( tempDir, 'package.json' ),
			JSON.stringify( { version: '1.0.0' } )
		);

		expect( () => resolveSlug( { cwd: tempDir } ) ).toThrow(
			'package.json is missing a name field.'
		);
	} );
} );
