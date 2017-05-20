'use strict'
const router = require('express').Router()

const config = require('../config/environment')
const auth = require('./authService')

// Passport Configuration
require('./local/passport')(config)
require('./google/passport')(config)

router.use('/local', require('./local'), auth.setTokenCookie)
router.use('/google', require('./google'))

module.exports = router
