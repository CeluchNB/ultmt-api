// export * from './user'
// export * from './team'
// export * from './roster-request'
import { userRouter } from './user'
import { teamRouter } from './team'
import { rosterRequestRouter } from './roster-request'
import { Router } from 'express'

export const router = Router()

router.use(userRouter)
router.use(teamRouter)
router.use(rosterRequestRouter)
