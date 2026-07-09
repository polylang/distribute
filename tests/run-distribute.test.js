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

jest.unstable_mockModule( '../src/run-command.js', () => ( {
	runCommand,
} ) );

const { cleanOutputTarget, resolveOutputPath, runDistribute } = await import(
	'../src/run-distribute.js'
);

describe( 'resolveOutputPath', () => {
	it( 'builds a ZIP path inside the output directory', () => {
		expect(
			resolveOutputPath( {
				output: '/project/dist',
				slug: 'polylang-pro',
				version: 'abc1234',
				mode: 'production',
			} )
		).toBe( '/project/dist/polylang-pro-abc1234.zip' );
	} );

	it( 'adds -dev suffix in dev mode', () => {
		expect(
			resolveOutputPath( {
				output: '/project/dist',
				slug: 'polylang-pro',
				version: 'abc1234',
				mode: 'dev',
			} )
		).toBe( '/project/dist/polylang-pro-abc1234-dev.zip' );
	} );

	it( 'uses an explicit zip file path', () => {
		expect(
			resolveOutputPath( {
				output: '/tmp/custom.zip',
				slug: 'polylang-pro',
				version: 'abc1234',
				mode: 'production',
			} )
		).toBe( '/tmp/custom.zip' );
	} );
} );

describe( 'cleanOutputTarget', () => {
	let tempDir;

	beforeEach( () => {
		tempDir = mkdtempSync( path.join( os.tmpdir(), 'distribute-output-' ) );
	} );

	afterEach( () => {
		rmSync( tempDir, { recursive: true, force: true } );
	} );

	it( 'cleans output directory contents', () => {
		const outputDir = path.join( tempDir, 'dist' );
		mkdirSync( outputDir, { recursive: true } );
		writeFileSync( path.join( outputDir, 'old.zip' ), 'old' );

		const outputPath = path.join( outputDir, 'new.zip' );
		cleanOutputTarget( outputPath, outputDir );

		expect( existsSync( path.join( outputDir, 'old.zip' ) ) ).toBe( false );
	} );

	it( 'removes only the target zip when output is a file path', () => {
		const outputPath = path.join( tempDir, 'custom.zip' );
		writeFileSync( outputPath, 'zip' );

		cleanOutputTarget( outputPath, outputPath );

		expect( existsSync( outputPath ) ).toBe( false );
	} );
} );

describe( 'runDistribute', () => {
	let projectDir;
	let logSpy;

	beforeEach( () => {
		projectDir = mkdtempSync( path.join( os.tmpdir(), 'distribute-run-' ) );
		writeFileSync(
			path.join( projectDir, 'package.json' ),
			JSON.stringify( {
				name: '@wpsyntex/polylang-for-elementor',
				scripts: { build: 'echo build', 'build:dev': 'echo dev' },
			} )
		);
		writeFileSync(
			path.join( projectDir, '.distignore' ),
			'node_modules/\n'
		);

		logSpy = jest.spyOn( console, 'log' ).mockImplementation( () => {} );
		runCommand.mockReset();
		runCommand.mockResolvedValue( {
			code: 0,
			stdout: 'abc1234\n',
			stderr: '',
		} );
	} );

	afterEach( () => {
		logSpy.mockRestore();
		rmSync( projectDir, { recursive: true, force: true } );
	} );

	function baseOptions( overrides = {} ) {
		return {
			cwd: projectDir,
			mode: 'production',
			version: 'commit',
			output: path.join( projectDir, 'dist' ),
			tmpDir: path.join( projectDir, '.distribute-tmp' ),
			sequential: false,
			npmCmd: undefined,
			slug: undefined,
			help: false,
			...overrides,
		};
	}

	it( 'runs composer and npm in parallel by default', async () => {
		writeFileSync( path.join( projectDir, 'composer.json' ), '{}' );
		const calls = [];

		runCommand.mockImplementation( ( command, args, options = {} ) => {
			calls.push( { command, args, prefix: options.prefix } );
			return Promise.resolve( { code: 0, stdout: '', stderr: '' } );
		} );

		await runDistribute( baseOptions() );

		expect(
			calls.filter( ( call ) => call.prefix === 'composer' ).length
		).toBeGreaterThan( 0 );
		expect( calls ).toEqual(
			expect.arrayContaining( [
				expect.objectContaining( {
					command: 'npm',
					args: [ 'ci' ],
					prefix: 'npm',
				} ),
				expect.objectContaining( {
					command: 'npm',
					args: [ 'run', 'build' ],
					prefix: 'npm',
				} ),
			] )
		);
	} );

	it( 'runs build steps sequentially when requested', async () => {
		writeFileSync( path.join( projectDir, 'composer.json' ), '{}' );
		const order = [];

		runCommand.mockImplementation( ( command, args, options = {} ) => {
			if ( options.prefix ) {
				order.push( `${ options.prefix }:${ command }` );
			}

			return Promise.resolve( { code: 0, stdout: '', stderr: '' } );
		} );

		await runDistribute( baseOptions( { sequential: true } ) );

		const firstComposer = order.findIndex( ( entry ) =>
			entry.startsWith( 'composer:' )
		);
		const firstNpm = order.findIndex( ( entry ) =>
			entry.startsWith( 'npm:' )
		);

		expect( firstComposer ).toBeGreaterThanOrEqual( 0 );
		expect( firstNpm ).toBeGreaterThan( firstComposer );
	} );

	it( 'uses dev mode composer and npm scripts', async () => {
		writeFileSync( path.join( projectDir, 'composer.json' ), '{}' );

		await runDistribute( baseOptions( { mode: 'dev' } ) );

		expect( runCommand ).toHaveBeenCalledWith(
			'composer',
			[ 'install' ],
			expect.objectContaining( { prefix: 'composer' } )
		);
		expect( runCommand ).toHaveBeenCalledWith(
			'npm',
			[ 'run', 'build:dev' ],
			expect.objectContaining( { prefix: 'npm' } )
		);
	} );

	it( 'logs skipped steps when manifests are missing', async () => {
		rmSync( path.join( projectDir, 'package.json' ) );

		await runDistribute(
			baseOptions( {
				slug: 'manual-slug',
			} )
		);

		expect( logSpy ).toHaveBeenCalledWith(
			'No composer.json found; skipping Composer step.'
		);
		expect( logSpy ).toHaveBeenCalledWith(
			'No package.json found; skipping NPM step.'
		);
	} );

	it( 'fails fast when .distignore is missing', async () => {
		rmSync( path.join( projectDir, '.distignore' ) );

		await expect( runDistribute( baseOptions() ) ).rejects.toThrow(
			/.distignore not found/
		);
	} );

	it( 'packages with slug folder wrapper and custom tmp dir', async () => {
		const customTmp = path.join( projectDir, 'custom-tmp' );

		await runDistribute(
			baseOptions( {
				tmpDir: customTmp,
			} )
		);

		expect( runCommand ).toHaveBeenCalledWith(
			'zip',
			[
				'-r',
				path.join(
					projectDir,
					'dist/polylang-for-elementor-abc1234.zip'
				),
				'polylang-for-elementor',
			],
			expect.objectContaining( { cwd: customTmp } )
		);
		expect( existsSync( customTmp ) ).toBe( false );
	} );

	it( 'aborts sibling build step on failure', async () => {
		writeFileSync( path.join( projectDir, 'composer.json' ), '{}' );

		runCommand.mockImplementation( ( command, args, options = {} ) => {
			if ( options.prefix === 'composer' && command === 'composer' ) {
				return Promise.reject( new Error( 'composer failed' ) );
			}

			return Promise.resolve( { code: 0, stdout: '', stderr: '' } );
		} );

		await expect( runDistribute( baseOptions() ) ).rejects.toThrow(
			'composer failed'
		);
	} );
} );
