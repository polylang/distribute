#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Enforce a minimum coverage threshold on changed JavaScript files under `src/`.
 *
 * Run `npm run test:coverage` first so Jest writes `coverage/coverage-summary.json`.
 * This script only reads that summary; it does not execute tests.
 *
 * Environment variables:
 * - `COVERAGE_THRESHOLD` — minimum percentage per metric (default: 90).
 * - `COVERAGE_SUMMARY_PATH` — path to the JSON summary (default: `coverage/coverage-summary.json`).
 * - `CHANGED_FILES` — space-separated file list; when set, skips `git diff`.
 * - `COVERAGE_BASE_REF` — git ref for changed files when `CHANGED_FILES` is unset (default: `origin/master`).
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const THRESHOLD = Number( process.env.COVERAGE_THRESHOLD || 90 );
const METRICS = [ 'lines', 'statements', 'branches', 'functions' ];
const summaryPath = path.resolve(
	process.env.COVERAGE_SUMMARY_PATH || 'coverage/coverage-summary.json'
);

/**
 * List changed source files to check.
 *
 * When `CHANGED_FILES` is set, filters that list to JavaScript files under `src/`.
 * Otherwise runs `git diff` against `COVERAGE_BASE_REF` (default `origin/master`).
 *
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

/**
 * Read the coverage summary and fail when changed files are below the threshold.
 *
 * Exits with code 1 when any changed file is missing from the summary or any
 * metric is below `COVERAGE_THRESHOLD`. Requires `npm run test:coverage` to
 * have been run beforehand.
 */
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
