import { chmodSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { toSortedObject } from '@socketsecurity/registry/lib/objects'
import { readPackageJsonSync } from '@socketsecurity/registry/lib/packages'
import { isRelative } from '@socketsecurity/registry/lib/path'

import baseConfig from './rollup.base.config.mjs'
import constants from '../scripts/constants.js'
import { readJsonSync } from '../scripts/utils/fs.js'
import { formatObject } from '../scripts/utils/objects.js'
import { normalizeId, isBuiltin } from '../scripts/utils/packages.js'

const {
  ROLLUP_EXTERNAL_SUFFIX,
  depStatsPath,
  rootDistPath,
  rootPath,
  rootSrcPath
} = constants

const distModuleSyncPath = path.join(rootDistPath, 'module-sync')
const distRequirePath = path.join(rootDistPath, 'require')

const binBasenames = ['cli.js', 'npm-cli.js', 'npx-cli.js']
const editablePkgJson = readPackageJsonSync(rootPath, { editable: true })

function setBinPerm(filepath) {
  // Make file chmod +x.
  chmodSync(filepath, 0o755)
}

export default () => {
  const moduleSyncConfig = baseConfig({
    input: {
      cli: `${rootSrcPath}/cli.ts`,
      'npm-cli': `${rootSrcPath}/shadow/npm-cli.ts`,
      'npx-cli': `${rootSrcPath}/shadow/npx-cli.ts`,
      'npm-injection': `${rootSrcPath}/shadow/npm-injection.ts`
    },
    output: [
      {
        dir: path.relative(rootPath, distModuleSyncPath),
        entryFileNames: '[name].js',
        format: 'cjs',
        exports: 'auto',
        externalLiveBindings: false,
        freeze: false
      }
    ],
    external(id_) {
      if (id_.endsWith(ROLLUP_EXTERNAL_SUFFIX) || isBuiltin(id_)) {
        return true
      }
      const id = normalizeId(id_)
      return !(isRelative(id) || id.startsWith(rootSrcPath))
    },
    plugins: [
      {
        writeBundle() {
          for (const binBasename of binBasenames) {
            setBinPerm(path.join(distModuleSyncPath, binBasename))
          }
        }
      }
    ]
  })

  const requireConfig = baseConfig({
    input: {
      cli: `${rootSrcPath}/cli.ts`,
      'npm-cli': `${rootSrcPath}/shadow/npm-cli.ts`,
      'npx-cli': `${rootSrcPath}/shadow/npx-cli.ts`,
      'npm-injection': `${rootSrcPath}/shadow/npm-injection.ts`
    },
    output: [
      {
        dir: path.relative(rootPath, distRequirePath),
        entryFileNames: '[name].js',
        format: 'cjs',
        exports: 'auto',
        externalLiveBindings: false,
        freeze: false
      }
    ],
    plugins: [
      {
        writeBundle() {
          const { content: pkgJson } = editablePkgJson
          const { '@cyclonedx/cdxgen': cdxgenRange, synp: synpRange } =
            pkgJson.dependencies
          const { depStats } = requireConfig.meta
          // Manually add @cyclonedx/cdxgen and synp as they are not directly
          // referenced in the code but used through spawned processes.
          depStats.dependencies['@cyclonedx/cdxgen'] = cdxgenRange
          depStats.dependencies.synp = synpRange
          depStats.external['@cyclonedx/cdxgen'] = cdxgenRange
          depStats.external.synp = synpRange
          try {
            // Remove transitives from dependencies
            const oldDepStats = readJsonSync(depStatsPath)
            for (const key of Object.keys(oldDepStats.transitives)) {
              if (pkgJson.dependencies[key]) {
                depStats.transitives[key] = pkgJson.dependencies[key]
                depStats.external[key] = pkgJson.dependencies[key]
                delete depStats.dependencies[key]
              }
            }
          } catch {}
          depStats.dependencies = toSortedObject(depStats.dependencies)
          depStats.devDependencies = toSortedObject(depStats.devDependencies)
          depStats.esm = toSortedObject(depStats.esm)
          depStats.external = toSortedObject(depStats.external)
          depStats.transitives = toSortedObject(depStats.transitives)
          // Write dep stats
          writeFileSync(depStatsPath, `${formatObject(depStats)}\n`, 'utf8')
          // Update dependencies with additional inlined modules
          editablePkgJson
            .update({
              dependencies: {
                ...depStats.dependencies,
                ...depStats.transitives
              }
            })
            .saveSync()
          for (const binBasename of binBasenames) {
            setBinPerm(path.join(distRequirePath, binBasename))
          }
        }
      }
    ]
  })

  return [moduleSyncConfig, requireConfig]
}
