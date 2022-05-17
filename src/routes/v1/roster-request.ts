import { Request, Response, Router } from 'express'
import passport from 'passport'
import RosterRequestServices from '../../services/v1/roster-request'
import RosterRequest from '../../models/roster-request'
import Team from '../../models/team'
import User from '../../models/user'
import { errorMiddleware } from '../../middleware/errors'
import { IUser } from '../../types'
import { param, query } from 'express-validator'

export const rosterRequestRouter = Router()

rosterRequestRouter.get(
    '/request/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.getRosterRequest(req.params.id, (req.user as IUser)._id.toString())
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/team/:id',
    param('id').escape().isString(),
    query('user').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.requestFromTeam(
                (req.user as IUser)._id.toString(),
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
    query('team').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.requestFromPlayer(
                (req.user as IUser)._id.toString(),
                req.query.team as string,
            )
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/team/accept/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.teamRespondToRequest((req.user as IUser)._id.toString(), req.params.id, true)
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/team/deny/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.teamRespondToRequest(
                (req.user as IUser)._id.toString(),
                req.params.id,
                false,
            )
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/user/accept/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.userRespondToRequest((req.user as IUser)._id.toString(), req.params.id, true)
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/user/deny/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.userRespondToRequest(
                (req.user as IUser)._id.toString(),
                req.params.id,
                false,
            )
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/team/delete/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.teamDelete((req.user as IUser)._id.toString(), req.params.id)
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.post(
    '/request/user/delete/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.userDelete((req.user as IUser)._id.toString(), req.params.id)
            return res.json({ request })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.get(
    '/request/team/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const requests = await services.getRequestsByTeam(req.params.id, (req.user as IUser)._id.toString())
            return res.json({ requests })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.use(errorMiddleware)
