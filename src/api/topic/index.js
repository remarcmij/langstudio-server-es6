'use strict'
const router = require('express').Router()
const topicController = require('./topicController')
const uploadController = require('./uploadController')
const auth = require('../../auth/authService')

router.get('/pub/:pub', topicController.getPublication)
router.get('/pub', topicController.getCollection)
router.get('/auth/:pub', auth.authGuard(), topicController.getPublication)
router.get('/auth', auth.authGuard(), topicController.getCollection)

router.get('/app', auth.authGuard(), topicController.getAppTopics)
router.get('/admin', auth.hasRole('admin'), topicController.getAdminTopics)
router.delete('/admin/:filename', auth.hasRole('admin'), uploadController.removeTopic)
router.get('/groups', topicController.getGroupInfo)
router.post('/', auth.hasRole('admin'), uploadController.uploadFile)

module.exports = router
