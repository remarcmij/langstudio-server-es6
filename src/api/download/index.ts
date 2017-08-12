import { Router } from 'express'
const router = Router()

import {getInfo, getFile}  from './downloadController'

router.get('/info/:file', getInfo)
router.get('/get/:file', getFile)

export default router
