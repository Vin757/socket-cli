#!/usr/bin/env node

import { pathToFileURL } from 'node:url'

import colors from 'yoctocolors-cjs'
import { messageWithCauses, stackWithCauses } from 'pony-cause'
import updateNotifier from 'tiny-updater'

import * as cliCommands from './commands'
import { rootPkgJsonPath } from './constants'
import { logSymbols } from './utils/color-or-markdown'
import { AuthError, InputError } from './utils/errors'
import { meowWithSubcommands } from './utils/meow-with-subcommands'

const formattedCliCommands = Object.fromEntries(
  Object.entries(cliCommands).map(entry => {
    const key = entry[0]
    entry[0] = camelToHyphen(key)
    return entry
  })
)

function camelToHyphen(str: string): string {
  return str.replace(/[A-Z]+/g, '-$&').toLowerCase()
}

// TODO: Add autocompletion using https://socket.dev/npm/package/omelette
void (async () => {
  const rootPkgJson = require(rootPkgJsonPath)

  await updateNotifier({
    name: rootPkgJson.name,
    version: rootPkgJson.version,
    ttl: 86_400_000 /* 24 hours in milliseconds */
  })

  try {
    await meowWithSubcommands(formattedCliCommands, {
      aliases: {
        ci: {
          description: 'Alias for "report create --view --strict"',
          argv: ['report', 'create', '--view', '--strict']
        }
      },
      argv: process.argv.slice(2),
      name: 'socket',
      importMeta: { url: `${pathToFileURL(__filename)}` } as ImportMeta
    })
  } catch (err) {
    let errorBody: string | undefined
    let errorTitle: string
    let errorMessage = ''
    if (err instanceof AuthError) {
      errorTitle = 'Authentication error'
      errorMessage = err.message
    } else if (err instanceof InputError) {
      errorTitle = 'Invalid input'
      errorMessage = err.message
      errorBody = err.body
    } else if (err instanceof Error) {
      errorTitle = 'Unexpected error'
      errorMessage = messageWithCauses(err)
      errorBody = stackWithCauses(err)
    } else {
      errorTitle = 'Unexpected error with no details'
    }
    console.error(
      `${logSymbols.error} ${colors.bgRed(colors.white(errorTitle + ':'))} ${errorMessage}`
    )
    if (errorBody) {
      console.error(`\n${errorBody}`)
    }
    process.exit(1)
  }
})()
