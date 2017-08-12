import { Router } from 'express'
import * as passport from 'passport'
import { User } from '../../api/user/userModel'
const router = Router()

router.post('/', (req, res, next) => {
  passport.authenticate('local', (err: Error, user: User, info: any): void => {
    const error = err || info
    if (error) {
      return void res.status(401).json(error)
    }
    if (!user) {
      return void res.status(404).json({
        message: 'Something went wrong, please try again.'
      })
    }

    req.user = user

    // res.sendStatus(200)
    next()
    // var token = auth.signToken(user._id)
    // res.json({ token: token })
  })(req, res, next)
})

export = router
