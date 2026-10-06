// Regenerates .expo/types/router.d.ts - the typed-routes declarations that make
// router.push('/a-route-that-does-not-exist') a compile error.
//
// `expo start` keeps that file current while it runs, but a typecheck without
// the dev server (a commit hook, CI, an editor that was opened cold) reads a
// stale copy and rejects every route added since. This runs the same generator
// the CLI uses, with no Metro and no server.
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
process.env.EXPO_ROUTER_APP_ROOT = path.join(projectRoot, 'src', 'app');

const cliDir = path.dirname(require.resolve('@expo/cli/package.json', { paths: [require.resolve('expo/package.json')] }));
const typedRoutes = require(require.resolve('@expo/router-server/build/typed-routes', { paths: [cliDir] }));

typedRoutes.regenerateDeclarations(path.join(projectRoot, '.expo', 'types'), {});
