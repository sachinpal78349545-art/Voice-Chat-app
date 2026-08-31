#!/bin/bash
set -e
echo "==> EAS Pre-install: Switch to npm"

echo "==> Remove all pnpm traces"
rm -f pnpm-workspace.yaml
rm -f pnpm-lock.yaml
rm -f .npmrc

echo "==> Remove root preinstall script that blocks npm"
node -e "
const pkg = require('./package.json');
if (pkg.scripts && pkg.scripts.preinstall) {
  delete pkg.scripts.preinstall;
  require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
  console.log('Removed preinstall script');
}
"

echo "==> Pre-install complete. npm will handle install."
