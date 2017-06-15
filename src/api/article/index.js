'use strict'
const router = require('express').Router()

const articleController = require('./articleController')
const auth = require('../../auth/authService')

router.get('/pub/:filename', articleController.getArticle)
router.get('/auth/:filename', auth.authGuard(), articleController.getArticle)

module.exports = router
