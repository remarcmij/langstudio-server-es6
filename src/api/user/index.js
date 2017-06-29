'use strict'
const router = require('express').Router()

const controller = require('./userController')
const auth = require('../../auth/authService')

router.get('/', auth.roleGuard('admin'), controller.index)
router.get('/me/settings', auth.authGuard(), controller.getSettings)
router.patch('/me/settings', auth.authGuard(), controller.putSettings)
router.get('/me', auth.authGuard(), controller.me)
router.get('/:id', auth.roleGuard('admin'), controller.getUser)
router.delete('/:id', auth.roleGuard('admin'), controller.destroy)
router.put('/:id/password', auth.authGuard(), controller.changePassword)
router.put('/:id/groups', auth.authGuard(), controller.changeGroups)
router.post('/', controller.create)
router.post('/google/update', auth.authGuard(), controller.googleUpdate)

module.exports = router
