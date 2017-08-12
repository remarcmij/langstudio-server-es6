import * as passport from 'passport'
import { OAuth2Strategy } from 'passport-google-oauth'
const GoogleTokenStrategy = require('passport-google-id-token')

import UserModel from '../../api/user/userModel'
import { AppConfig } from '../../config/environment'

function oauthCallback(accessToken: string, refreshToken: string, profile: any, done: Function) {
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

function idTokenCallback(parsedToken: string, googleId: string, done: Function) {
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

export default function (config: AppConfig) {
  passport.use(new OAuth2Strategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL
  }, oauthCallback))

  passport.use(new GoogleTokenStrategy(idTokenCallback))
}
