import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import * as _ from 'lodash'

const log = require('../../services/logService')
import UserModel, { User } from './userModel'
import { appConfig } from '../../config/environment'

const UNSAFE_FIELDS = '-salt -hashedPassword -refreshToken'

const validationError = (res: Response, err: Error) => res.status(422).json(err)

export function index(req: Request, res: Response) {
  UserModel.find({})
    .sort('email')
    .select('-salt -hashedPassword -settings')
    .exec()
    .then(users => {
      res.status(200).json(users)
    })
    .catch((err: Error) => {
      res.status(500).send(err.message)
    })
}

export function create(req: Request, res: Response) {
  const now = new Date()
  const newUser = new UserModel(req.body)
  newUser.provider = 'local'
  newUser.role = 'user'
  newUser.groups = ['public']
  newUser.created = now
  newUser.lastAccessed = now
  newUser.save((err, user) => {
    if (err) {
      validationError(res, err)
      return
    }
    const token = jwt.sign({ _id: user._id }, appConfig.secrets.session, { expiresIn: '5h' })
    res.json({ token })
  })
}

export function show(req: Request, res: Response, next: NextFunction) {
  const userId = req.params.id

  UserModel.findById(userId, (err, user) => {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.sendStatus(401)
    }
    res.json(user.profile)
  })
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
export function destroy(req: Request, res: Response) {
  Promise.resolve(UserModel.findByIdAndRemove(req.params.id).exec())
    .then(() => {
      res.sendStatus(204)
    })
    .catch(err => {
      res.status(500).send(err)
    })
}

/**
 * Change a users password
 */
export function changePassword(req: Request, res: Response) {
  const userId = req.user._id
  const oldPass = req.body.oldPassword
  const newPass = req.body.newPassword

  UserModel.findById(userId).exec()
    .then(user => {
      if (user.authenticate(oldPass)) {
        user.password = newPass
        user.save(err => {
          if (err) {
            validationError(res, err)
            return
          }
          log.info('password changed', req.user)
          res.sendStatus(200)
        })
      } else {
        res.sendStatus(403)
      }
    })
    .catch(err => {
      res.status(500).json(err)
    })
}

export function googleUpdate(req: Request, res: Response) {
  const userId = req.user._id
  const { name, email, googleId, googleImageUrl } = req.body

  if (!(userId && name && email && googleId)) {
    res.sendStatus(400)
    return
  }

  UserModel.findById(userId).exec()
    .then(user => {
      if (user.provider !== "google" || user.google.id !== googleId) {
        return void res.sendStatus(403)
      }

      user.name = name
      user.email = email
      user.google.image.url = googleImageUrl

      user.save(err => {
        if (err) {
          throw err
        }
        res.sendStatus(200)
      })
    })
    .catch(() => res.sendStatus(500))
}

export function changeGroups(req: Request, res: Response) {
  const userId = req.params.id
  const groups = req.body.groups

  // should alway allow 'public'
  if (groups.indexOf('public') === -1) {
    groups.push('public')
  }

  UserModel.findById(userId).exec()
    .then(user => {
      user.groups = groups
      user.save(err => {
        if (err) {
          return void res.status(422).json(err)
        }
        log.info('groups changed', req.user)
        return void res.sendStatus(200)
      })
    })
    .catch(err => {
      res.status(500).json(err)
    })
}

/**
 * Get my info
 */
export function me(req: Request, res: Response, next: NextFunction) {
  const userId = req.user._id
  UserModel.findOne({
    _id: userId
  }, (err, user) => {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.sendStatus(401)
    }

    user.lastAccessed = new Date()
    user.save()

    // remove sensitive and unnecessary fields
    const safeUser = _.omit(user.toObject(), ['salt', 'hashedPassword', 'refreshToken', 'settings'])

    log.info(`identity fetched: ${user.handle}`)
    res.json(safeUser)
  })
}

export function getSettings(req: Request, res: Response, next: NextFunction) {
  const userId = req.user._id
  UserModel.findById(userId, 'settings', (err, user) => {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.sendStatus(401)
    }
    res.json(user.settings)
  })
}

export function putSettings(req: Request, res: Response, next: NextFunction) {
  const userId = req.user._id
  UserModel.findOneAndUpdate(
    { _id: userId },
    { settings: req.body },
    { select: 'settings email' },
    (err, user) => {
      if (err) {
        return next(err)
      }
      if (!user) {
        return res.sendStatus(401)
      }
      log.debug(`settings updated`, req.user)
      res.json(user.settings)
    })
}

/**
 * Get user info
 */
export function getUser(req: Request, res: Response, next: NextFunction) {
  const userId = req.params.id
  UserModel.findOne({
    _id: userId
  }, UNSAFE_FIELDS, (err, user) => { // don't ever give out the password or salt
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.sendStatus(401)
    }
    // if (user.groups.indexOf('public') === -1) {
    //     user.groups.push('public')
    // }
    res.json(user)
  })
}

/**
 * Authentication callback
 */
export function authCallback(req: Request, res: Response) {
  res.redirect('/')
}
