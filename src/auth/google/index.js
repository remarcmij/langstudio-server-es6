'use strict'
const router = require('express').Router()
const passport = require('passport')
const auth = require('../authService')

router
  .get('/', passport.authenticate('google', {
    failureRedirect: '/signup', // todo: change to some error screen
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file'
    ],
    accessType: 'offline',
    // prompt: 'consent',
    session: false
  }))

  .get('/callback', passport.authenticate('google', { failureRedirect: '/signup', session: false }), auth.setTokenCookie)

  .post('/idtoken', passport.authenticate('google-id-token', { session: false }), (req, res) => {
    if (req.user) {
      const token = auth.signToken(req.user._id)
      res.json({ token })
    } else {
      res.sendStatus(401)
    }
  })

module.exports = router
