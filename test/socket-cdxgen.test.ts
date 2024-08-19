import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, it } from 'node:test'

import type { SpawnSyncOptionsWithStringEncoding } from 'node:child_process'

const testPath = __dirname
const rootPath = path.resolve(testPath, '..')
const distPath = path.join(rootPath, 'dist')
const spawnOpts: SpawnSyncOptionsWithStringEncoding = {
  cwd: distPath,
  encoding: 'utf8'
}

describe('Socket cdxgen command', async () => {
  it('should forwards known commands to cdxgen', async () => {
    for (const command of ['-h', '--help']) {
      const ret = spawnSync('./cli.js', ['cdxgen', command], spawnOpts)
      assert(ret.stdout.startsWith('cdxgen'), 'forwards commands to cdxgen')
    }
  })
  it('should not forward unknown commands to cdxgen', async () => {
    for (const command of ['-u', '--unknown']) {
      const ret = spawnSync('./cli.js', ['cdxgen', command], spawnOpts)
      assert(ret.stderr.startsWith(`Unknown argument: ${command}`), 'singular')
    }
    const ret = spawnSync(
      './cli.js',
      ['cdxgen', '-u', '-h', '--unknown'],
      spawnOpts
    )
    assert(ret.stderr.startsWith('Unknown arguments: -u, --unknown'), 'plural')
  })
})