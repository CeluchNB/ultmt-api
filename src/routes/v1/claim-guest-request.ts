import { Request, RequestHandler, Response, Router } from 'express'
import passport from 'passport'
import { body } from 'express-validator'
import User from '../../models/user'
import { Logger } from '../../logging'
import ClaimGuestRequestServices from '../../services/v1/claim-guest-request'
import ClaimGuestRequest from '../../models/claim-guest-request'
import Team from '../../models/team'

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
            const services = new ClaimGuestRequestServices(ClaimGuestRequest, User, Team)
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
