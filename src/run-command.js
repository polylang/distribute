import { spawn } from 'node:child_process';

/**
 * Run a shell command asynchronously.
 *
 * @param {string}   command Command executable.
 * @param {string[]} args    Command arguments.
 * @param {Object}   options Execution options.
 * @return {Promise<{ code: number, stdout: string, stderr: string }>} Command result.
 */
export function runCommand( command, args = [], options = {} ) {
	const {
		cwd,
		env,
		prefix,
		nothrow = false,
		signal,
		silent = false,
	} = options;

	return new Promise( ( resolve, reject ) => {
		const child = spawn( command, args, {
			cwd,
			env: env ? { ...process.env, ...env } : process.env,
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		} );

		const prefixLabel = prefix ? `[${ prefix }] ` : '';
		let stdout = '';
		let stderr = '';

		child.stdout?.on( 'data', ( data ) => {
			const text = data.toString();
			stdout += text;

			if ( ! silent ) {
				process.stdout.write( `${ prefixLabel }${ text }` );
			}
		} );

		child.stderr?.on( 'data', ( data ) => {
			const text = data.toString();
			stderr += text;

			if ( ! silent ) {
				process.stderr.write( `${ prefixLabel }${ text }` );
			}
		} );

		const onAbort = () => {
			child.kill( 'SIGTERM' );
		};

		if ( signal ) {
			if ( signal.aborted ) {
				onAbort();
			}

			signal.addEventListener( 'abort', onAbort );
		}

		child.on( 'error', ( error ) => {
			if ( signal ) {
				signal.removeEventListener( 'abort', onAbort );
			}

			if ( nothrow ) {
				resolve( {
					code: 1,
					stdout,
					stderr: error.message,
				} );
				return;
			}

			reject( error );
		} );

		child.on( 'close', ( code ) => {
			if ( signal ) {
				signal.removeEventListener( 'abort', onAbort );
			}

			const exitCode = code ?? 1;
			const result = { code: exitCode, stdout, stderr };

			if ( exitCode === 0 || nothrow ) {
				resolve( result );
				return;
			}

			const message =
				stderr.trim() || stdout.trim() || `exit code ${ exitCode }`;
			reject(
				new Error(
					`Command failed: ${ command } ${ args.join(
						' '
					) } (${ message })`
				)
			);
		} );
	} );
}
