import * as path from 'path'
import { Express, Request, Response } from 'express'
const morgan = require('morgan')
const serveStatic = require('serve-static')
const bodyParser = require('body-parser')
// const graphQLHTTP = require('express-graphql')

import { appConfig } from './environment'
// const schema = require('../data/schema')

const ONE_DAY = 86400000

export default function (app: Express) {
  const env = app.get('env')
  app.set('views', appConfig.root + '/server/views')
  app.engine('html', require('ejs').renderFile)
  app.set('view engine', 'html')
  app.use(require('cors')())
  app.use(require('compression')())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
  app.use(require('method-override')('getter'))
  app.use(require('cookie-parser')())
  app.use(require('passport').initialize())

  // app.use('/graphql', graphQLHTTP({
  //   schema,
  //   graphiql: true
  // }))

  if ('production' === env) {
    const docRoot = path.join(appConfig.root, 'public')
    app.use(serveStatic(path.join(docRoot, 'favicon.ico')))
    app.use(serveStatic(docRoot, {
      maxAge: 0,
      setHeaders: (res: Response, path: string) => {
        if (/\/[^/]+\.bundle\./.test(path) || /(?:otf|eot|svg|ttf|woff|woff2)$/.test(path)) {
          res.setHeader('Cache-Control', 'public, max-age=' + ONE_DAY * 30)
        }
      }
    }))
    app.use('/assets', serveStatic(path.join(docRoot, 'assets'), { maxAge: '30d' }))
    app.use(serveStatic(docRoot))
    app.set('appPath', docRoot)
    app.use(morgan('combined'))
  }

  if ('development' === env || 'test' === env) {
    const docRoot = path.join(appConfig.root, '../langstudio-client/dist')
    // app.use(require('connect-livereload')())
    app.use('/assets', serveStatic(path.join(docRoot, 'assets'), { maxAge: 1 }))
    app.use(serveStatic(docRoot, {
      maxAge: 0,
      setHeaders: (res: Response, path: string) => {
        if (/\/[^/]+\.bundle\./.test(path) || /(?:otf|eot|svg|ttf|woff|woff2)$/.test(path)) {
          res.setHeader('Cache-Control', 'public, max-age=' + 1)
        }
      }
    }))
    app.set('appPath', docRoot)
    app.use(morgan('dev'))
    app.use(require('errorhandler')())// error handler - has to be last
  }

}
