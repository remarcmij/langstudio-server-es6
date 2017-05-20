'use strict'
const router = require('express').Router()

const controller = require('./downloadController')

router.get('/info/:file', controller.getInfo)
router.get('/get/:file', controller.getFile)

module.exports = router
