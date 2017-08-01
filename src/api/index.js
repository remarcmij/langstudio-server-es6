'use strict'
const errors = require('../components/errors')

module.exports = app => {
  app.all('/api/*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'X-Requested-With')
    next()
  })

  // Insert routes below
  app.use('/api/topics', require('./topics'))
  app.use('/api/upload', require('./topics'))
  app.use('/api/article', require('./article'))
  app.use('/api/search', require('./search'))
  app.use('/api/download', require('./download'))
  app.use('/api/google', require('./google'))
  app.use('/api/users', require('./user'))
  app.use('/auth', require('../auth'))

  // All undefined asset or api routes should return a 404
  app
    .route('/:url(api|auth|components|app|bower_components|assets)/*')
    .get(errors[404])

  // All other routes should redirect to the index.html
  app.route('/*').get(function(req, res) {
    res.sendFile('index.html', { root: app.get('appPath') })
  })
}
