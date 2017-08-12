import * as passport from 'passport'
const LocalStrategy = require('passport-local').Strategy

import UserModel from '../../api/user/userModel'
import {AppConfig} from '../../config/environment'

export default function(config: AppConfig) {
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password' // this is the virtual field on the model
  }, (email: string, password: string, done: Function) => {
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

