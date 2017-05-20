'use strict'
const router = require('express').Router()
const controller = require('./googleController')
const auth = require('../../auth/authService')

router.get('/drive/get/:name', auth.authGuard(), controller.getFile)
router.post('/drive/save/:name', auth.authGuard(), controller.saveFile)

router.get('/drive/settings/get', auth.authGuard(), controller.getSettings)
router.post('/drive/settings/save', auth.authGuard(), controller.saveSettings)

module.exports = router
