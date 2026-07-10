import { jest } from '@jest/globals';

const runCommand = jest.fn();

jest.unstable_mockModule( '../../src/run-command.js', () => ( {
	runCommand,
} ) );

const { resolveVersion } = await import( '../../src/resolve-version.js' );

describe( 'resolveVersion', () => {
	beforeEach( () => {
		runCommand.mockReset();
	} );

	it( 'returns literal versions unchanged', async () => {
		await expect(
			resolveVersion( '3.8.0', { cwd: '/project' } )
		).resolves.toBe( '3.8.0' );
		expect( runCommand ).not.toHaveBeenCalled();
	} );

	it( 'resolves commit strategy from git', async () => {
		runCommand.mockResolvedValueOnce( {
			code: 0,
			stdout: 'abc1234\n',
			stderr: '',
		} );

		await expect(
			resolveVersion( 'commit', { cwd: '/project' } )
		).resolves.toBe( 'abc1234' );

		expect( runCommand ).toHaveBeenCalledWith(
			'git',
			[ 'rev-parse', '--short', 'HEAD' ],
			expect.objectContaining( {
				cwd: '/project',
				nothrow: true,
				silent: true,
			} )
		);
	} );

	it( 'falls back to timestamp when commit git command fails', async () => {
		runCommand.mockResolvedValueOnce( {
			code: 128,
			stdout: '',
			stderr: 'fatal: not a git repository',
		} );

		const version = await resolveVersion( 'commit', { cwd: '/project' } );

		expect( version ).toMatch( /^\d{8}$/ );
	} );

	it( 'resolves tag strategy and strips leading v', async () => {
		runCommand.mockResolvedValueOnce( {
			code: 0,
			stdout: 'v3.7.0\n',
			stderr: '',
		} );

		await expect(
			resolveVersion( 'tag', { cwd: '/project' } )
		).resolves.toBe( '3.7.0' );
	} );

	it( 'falls back commit then timestamp for tag strategy', async () => {
		runCommand
			.mockResolvedValueOnce( {
				code: 128,
				stdout: '',
				stderr: 'no tag',
			} )
			.mockResolvedValueOnce( {
				code: 128,
				stdout: '',
				stderr: 'no commit',
			} );

		const version = await resolveVersion( 'tag', { cwd: '/project' } );

		expect( version ).toMatch( /^\d{8}$/ );
		expect( runCommand ).toHaveBeenNthCalledWith(
			1,
			'git',
			[ 'describe', '--tags', '--abbrev=0' ],
			expect.any( Object )
		);
		expect( runCommand ).toHaveBeenNthCalledWith(
			2,
			'git',
			[ 'rev-parse', '--short', 'HEAD' ],
			expect.any( Object )
		);
	} );
} );
