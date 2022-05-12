#! /usr/bin/env node
import dotenv from 'dotenv'
import commandLineArgs from '../node_modules/command-line-args/dist/index.mjs'
import { DeveloperServer } from '@dlenroc/roku-developer-server'
import { ECP } from '@dlenroc/roku-ecp'
import { ODC } from '@dlenroc/roku-odc'
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'
import { exit } from 'process'
import os from 'os'

const DOTENV_FILE_PATH = `${os.homedir()}/.roku_env`
dotenv.config({ path: DOTENV_FILE_PATH })

const exitCodes = {
  INIT_INFO_INVALID: 1,
  INIT_FAILED: 2,
  DEINITIALIZATION_FAILED: 3,
  FILE_NOT_FOUND: 11,
  APP_INSTALL_FAILED: 12,
  APP_COULD_NOT_DELETE: 13,
  SCREENSHOT_CAPTURE_FAILED: 21,
  SCREENSHOT_NAME_NOT_PROVIDED: 22,
  APP_NOT_LAUNCHED: 31,
  APP_NOT_CLOSED: 32,
  ACTIVE_APP_NOT_FOUND: 33
}

const cliCommandDefinitions = [
  {
    name: 'init',
    alias: 'g',
    type: String,
    description: 'Initialize the Roku Developer Server'
  },
  {
    name: 'cli-reset',
    type: String,
    description: 'De-initialize the Roku Developer Server'
  },
  {
    name: 'install',
    alias: 'i',
    type: String,
    description: 'Install the provided roku dev channel.'
  },
  {
    name: 'launch',
    alias: 'l',
    type: Boolean,
    description: 'Launch the installed roku dev channel.'
  },
  {
    name: 'close',
    alias: 'c',
    type: Boolean,
    description: 'Close active roku dev channel.'
  },
  {
    name: 'get-active-app-id',
    type: Boolean,
    description: 'Close active roku dev channel.'
  },
  {
    name: 'delete',
    alias: 'd',
    type: Boolean,
    description: 'Delete the sideloaded Roku dev channel.'
  },
  {
    name: 'screenshot',
    alias: 's',
    type: String,
    description: 'Get screenshot of the sideloaded channel.'
  },
  {
    name: 'help',
    description: 'Print this usage guide.'
  }
]

const cliCommands = commandLineArgs(cliCommandDefinitions)

const { IP, USERNAME, PASSWORD } = process.env
if (!('init' in cliCommands) && (!IP || !USERNAME || !PASSWORD)) {
  console.error(`Roku CLI must be initialized before use!`)
  exit(exitCodes.INIT_INFO_INVALID)
}

const developerServer = new DeveloperServer(IP, USERNAME, PASSWORD)
const ecp = new ECP(IP)
const odc = new ODC(IP)

if ('init' in cliCommands) {
  if (typeof cliCommands.init !== 'string' || cliCommands.init.split(' ').length !== 3) {
    console.error(`Init info must contain dev server IP, username and password`)
    exit(exitCodes.INIT_INFO_INVALID)
  }

  try {
    const [IP, USERNAME, PASSWORD] = cliCommands.init.split(' ')
    writeFileSync(DOTENV_FILE_PATH, `IP="${IP}"\nUSERNAME="${USERNAME}"\nPASSWORD="${PASSWORD}"`)
    console.log("Initialized Roku dev server")
  } catch (e) {
    console.error(`Roku CLI initialization failed with error: ${e}`)
    exit(exitCodes.INIT_FAILED)
  }

} else if ('cli-reset' in cliCommands) {
  try {
    unlinkSync(DOTENV_FILE_PATH)
    console.log("Roku CLI de-initialized!")
  } catch (e) {
    console.error(`Roku CLI de-initialization failed with error: ${e}`)
    exit(exitCodes.DEINITIALIZATION_FAILED)
  }
} else if ('install' in cliCommands) {
  if (!existsSync(cliCommands.install)) {
    console.error(`Channel file not found`)
    exit(exitCodes.FILE_NOT_FOUND)
  }

  try {
    const app = readFileSync(cliCommands.install)
    const patchedApp = await odc.extend(app)
    await developerServer.install(patchedApp)
    console.log(`Dev channel installed successfully!`)

  } catch (e) {
    console.error(`Channel install failed with error: ${e}`)
    exit(exitCodes.APP_INSTALL_FAILED)
  }

} else if ('delete' in cliCommands) {
  try {
    await developerServer.delete()
    console.log(`Dev channel uninstalled successfully`)
  } catch (e) {
    console.error(`Channel delete failed with error: ${e}`)
    exit(exitCodes.APP_COULD_NOT_DELETE)
  }

} else if ('screenshot' in cliCommands) {
  if (typeof cliCommands.screenshot != 'string') {
    cliCommands.screenshot = "image"
  }

  try {
    const ss = await developerServer.getScreenshot()
    writeFileSync(`${cliCommands.screenshot}.png`, ss)
    console.log(`Saved screenshot as ${cliCommands.screenshot}.png`)
  } catch (e) {
    console.error(`Get screenshot failed with error: ${e}`)
    exit(exitCodes.SCREENSHOT_CAPTURE_FAILED)
  }
} else if ('get-active-app-id' in cliCommands) {
  try {
    const activeApp = await ecp.queryActiveApp()
    console.log(typeof activeApp.app == 'string' ? activeApp.app : activeApp.app.id)
  } catch (e) {
    console.error(`Dev channel launch failed with error: ${e}`)
    exit(exitCodes.ACTIVE_APP_NOT_FOUND)
  }

} else if ('launch' in cliCommands) {
  try {
    await ecp.launch('dev')
    console.log(`Dev channel launched`)
  } catch (e) {
    console.error(`Dev channel launch failed with error: ${e}`)
    exit(exitCodes.APP_NOT_LAUNCHED)
  }

} else if ('close' in cliCommands) {
  try {
    await ecp.keypress('Home')
    console.log(`Dev channel closed`)
  } catch (e) {
    console.error(`Dev channel close failed with error: ${e}`)
    exit(exitCodes.APP_NOT_CLOSED)
  }

}
