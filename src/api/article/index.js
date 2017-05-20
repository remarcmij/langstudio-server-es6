'use strict'
const router = require('express').Router()

const articleController = require('./articleController')
const hashTagController = require('./hashtagController')
const auth = require('../../auth/authService')

// note: hash is ignored by controller, only purpose is for browser cache busting
router.get('/public/get/:filename/:hash', articleController.getArticle)
router.get('/authed/get/:filename/:hash', auth.authGuard(), articleController.getArticle)
router.get('/public/search', articleController.searchArticles)
router.get('/authed/search', auth.authGuard(), articleController.searchArticles)
router.get('/authed/hashtag/search', auth.authGuard(), hashTagController.searchHashTags)
router.get('/authed/hashtag/all', auth.authGuard(), hashTagController.getAllHashTags)

module.exports = router
