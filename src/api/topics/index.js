'use strict'
const router = require('express').Router()
const topicController = require('./topicController')
const uploadController = require('./uploadController')
const auth = require('../../auth/authService')

router.get('/index', auth.authGuard(), topicController.getIndexTopics)
router.get('/all', auth.authGuard(), topicController.getAllTopics)
router.get('/groups', auth.roleGuard('admin'), topicController.getGroups)
router.get('/:pub', auth.authGuard(), topicController.getPublicationTopics)

router.delete( '/:filename', auth.roleGuard('admin'), uploadController.removeTopic )
router.post('/', auth.roleGuard('admin'), uploadController.uploadFile)

module.exports = router
