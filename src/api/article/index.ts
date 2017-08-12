import { Router } from 'express'
const router = Router()

import { getArticle } from './articleController'
import { authGuard } from '../../auth/authService'

router.get('/:filename', authGuard(), getArticle)

export = router
