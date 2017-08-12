import { Router } from 'express'
const router = Router()

import * as controller from './userController'
import { authGuard, roleGuard } from '../../auth/authService'

router.get('/', roleGuard('admin'), controller.index)
router.get('/me/settings', authGuard(), controller.getSettings)
router.patch('/me/settings', authGuard(), controller.putSettings)
router.get('/me', authGuard(), controller.me)
router.get('/:id', roleGuard('admin'), controller.getUser)
router.delete('/:id', roleGuard('admin'), controller.destroy)
router.put('/:id/password', authGuard(), controller.changePassword)
router.put('/:id/groups', authGuard(), controller.changeGroups)
router.post('/', controller.create)
router.post('/google/update', authGuard(), controller.googleUpdate)

export = router
