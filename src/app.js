'use strict'
if (!process.env.NODE_ENV) {
  require('dotenv').config()
}

require('mongoose').Promise = global.Promise

const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const mkdirp = require('mkdirp')

const log = require('./services/logService')
const config = require('./config/environment')

const logpath = path.join(__dirname, '../log/')

// set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

// connect to database
mongoose.connect(config.mongo.uri, config.mongo.options)

// populate DB with sample data
if (config.seedDB) {
  require('./config/seed')
}

// setup server
const app = express()
app.enable('trust proxy')

require('./config/express')(app)
require('./api')(app)

mkdirp(logpath, err => {
  if (err) {
    console.error('mkdirp:' + logpath, err)
    return
  }

  // start server
  http.createServer(app)
    .listen(config.port, config.ip, () => {
      log.info(`Express server listening on ${config.port}, in ${app.get('env')} mode`)
    })
})

module.exports = { app }
