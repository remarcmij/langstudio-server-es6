const router = require('express').Router()

const search = require('./search')
const paragraph = require('./paragraph')
const auth = require('../../auth/authService')

router.get('/autocomplete', search.autoCompleteSearch)
router.get('/dict/auth', auth.authGuard(), search.dictSearch)
router.get('/dict', search.dictSearch)
router.get('/para/auth', auth.authGuard(), paragraph.search)
router.get('/para', paragraph.search)

export = router
