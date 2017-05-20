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
    filename: logpath + 'taalmap.log',
    level: 'info',
    maxsize: 1000000,
    json: true
  }
})

const log = winston.loggers.get('std')

function debug(message, req) {
  if (req) {
    log.debug(message, { user: req.user ? req.user.handle : 'anonymous' })
  } else {
    log.debug(message)
  }
}

function info(message, req) {
  if (req) {
    log.info(message, { user: req.user ? req.user.handle : 'anonymous' })
  } else {
    log.info(message)
  }
}

function warn(message, req) {
  if (req) {
    log.warn(message, { user: req.user ? req.user.handle : 'anonymous' })
  } else {
    log.warn(message)
  }
}

function error(message, req) {
  if (req) {
    log.error(message, { user: req.user ? req.user.handle : 'anonymous' })
  } else {
    log.error(message)
  }
}

function silly(message, req) {
  if (req) {
    log.log('silly', message, { user: req.user ? req.user.handle : 'anonymous' })
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
