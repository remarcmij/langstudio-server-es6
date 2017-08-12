'use strict'
if (!process.env.NODE_ENV) { require('dotenv').config() }
require('mongoose').Promise = global.Promise

import configExpress from './config/express'
import configRoutes from './api'

import * as  path from 'path'
import express = require('express')
import * as mongoose from 'mongoose'
import * as http from 'http'
import * as util from 'util'
const mkdirp = util.promisify(require('mkdirp'))

const log = require('./services/logService')
import {appConfig} from './config/environment'

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

mongoose.connect(appConfig.mongo.uri, appConfig.mongo.options)

if (appConfig.seedDB) {
  require('./config/seed')
}

const app = express()
app.enable('trust proxy')

configExpress(app)
configRoutes(app)

async function startServer() {
  const logPath = path.join(__dirname, '../log/')
  try {
    await mkdirp(logPath)
    http.createServer(app)
      .listen(appConfig.port, () => {
        log.info(`Express server listening on ${appConfig.port}, in ${app.get('env')} mode`)
      })
  }
  catch (err) {
    log.error('mkdirp:' + logPath, err)
  }
}

startServer()
