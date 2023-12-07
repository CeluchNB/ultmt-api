import { Request, Response, Router } from 'express'
import { errorMiddleware } from '../../middleware/errors'
import passport from 'passport'
import { body, param, query } from 'express-validator'
import { getVerification, requestVerification, respondToVerification } from '../../services/v1/verification-request'

export const verificationRequestRouter = Router()

verificationRequestRouter.get(
    '/verification-request/:id',
    param('id').isString(),
    async (req: Request, res: Response, next) => {
        try {
            const verificationRequest = await getVerification(req.params.id)
            res.json({ verificationRequest })
        } catch (e) {
            next(e)
        }
    },
)

verificationRequestRouter.post(
    '/verification-request',
    body('sourceType').isString(),
    body('sourceId').isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const { sourceType, sourceId } = req.body
            await requestVerification(sourceType, sourceId, req.user?.id)
            res.sendStatus(201)
        } catch (e) {
            next(e)
        }
    },
)

verificationRequestRouter.put(
    '/verification-request/:id',
    param('id').isString(),
    query('response').isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const verificationRequest = await respondToVerification(
                req.params.id,
                req.query.response as 'approved' | 'denied',
                req.user?.id,
            )

            res.json({ verificationRequest })
        } catch (e) {
            next(e)
        }
    },
)

verificationRequestRouter.use(errorMiddleware)
