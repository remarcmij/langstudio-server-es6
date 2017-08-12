import { Router } from 'express'
const router = Router()

import localPassport from './local/passport'
import googlePassport from './google/passport'
import localRoutes = require('./local')
import googleRoutes = require('./google')

import { appConfig } from '../config/environment'
import { setTokenCookie } from './authService'

localPassport(appConfig)
googlePassport(appConfig)

router.use('/local', localRoutes, setTokenCookie)
router.use('/google', googleRoutes)

export = router
