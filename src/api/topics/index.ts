'use strict'
import { Router } from 'express'
const router = Router()
import { getIndexTopics, getAllTopics, getPublicationTopics, getGroups } from './topicController'
const uploadController = require('./uploadController')
import { authGuard, roleGuard } from '../../auth/authService'

router.get('/index', authGuard(), getIndexTopics)
router.get('/all', authGuard(), getAllTopics)
router.get('/groups', roleGuard('admin'), getGroups)
router.get('/:pub', authGuard(), getPublicationTopics)

router.delete('/:filename', roleGuard('admin'), uploadController.removeTopic)
router.post('/', roleGuard('admin'), uploadController.uploadFile)

export = router
