import {
	fileMatchesPattern,
	matchManifest,
	normalizePattern,
	patternIsSatisfied,
} from '../../src/match-manifest.js';

describe( 'normalizePattern', () => {
	it( 'appends ** to directory prefixes', () => {
		expect( normalizePattern( 'src/' ) ).toBe( 'src/**' );
	} );

	it( 'leaves exact paths unchanged', () => {
		expect( normalizePattern( 'polylang.php' ) ).toBe( 'polylang.php' );
	} );
} );

describe( 'fileMatchesPattern', () => {
	it( 'matches exact files', () => {
		expect( fileMatchesPattern( 'polylang.php', 'polylang.php' ) ).toBe(
			true
		);
		expect( fileMatchesPattern( 'readme.txt', 'polylang.php' ) ).toBe(
			false
		);
	} );

	it( 'matches directory prefixes', () => {
		expect( fileMatchesPattern( 'src/class-polylang.php', 'src/' ) ).toBe(
			true
		);
		expect( fileMatchesPattern( 'js/build/admin.js', 'src/' ) ).toBe(
			false
		);
	} );

	it( 'matches globs', () => {
		expect(
			fileMatchesPattern( 'js/build/admin.js', 'js/build/*.js' )
		).toBe( true );
		expect( fileMatchesPattern( 'js/src/admin.js', 'js/build/*.js' ) ).toBe(
			false
		);
	} );
} );

describe( 'patternIsSatisfied', () => {
	it( 'requires at least one matching file for directory prefixes', () => {
		expect( patternIsSatisfied( 'src/', [ 'src/foo.php' ] ) ).toBe( true );
		expect( patternIsSatisfied( 'src/', [ 'js/foo.php' ] ) ).toBe( false );
	} );
} );

describe( 'matchManifest', () => {
	const patterns = [ 'polylang.php', 'src/', 'js/build/*.js' ];

	it( 'returns no differences when all files are covered', () => {
		expect(
			matchManifest(
				[ 'polylang.php', 'src/foo.php', 'js/build/admin.js' ],
				patterns
			)
		).toEqual( {
			unexpected: [],
			unsatisfied: [],
		} );
	} );

	it( 'reports unexpected files', () => {
		expect(
			matchManifest( [ 'tests/bootstrap.php' ], patterns ).unexpected
		).toEqual( [ 'tests/bootstrap.php' ] );
	} );

	it( 'reports unsatisfied manifest entries', () => {
		expect(
			matchManifest( [ 'polylang.php' ], patterns ).unsatisfied
		).toEqual( [ 'js/build/*.js', 'src/' ] );
	} );
} );
