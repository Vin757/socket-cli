#!/usr/bin/env node
require(
  `../dist/${require('semver').satisfies(process.versions.node, '>=22.12') ? 'module-sync' : 'require'}/npm-cli.js`
)
