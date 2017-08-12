import { Express } from 'express'
import topics = require('./topics')
import article = require('./article')
import search = require('./search')
import user = require('./user')
import auth = require('../auth')

export default function (app: Express) {
  app.all('/api/*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With')
    next()
  })

  // Insert routes below
  app.use('/api/topics', topics)
  app.use('/api/upload', topics)
  app.use('/api/article', article)
  app.use('/api/search', search)
  // app.use('/api/download', require('./download'))
  // app.use('/api/google', require('./google'))
  app.use('/api/users', user)
  app.use('/auth', auth)

  // All undefined asset or api routes should return a 404
  // app
  //   .route('/:url(api|auth|components|app|bower_components|assets)/*')
  //   .get(errors[404])

  // All other routes should redirect to the index.html
  app.route('/*').get(function (req, res) {
    res.sendFile('index.html', { root: app.get('appPath') })
  })
}
