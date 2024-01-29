import { Request, RequestHandler, Response, Router } from 'express'
import passport from 'passport'
import RosterRequestServices from '../../services/v1/roster-request'
import RosterRequest from '../../models/roster-request'
import Team from '../../models/team'
import User from '../../models/user'
import { errorMiddleware } from '../../middleware/errors'
import { param, query } from 'express-validator'
import { Logger } from '../../logging'

export const rosterRequestRouter = Router()

const logger = Logger()

rosterRequestRouter.get(
    '/request/userRequests',
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const requests = await services.getRequestsByUser(req.user?.id as string)
            return res.json({ requests })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.get(
    '/request/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.getRosterRequest(req.params.id, req.user?.id as string)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.requestFromTeam(
                req.user?.id as string,
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.requestFromPlayer(req.user?.id as string, req.query.team as string)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.teamRespondToRequest(req.user?.id as string, req.params.id, true)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.teamRespondToRequest(req.user?.id as string, req.params.id, false)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.userRespondToRequest(req.user?.id as string, req.params.id, true)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.userRespondToRequest(req.user?.id as string, req.params.id, false)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.teamDelete(req.user?.id as string, req.params.id)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const request = await services.userDelete(req.user?.id as string, req.params.id)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new RosterRequestServices(Team, User, RosterRequest)
            const requests = await services.getRequestsByTeam(req.params.id, req.user?.id as string)
            return res.json({ requests })
        } catch (error) {
            next(error)
        }
    },
)

rosterRequestRouter.use(errorMiddleware)
