import { Request, RequestHandler, Response, Router } from 'express'
import passport from 'passport'
import { body, param } from 'express-validator'
import User from '../../models/user'
import { Logger } from '../../logging'
import ClaimGuestRequestServices from '../../services/v1/claim-guest-request'
import ClaimGuestRequest from '../../models/claim-guest-request'
import Team from '../../models/team'
import ArchiveTeam from '../../models/archive-team'

export const claimGuestRequestRouter = Router()

const logger = Logger()

claimGuestRequestRouter.post(
    '/claim-guest-request',
    body('guestId').escape(),
    body('teamId').escape(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new ClaimGuestRequestServices(ClaimGuestRequest, User, Team, ArchiveTeam)
            const request = await services.createClaimGuestRequest(
                req.user?.id as string,
                req.body.guestId,
                req.body.teamId,
            )
            return res.status(201).json({ request })
        } catch (e) {
            next(e)
        }
    },
)

claimGuestRequestRouter.put(
    '/claim-guest-request/:id/deny',
    param('id').escape(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new ClaimGuestRequestServices(ClaimGuestRequest, User, Team, ArchiveTeam)
            const request = await services.denyClaimGuestRequest(req.user?.id as string, req.params.id)
            return res.json({ request })
        } catch (e) {
            next(e)
        }
    },
)

claimGuestRequestRouter.put(
    '/claim-guest-request/:id/accept',
    param('id').escape(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new ClaimGuestRequestServices(ClaimGuestRequest, User, Team, ArchiveTeam)
            const request = await services.acceptClaimGuestRequest(req.user?.id as string, req.params.id)
            return res.json({ request })
        } catch (e) {
            next(e)
        }
    },
)

claimGuestRequestRouter.get(
    '/claim-guest-request/team/:id',
    param('id').escape(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const services = new ClaimGuestRequestServices(ClaimGuestRequest, User, Team, ArchiveTeam)
            const requests = await services.getTeamRequests(req.user?.id as string, req.params.id)
            return res.json({ requests })
        } catch (e) {
            next(e)
        }
    },
)
