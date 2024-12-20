'use strict'

const path = require('node:path')

const semver = require('semver')

const registryConstants = require('@socketsecurity/registry/lib/constants')
const {
  kInternalsSymbol,
  [kInternalsSymbol]: { createConstantsObject }
} = registryConstants

const ROLLUP_ENTRY_SUFFIX = '?commonjs-entry'
const ROLLUP_EXTERNAL_SUFFIX = '?commonjs-external'
const SLASH_NODE_MODULES_SLASH = '/node_modules/'
const SUPPORTS_SYNC_ESM = semver.satisfies(process.versions.node, '>=22.12')

const rootPath = path.resolve(__dirname, '..')
const rootConfigPath = path.join(rootPath, '.config')
const rootDistPath = path.join(rootPath, 'dist')
const rootSrcPath = path.join(rootPath, 'src')

const babelConfigPath = path.join(rootConfigPath, 'babel.config.js')
const depStatsPath = path.join(rootPath, '.dep-stats.json')
const distPath = path.join(
  rootDistPath,
  SUPPORTS_SYNC_ESM ? 'module-sync' : 'require'
)
const tsconfigPath = path.join(rootConfigPath, 'tsconfig.rollup.json')

const constants = createConstantsObject(
  {
    ROLLUP_ENTRY_SUFFIX,
    ROLLUP_EXTERNAL_SUFFIX,
    SLASH_NODE_MODULES_SLASH,
    SUPPORTS_SYNC_ESM,
    babelConfigPath,
    depStatsPath,
    distPath,
    rootConfigPath,
    rootDistPath,
    rootPath,
    rootSrcPath,
    tsconfigPath
  },
  {
    mixin: registryConstants
  }
)
module.exports = constants
