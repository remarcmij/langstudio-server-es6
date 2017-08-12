import * as jwt from 'jsonwebtoken'
import expressJwt = require('express-jwt')
import fp = require('lodash')
import { Request, Response, NextFunction, RequestHandler } from 'express'
const compose = require('composable-middleware')

import UserModel, { User, UserRole } from '../api/user/userModel'
import { appConfig } from '../config/environment'

console.log(appConfig.secrets.session)

const validateJwt = expressJwt({ secret: appConfig.secrets.session })
const EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60 // days * hours/day * minutes/hour * seconds/minute

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
export function authGuard(): RequestHandler {
  const getAuthorizationHeader = (req: Request) =>
    req.headers['authorization'] || req.headers['Authorization']

  return (
    compose()
      // Validate jwt
      .use((req: Request, res: Response, next: NextFunction) => {
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
      .use((req: Request, res: Response, next: NextFunction) => {
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
export function roleGuard(role: UserRole) {
  if (!role) throw new Error('Required role needs to be set')

  return compose()
    .use(authGuard())
    .use((req: Request, res: Response, next: NextFunction) => {
      if (
        appConfig.userRoles.indexOf(req.user.role) >= appConfig.userRoles.indexOf(role)
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
export function hasProvider(providerName: string) {
  if (!providerName) throw new Error('Provider name needs to be set')

  return compose()
    .use(authGuard())
    .use((req: Request, res: Response, next: NextFunction) => {
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
export function signToken(id: string) {
  return jwt.sign({ _id: id }, appConfig.secrets.session, {
    expiresIn: EXPIRES_IN_SECONDS
  })
}

/**
 * Set token cookie directly for oAuth strategies
 */
export function setTokenCookie(req: Request, res: Response): void {
  if (!req.user) {
    return void res.status(404)
      .json({ message: 'Something went wrong, please try again.' })
  }
  const token = signToken(req.user._id)
  res.cookie('token', JSON.stringify(token), {
    maxAge: EXPIRES_IN_SECONDS * 1000
  })
  res.redirect('/')
}

export const userGroupsCondition = (user: User) => (condition: {}): {} => {
  const userGroups = (user: User) => ({ groupName: { $in: fp.uniq([...user.groups, 'public']) } })
  const assignedGroups = (user: User): {} => user.role === 'admin' ? {} : userGroups(user)
  const groups = (user: User) => user ? assignedGroups(user) : ({ groupName: 'public' })
  return { ...condition, ...groups(user) }
}
