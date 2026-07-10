import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';

const spawn = jest.fn();

jest.unstable_mockModule( 'node:child_process', () => ( {
	spawn,
} ) );

const { runCommand } = await import( '../../src/run-command.js' );

function createMockChild( { stdout = '', stderr = '', code = 0, error } = {} ) {
	const child = new EventEmitter();
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.kill = jest.fn();

	process.nextTick( () => {
		if ( error ) {
			child.emit( 'error', error );
			return;
		}

		if ( stdout ) {
			child.stdout.emit( 'data', Buffer.from( stdout ) );
		}

		if ( stderr ) {
			child.stderr.emit( 'data', Buffer.from( stderr ) );
		}

		child.emit( 'close', code );
	} );

	return child;
}

describe( 'runCommand', () => {
	beforeEach( () => {
		spawn.mockReset();
	} );

	it( 'resolves on exit code 0', async () => {
		spawn.mockReturnValueOnce(
			createMockChild( { stdout: 'ok\n', code: 0 } )
		);

		await expect(
			runCommand( 'echo', [ 'ok' ], { silent: true } )
		).resolves.toEqual( {
			code: 0,
			stdout: 'ok\n',
			stderr: '',
		} );
	} );

	it( 'rejects on non-zero exit code', async () => {
		spawn.mockReturnValueOnce(
			createMockChild( { stderr: 'boom', code: 1 } )
		);

		await expect(
			runCommand( 'false', [], { silent: true } )
		).rejects.toThrow( 'Command failed: false  (boom)' );
	} );

	it( 'returns result when nothrow is enabled', async () => {
		spawn.mockReturnValueOnce(
			createMockChild( { stderr: 'missing', code: 127 } )
		);

		await expect(
			runCommand( 'git', [ 'rev-parse' ], {
				silent: true,
				nothrow: true,
			} )
		).resolves.toEqual( {
			code: 127,
			stdout: '',
			stderr: 'missing',
		} );
	} );

	it( 'prefixes streamed output', async () => {
		const stdoutSpy = jest
			.spyOn( process.stdout, 'write' )
			.mockImplementation( () => true );

		spawn.mockReturnValueOnce(
			createMockChild( { stdout: 'installing\n', code: 0 } )
		);

		await runCommand( 'composer', [ 'install' ], { prefix: 'composer' } );

		expect( stdoutSpy ).toHaveBeenCalledWith( '[composer] installing\n' );
		stdoutSpy.mockRestore();
	} );

	it( 'prefixes streamed stderr output', async () => {
		const stderrSpy = jest
			.spyOn( process.stderr, 'write' )
			.mockImplementation( () => true );

		spawn.mockReturnValueOnce(
			createMockChild( { stderr: 'warning\n', code: 0 } )
		);

		await runCommand( 'composer', [ 'install' ], { prefix: 'composer' } );

		expect( stderrSpy ).toHaveBeenCalledWith( '[composer] warning\n' );
		stderrSpy.mockRestore();
	} );

	it( 'kills the child when the abort signal fires', async () => {
		const child = createMockChild( { code: 0 } );
		spawn.mockReturnValueOnce( child );

		const controller = new AbortController();
		const promise = runCommand( 'npm', [ 'ci' ], {
			signal: controller.signal,
			silent: true,
		} );

		controller.abort();

		await promise;

		expect( child.kill ).toHaveBeenCalledWith( 'SIGTERM' );
	} );

	it( 'kills the child immediately when the signal is already aborted', async () => {
		const child = createMockChild( { code: 0 } );
		spawn.mockReturnValueOnce( child );

		const controller = new AbortController();
		controller.abort();

		await runCommand( 'npm', [ 'ci' ], {
			signal: controller.signal,
			silent: true,
		} );

		expect( child.kill ).toHaveBeenCalledWith( 'SIGTERM' );
	} );

	it( 'rejects when spawn fails', async () => {
		const error = new Error( 'ENOENT' );
		spawn.mockReturnValueOnce( createMockChild( { error } ) );

		await expect(
			runCommand( 'missing-binary', [], { silent: true } )
		).rejects.toThrow( 'ENOENT' );
	} );

	it( 'returns result when spawn fails and nothrow is enabled', async () => {
		spawn.mockReturnValueOnce(
			createMockChild( { error: new Error( 'ENOENT' ) } )
		);

		await expect(
			runCommand( 'missing-binary', [], {
				silent: true,
				nothrow: true,
			} )
		).resolves.toEqual( {
			code: 1,
			stdout: '',
			stderr: 'ENOENT',
		} );
	} );

	it( 'removes abort listener when spawn fails', async () => {
		const removeEventListener = jest.fn();
		const signal = {
			aborted: false,
			addEventListener: jest.fn(),
			removeEventListener,
		};

		spawn.mockReturnValueOnce(
			createMockChild( { error: new Error( 'ENOENT' ) } )
		);

		await expect(
			runCommand( 'missing-binary', [], {
				signal,
				silent: true,
				nothrow: true,
			} )
		).resolves.toEqual( {
			code: 1,
			stdout: '',
			stderr: 'ENOENT',
		} );

		expect( removeEventListener ).toHaveBeenCalled();
	} );
} );
