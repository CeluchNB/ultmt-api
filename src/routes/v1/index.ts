import { userRouter } from './user'
import { teamRouter } from './team'
import { rosterRequestRouter } from './roster-request'
import { otpRouter } from './one-time-passcode'
import { authRouter } from './authentication'
import { verificationRequestRouter } from './verification-request'
import { teamDesignationRouter } from './team-designation'
import { Router } from 'express'

export const router = Router()

router.use(userRouter)
router.use(teamRouter)
router.use(rosterRequestRouter)
router.use(otpRouter)
router.use(authRouter)
router.use(verificationRequestRouter)
router.use(teamDesignationRouter)
