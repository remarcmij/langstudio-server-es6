'use strict'
const path = require('path')
const morgan = require('morgan')
const serveStatic = require('serve-static')
const bodyParser = require('body-parser')

const config = require('./environment')

const ONE_DAY = 86400000

module.exports = app => {
  const env = app.get('env')
  app.set('views', config.root + '/server/views')
  app.engine('html', require('ejs').renderFile)
  app.set('view engine', 'html')
  app.use(require('compression')())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
  app.use(require('method-override')('getter'))
  app.use(require('cookie-parser')())
  app.use(require('passport').initialize())

  if ('production' === env) {
    const docRoot = path.join(config.root, 'public')
    app.use(serveStatic(path.join(docRoot, 'favicon.ico')))
    app.use(serveStatic(docRoot, {
      maxAge: 0,
      setHeaders: (res, path) => {
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
    const docRoot = path.join(config.root, '../langstudio-client/dist')
    // app.use(require('connect-livereload')())
    app.use('/assets', serveStatic(path.join(docRoot, 'assets'), { maxAge: 1 }))
    app.use(serveStatic(docRoot, {
      maxAge: 0,
      setHeaders: (res, path) => {
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
