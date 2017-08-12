import * as path from 'path'
import * as  winston from 'winston'

import {User} from '../api/user/userModel'

const logPath = path.join(__dirname, '../../log/')

winston.loggers.add('std', {
  console: {
    level: 'debug',
    colorize: true
  },
  file: {
    filename: logPath + 'langstudio.log',
    level: 'info',
    maxsize: 1000000,
    json: false
  }
})

const log = winston.loggers.get('std')

export function debug(message: string, user: User) {
  if (user) {
    log.debug(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.debug(message)
  }
}

export function info(message: string, user: User) {
  if (user) {
    log.info(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.info(message)
  }
}

export function warn(message: string, user: User) {
  if (user) {
    log.warn(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.warn(message)
  }
}

export function error(message: string, user: User) {
  if (user) {
    log.error(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.error(message)
  }
}

export function silly(message: string, user: User) {
  if (user) {
    log.log('silly', message, { user: user ? user.email : 'anonymous' })
  } else {
    log.log('silly', message)
  }
}
