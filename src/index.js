export { parseArgs, showHelp } from './parse-args.js';
export { parseVerifyArgs, showVerifyHelp } from './parse-verify-args.js';
export { resolveVersion } from './resolve-version.js';
export { resolveSlug } from './resolve-slug.js';
export { detectBuildSteps } from './detect-build-steps.js';
export { runCommand } from './run-command.js';
export {
	DISTRIBUTE_TMP_PREFIX,
	cleanOutputTarget,
	resolveOutputPath,
	runDistribute,
} from './run-distribute.js';
export {
	matchManifest,
	normalizePattern,
	fileMatchesPattern,
	patternIsSatisfied,
} from './match-manifest.js';
export {
	VERIFY_DIST_TMP_PREFIX,
	compactToManifest,
	createWorkDir,
	listZipFiles,
	loadManifest,
	resolvePluginRoot,
	verifyDist,
	walkFiles,
} from './verify-dist.js';
