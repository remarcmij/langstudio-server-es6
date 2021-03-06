'use strict'
const jwt = require('jsonwebtoken')
const expressJwt = require('express-jwt')
const fp = require('lodash/fp')
const compose = require('composable-middleware')

const UserModel = require('../api/user/userModel')
const config = require('../config/environment')

const validateJwt = expressJwt({ secret: config.secrets.session })
const EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60 // days * hours/day * minutes/hour * seconds/minute

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
function authGuard() {
  const getAuthorizationHeader = req =>
    req.headers['authorization'] || req.headers['Authorization']

  return (
    compose()
      // Validate jwt
      .use(function(req, res, next) {
        const { query, headers } = req
        // allow the access token to be passed through query parameter as well
        if (query && query.hasOwnProperty('auth')) {
          headers['authorization'] = 'Bearer ' + query['auth']
        }
        if (getAuthorizationHeader(req)) {
          validateJwt(req, res, next)
        } else {
          next()
        }
      })
      // Attach user to request
      .use((req, res, next) => {
        if (getAuthorizationHeader(req)) {
          UserModel.findById(req.user._id, (err, user) => {
            if (err) return next(err)
            req.user = user
            next()
          })
        } else {
          next()
        }
      })
  )
}

/**
 * Checks if the user role meets the minimum requirements of the route
 */
function roleGuard(role) {
  if (!role) throw new Error('Required role needs to be set')

  return compose().use(authGuard()).use((req, res, next) => {
    if (
      config.userRoles.indexOf(req.user.role) >= config.userRoles.indexOf(role)
    ) {
      next()
    } else {
      res.sendStatus(403)
    }
  })
}

/**
 * Checks if the user role meets the minimum requirements of the route
 */
function hasProvider(providerName) {
  if (!providerName) throw new Error('Provider name needs to be set')

  return compose().use(authGuard()).use((req, res, next) => {
    if (req.user.provider === providerName) {
      next()
    } else {
      res.sendStatus(403)
    }
  })
}

/**
 * Returns a jwt token signed by the app secret
 */
function signToken(id) {
  return jwt.sign({ _id: id }, config.secrets.session, {
    expiresIn: EXPIRES_IN_SECONDS
  })
}

/**
 * Set token cookie directly for oAuth strategies
 */
function setTokenCookie(req, res) {
  if (!req.user) {
    return void res
      .status(404)
      .json({ message: 'Something went wrong, please try again.' })
  }
  const token = signToken(req.user._id)
  res.cookie('token', JSON.stringify(token), {
    maxAge: EXPIRES_IN_SECONDS * 1000
  })
  res.redirect('/')
}

const userGroupsCondition = fp.curry((user, condition) => {
  const hasRole = role => user => user.role === role
  const anonymous = () => ({ groupName: 'public' })
  const authenticated = user =>
    hasRole('admin')(user)
      ? {}
      : { groupName: { $in: fp.uniq([...user.groups, 'public']) } }
  const groups = (user => (user ? authenticated(user) : anonymous()))(user)
  return { ...condition, ...groups }
})

module.exports = {
  authGuard,
  roleGuard,
  hasProvider,
  signToken,
  setTokenCookie,
  userGroupsCondition
}
