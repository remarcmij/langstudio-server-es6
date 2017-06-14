'use strict'
const jwt = require('jsonwebtoken')
const _ = require('lodash')

const log = require('../../services/logService')
const UserModel = require('./userModel')
const config = require('../../config/environment')

const UNSAFE_FIELDS = '-salt -hashedPassword -refreshToken'

const validationError = (res, err) => res.status(422).json(err)

function index(req, res) {
  Promise.resolve(UserModel.find({})
    .sort('email')
    .select('-salt -hashedPassword -settings'))
    .then(users => {
      res.status(200).json(users)
    })
    .catch(err => {
      res.status(500).send(err)
    })
}

function create(req, res) {
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
    const token = jwt.sign({ _id: user._id }, config.secrets.session, { expiresIn: '5h' })
    res.json({ token })
  })
}


function show(req, res, next) {
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
function destroy(req, res) {
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
function changePassword(req, res) {
  const userId = req.user._id
  const oldPass = req.body.oldPassword
  const newPass = req.body.newPassword

  Promise.resolve(UserModel.findById(userId).exec())
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

function googleUpdate(req, res) {
  const userId = req.user._id
  const { name, email, googleId, googleImageUrl } = req.body

  if (!(userId && name && email && googleId)) {
    res.sendStatus(400)
    return
  }

  Promise.resolve(UserModel.findById(userId))
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

function changeGroups(req, res) {
  const userId = req.params.id
  const groups = req.body.groups

  // should alway allow 'public'
  if (groups.indexOf('public') === -1) {
    groups.push('public')
  }

  Promise.resolve(UserModel.findById(userId).exec())
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
function me(req, res, next) {
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

function getSettings(req, res, next) {
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

function putSettings(req, res, next) {
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
function getUser(req, res, next) {
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
function authCallback(req, res) {
  res.redirect('/')
}

module.exports = {
  index,
  create,
  show,
  destroy,
  changePassword,
  googleUpdate,
  changeGroups,
  me,
  getSettings,
  putSettings,
  getUser,
  authCallback
}
