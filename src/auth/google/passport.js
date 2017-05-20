'use strict'
const passport = require('passport')
const { OAuth2Strategy } = require('passport-google-oauth')
const UserModel = require('../../api/user/userModel')
// require("request-debug")(httpRequest)
const GoogleTokenStrategy = require('passport-google-id-token')

module.exports = (config) => {
  passport.use(new OAuth2Strategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL
  }, oauthCallback))

  passport.use(new GoogleTokenStrategy(idTokenCallback))

  function oauthCallback(accessToken, refreshToken, profile, done) {
    UserModel.findOne({ 'google.id': profile.id }, (err, user) => {
      if (!user) {
        const now = new Date()
        user = new UserModel({
          name: profile.displayName,
          email: profile.emails ? profile.emails[0].value : 'unknown',
          role: 'user',
          groups: ['public'],
          username: profile.displayName,
          provider: 'google',
          refreshToken: refreshToken,
          google: profile._json,
          created: now,
          lastAccessed: now
        })
      } else {
        if (refreshToken) {
          user.refreshToken = refreshToken
        }
      }
      user.save(err => {
        if (err) {
          return void done(err)
        }
        done(err, user)
      })
    })
  }

  function idTokenCallback(parsedToken, googleId, done) {
    // const audience = parsedToken.aud
    // TODO: check audience against clientIDs
    UserModel.findOne({
      'google.id': googleId
    }, (err, user) => {
      if (!user) {
        UserModel.create({
          role: 'user',
          groups: ['public'],
          provider: 'google',
          google: { id: googleId }
        }, done)
      } else {
        done(err, user)
      }
    })
  }
}
