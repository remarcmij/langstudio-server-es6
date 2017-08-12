import { Router } from 'express'
import * as passport from 'passport'
import { signToken, setTokenCookie } from '../authService'
const router = Router()

router
  .get('/', passport.authenticate('google', {
    failureRedirect: '/signup', // todo: change to some error screen
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file'
    ],
    session: false
  }))

  .get('/callback', passport.authenticate('google', { failureRedirect: '/signup', session: false }), setTokenCookie)

  .post('/idtoken', passport.authenticate('google-id-token', { session: false }), (req, res) => {
    if (req.user) {
      const token = signToken(req.user._id)
      res.json({ token })
    } else {
      res.sendStatus(401)
    }
  })

export = router
