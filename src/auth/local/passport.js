'use strict'
const passport = require('passport')

const UserModel = require('../../api/user/userModel')
const LocalStrategy = require('passport-local').Strategy

module.exports = config => {
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password' // this is the virtual field on the model
  }, (email, password, done) => {
    UserModel.findOne({
      email: email.toLowerCase()
    }, (err, user) => {
      if (err) return done(err)

      if (!user) {
        return done(null, false, { message: 'This email is not registered.' })
      }
      if (!user.authenticate(password)) {
        return done(null, false, { message: 'This password is not correct.' })
      }
      return done(null, user)
    })
  }))
}

