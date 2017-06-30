'use strict'
const router = require('express').Router()
const topicController = require('./topicController')
const uploadController = require('./uploadController')
const auth = require('../../auth/authService')

router.get('/groups', topicController.getGroupInfo)
router.get('/app', auth.authGuard(), topicController.getAppTopics)
router.get('/admin', auth.roleGuard('admin'), topicController.getAdminTopics)
router.delete('/admin/:filename', auth.roleGuard('admin'), uploadController.removeTopic)
router.get('/publication/:pub', auth.authGuard(), topicController.getPublication)
router.get('/index', auth.authGuard(), topicController.getCollection)

router.post('/', auth.roleGuard('admin'), uploadController.uploadFile)

module.exports = router
