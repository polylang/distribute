import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { jest } from '@jest/globals';

const runCommand = jest.fn();

jest.unstable_mockModule( '../../src/run-command.js', () => ( {
	runCommand,
} ) );

const {
	compactToManifest,
	listZipFiles,
	loadManifest,
	resolvePluginRoot,
	verifyDist,
	walkFiles,
} = await import( '../../src/verify-dist.js' );

describe( 'loadManifest', () => {
	let tempDir;

	beforeEach( () => {
		tempDir = mkdtempSync( path.join( os.tmpdir(), 'verify-manifest-' ) );
	} );

	afterEach( () => {
		rmSync( tempDir, { recursive: true, force: true } );
	} );

	it( 'loads files from dist-manifest.json', () => {
		writeFileSync(
			path.join( tempDir, 'dist-manifest.json' ),
			JSON.stringify( { files: [ 'plugin.php', 'src/' ] } )
		);

		expect(
			loadManifest( path.join( tempDir, 'dist-manifest.json' ) )
		).toEqual( [ 'plugin.php', 'src/' ] );
	} );

	it( 'fails when manifest is missing', () => {
		expect( () =>
			loadManifest( path.join( tempDir, 'dist-manifest.json' ) )
		).toThrow( /not found/ );
	} );
} );

describe( 'walkFiles and resolvePluginRoot', () => {
	let tempDir;

	beforeEach( () => {
		tempDir = mkdtempSync( path.join( os.tmpdir(), 'verify-walk-' ) );
	} );

	afterEach( () => {
		rmSync( tempDir, { recursive: true, force: true } );
	} );

	it( 'walks nested files relative to the root', () => {
		mkdirSync( path.join( tempDir, 'src' ), { recursive: true } );
		writeFileSync( path.join( tempDir, 'plugin.php' ), 'php' );
		writeFileSync( path.join( tempDir, 'src', 'foo.php' ), 'php' );

		expect( walkFiles( tempDir ) ).toEqual( [
			'plugin.php',
			'src/foo.php',
		] );
	} );

	it( 'requires exactly one top-level directory in a ZIP extract', () => {
		const unzipDir = path.join( tempDir, 'unzip' );
		mkdirSync( path.join( unzipDir, 'plugin' ), { recursive: true } );

		expect( resolvePluginRoot( unzipDir ) ).toBe(
			path.join( unzipDir, 'plugin' )
		);
	} );

	it( 'fails when multiple top-level directories exist', () => {
		const unzipDir = path.join( tempDir, 'unzip-multi' );
		mkdirSync( path.join( unzipDir, 'a' ), { recursive: true } );
		mkdirSync( path.join( unzipDir, 'b' ), { recursive: true } );

		expect( () => resolvePluginRoot( unzipDir ) ).toThrow( /exactly one/ );
	} );
} );

describe( 'compactToManifest', () => {
	it( 'collapses nested paths into directory prefixes', () => {
		expect(
			compactToManifest( [
				'polylang.php',
				'src/foo.php',
				'js/build/admin.js',
			] )
		).toEqual( {
			files: [ 'js/', 'polylang.php', 'src/' ],
		} );
	} );
} );

describe( 'listZipFiles', () => {
	let tempDir;

	beforeEach( () => {
		tempDir = mkdtempSync( path.join( os.tmpdir(), 'verify-zip-' ) );
		runCommand.mockReset();
		runCommand.mockImplementation( async ( command, args ) => {
			if ( command !== 'unzip' ) {
				return { code: 0, stdout: '', stderr: '' };
			}

			const workDir = args[ 3 ];
			const pluginDir = path.join( workDir, 'plugin' );
			mkdirSync( pluginDir, { recursive: true } );
			writeFileSync( path.join( pluginDir, 'plugin.php' ), 'php' );
			return { code: 0, stdout: '', stderr: '' };
		} );
	} );

	afterEach( () => {
		rmSync( tempDir, { recursive: true, force: true } );
	} );

	it( 'returns plugin files from an extracted archive', async () => {
		const zipPath = path.join( tempDir, 'plugin.zip' );
		writeFileSync( zipPath, 'zip' );

		await expect(
			listZipFiles( { zipPath, tmpDir: tempDir } )
		).resolves.toEqual( [ 'plugin.php' ] );
	} );
} );

describe( 'verifyDist', () => {
	let tempDir;
	let logSpy;

	beforeEach( () => {
		tempDir = mkdtempSync( path.join( os.tmpdir(), 'verify-dist-' ) );
		logSpy = jest.spyOn( console, 'log' ).mockImplementation( () => {} );
		runCommand.mockReset();
		runCommand.mockImplementation( async ( command, args ) => {
			if ( command !== 'unzip' ) {
				return { code: 0, stdout: '', stderr: '' };
			}

			const workDir = args[ 3 ];
			const pluginDir = path.join( workDir, 'plugin' );
			mkdirSync( path.join( pluginDir, 'src' ), { recursive: true } );
			writeFileSync( path.join( pluginDir, 'plugin.php' ), 'php' );
			writeFileSync( path.join( pluginDir, 'src', 'foo.php' ), 'php' );
			return { code: 0, stdout: '', stderr: '' };
		} );
	} );

	afterEach( () => {
		logSpy.mockRestore();
		rmSync( tempDir, { recursive: true, force: true } );
	} );

	it( 'passes when the ZIP matches the manifest', async () => {
		const zipPath = path.join( tempDir, 'plugin.zip' );
		const manifestPath = path.join( tempDir, 'dist-manifest.json' );
		writeFileSync( zipPath, 'zip' );
		writeFileSync(
			manifestPath,
			JSON.stringify( { files: [ 'plugin.php', 'src/' ] } )
		);

		await expect(
			verifyDist( { zipPath, manifestPath, tmpDir: tempDir } )
		).resolves.toEqual( [ 'plugin.php', 'src/foo.php' ] );
		expect( logSpy ).toHaveBeenCalledWith(
			'Distribution verified: 2 files match manifest.'
		);
	} );

	it( 'fails when unexpected files are present', async () => {
		runCommand.mockImplementation( async ( command, args ) => {
			if ( command !== 'unzip' ) {
				return { code: 0, stdout: '', stderr: '' };
			}

			const workDir = args[ 3 ];
			const pluginDir = path.join( workDir, 'plugin' );
			mkdirSync( path.join( pluginDir, 'tests' ), { recursive: true } );
			writeFileSync( path.join( pluginDir, 'plugin.php' ), 'php' );
			writeFileSync(
				path.join( pluginDir, 'tests', 'bootstrap.php' ),
				'php'
			);
			return { code: 0, stdout: '', stderr: '' };
		} );

		const zipPath = path.join( tempDir, 'plugin.zip' );
		const manifestPath = path.join( tempDir, 'dist-manifest.json' );
		writeFileSync( zipPath, 'zip' );
		writeFileSync(
			manifestPath,
			JSON.stringify( { files: [ 'plugin.php' ] } )
		);

		await expect(
			verifyDist( { zipPath, manifestPath, tmpDir: tempDir } )
		).rejects.toThrow( /Unexpected files/ );
	} );

	it( 'fails when the ZIP file is missing', async () => {
		const manifestPath = path.join( tempDir, 'dist-manifest.json' );
		writeFileSync(
			manifestPath,
			JSON.stringify( { files: [ 'plugin.php' ] } )
		);

		await expect(
			verifyDist( {
				zipPath: path.join( tempDir, 'missing.zip' ),
				manifestPath,
				tmpDir: tempDir,
			} )
		).rejects.toThrow( /ZIP file not found/ );
		expect( existsSync( path.join( tempDir, 'missing.zip' ) ) ).toBe(
			false
		);
	} );
} );
