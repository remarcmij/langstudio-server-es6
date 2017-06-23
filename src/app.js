'use strict'
if (!process.env.NODE_ENV) { require('dotenv').config() }

require('mongoose').Promise = global.Promise

const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const util = require('util')
const mkdirp = util.promisify(require('mkdirp'))

const log = require('./services/logService')
const config = require('./config/environment')

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

mongoose.connect(config.mongo.uri, config.mongo.options)

if (config.seedDB) {
  require('./config/seed')
}

const app = express()
app.enable('trust proxy')

require('./config/express')(app)
require('./api')(app)

async function startServer() {
  const logpath = path.join(__dirname, '../log/')
  try {
    await mkdirp(logpath)
    http.createServer(app)
      .listen(config.port, config.ip, () => {
        log.info(`Express server listening on ${config.port}, in ${app.get('env')} mode`)
      })
  }
  catch (err) {
    log.error('mkdirp:' + logpath, err)
  }
}

startServer()

module.exports = { app }
