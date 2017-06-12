'use strict'
const router = require('express').Router()

const articleController = require('./articleController')
const hashTagController = require('./hashtagController')
const auth = require('../../auth/authService')

// note: hash is ignored by controller, only purpose is for browser cache busting
router.get('/pub/search', articleController.searchArticles)
router.get('/auth/search', auth.authGuard(), articleController.searchArticles)
router.get('/auth/hashtag/search', auth.authGuard(), hashTagController.searchHashTags)
router.get('/auth/hashtag/all', auth.authGuard(), hashTagController.getAllHashTags)
router.get('/pub/:filename/:hash', articleController.getArticle)
router.get('/auth/:filename/:hash', auth.authGuard(), articleController.getArticle)

module.exports = router
