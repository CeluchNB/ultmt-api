import { Request, Response, Router } from 'express'
import passport from 'passport'
import RosterRequestServices from '../services/roster-request'
import RosterRequest from '../models/roster-request'
import Team from '../models/team'
import User from '../models/user'
import { errorMiddleware } from '../middleware/errors'
import { IUserDocument } from '../types'

export const rosterRequestRouter = Router()

rosterRequestRouter.post(
    '/request/team/:id',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.requestFromTeam(
                (req.user as IUserDocument)._id,
                req.params.id,
                req.query.user as string,
            )

            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/user',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.requestFromPlayer((req.user as IUserDocument)._id, req.query.team as string)
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.use(errorMiddleware)