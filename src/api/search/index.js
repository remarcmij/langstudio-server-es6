'use strict'
const router = require('express').Router()

const search = require('./search')
const auth = require('../../auth/authService')

router.get('/autocomplete', search.autoCompleteSearch)
router.get('/public', search.dictSearch)
router.get('/authed', auth.authGuard(), search.dictSearch)
router.get('/article', auth.authGuard(), search.paraSearch)

module.exports = router
