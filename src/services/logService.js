'use strict'
const path = require('path')
const winston = require('winston')

const logpath = path.join(__dirname, '../../log/')

winston.loggers.add('std', {
  console: {
    level: 'debug',
    colorize: true
  },
  file: {
    filename: logpath + 'langstudio.log',
    level: 'info',
    maxsize: 1000000,
    json: false
  }
})

const log = winston.loggers.get('std')

function debug(message, user) {
  if (user) {
    log.debug(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.debug(message)
  }
}

function info(message, user) {
  if (user) {
    log.info(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.info(message)
  }
}

function warn(message, user) {
  if (user) {
    log.warn(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.warn(message)
  }
}

function error(message, user) {
  if (user) {
    log.error(message, { user: user ? user.email : 'anonymous' })
  } else {
    log.error(message)
  }
}

function silly(message, user) {
  if (user) {
    log.log('silly', message, { user: user ? user.email : 'anonymous' })
  } else {
    log.log('silly', message)
  }
}

module.exports = {
  debug,
  info,
  warn,
  error,
  silly
}
