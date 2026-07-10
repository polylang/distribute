#!/usr/bin/env node
/* eslint-disable no-console */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const THRESHOLD = Number( process.env.COVERAGE_THRESHOLD || 90 );
const METRICS = [ 'lines', 'statements', 'branches', 'functions' ];
const summaryPath = path.resolve(
	process.env.COVERAGE_SUMMARY_PATH || 'coverage/coverage-summary.json'
);

/**
 * @return {string[]} Changed source files relative to the repository root.
 */
function getChangedSrcFiles() {
	if ( process.env.CHANGED_FILES ) {
		return process.env.CHANGED_FILES.split( /\s+/ )
			.map( ( file ) => file.trim() )
			.filter(
				( file ) => file.startsWith( 'src/' ) && file.endsWith( '.js' )
			);
	}

	const baseRef = process.env.COVERAGE_BASE_REF || 'origin/master';
	const diffCommand = `git diff --name-only --diff-filter=AM ${ baseRef }...HEAD -- 'src/'`;

	try {
		const output = execSync( diffCommand, { encoding: 'utf8' } ).trim();

		if ( ! output ) {
			return [];
		}

		return output
			.split( '\n' )
			.filter(
				( file ) => file.startsWith( 'src/' ) && file.endsWith( '.js' )
			);
	} catch {
		return [];
	}
}

function main() {
	const changedFiles = getChangedSrcFiles();

	if ( changedFiles.length === 0 ) {
		console.log( 'No changed source files to check.' );
		return;
	}

	const summary = JSON.parse( readFileSync( summaryPath, 'utf8' ) );
	const failures = [];

	for ( const file of changedFiles ) {
		const absoluteFile = path.resolve( file );
		const entry = summary[ absoluteFile ] ?? summary[ file ];

		if ( ! entry ) {
			failures.push( `${ file }: missing coverage data` );
			continue;
		}

		for ( const metric of METRICS ) {
			const pct = entry[ metric ].pct;

			if ( pct < THRESHOLD ) {
				failures.push(
					`${ file }: ${ metric } ${ pct }% is below ${ THRESHOLD }%`
				);
			}
		}
	}

	if ( failures.length > 0 ) {
		console.error( 'Coverage check failed for changed files:\n' );

		for ( const failure of failures ) {
			console.error( `  - ${ failure }` );
		}

		process.exit( 1 );
	}

	console.log(
		`All ${ changedFiles.length } changed source file(s) meet ${ THRESHOLD }% coverage.`
	);
}

main();
