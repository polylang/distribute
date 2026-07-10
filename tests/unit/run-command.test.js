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
} );
