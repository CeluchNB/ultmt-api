import { Request, RequestHandler, Response, Router } from 'express'
import passport from 'passport'
import { deleteExpiredPasscodes } from '../../utils/jobs'
import OneTimePasscodeServices from '../../services/v1/one-time-passcode'
import { body } from 'express-validator'
import OneTimePasscode from '../../models/one-time-passcode'
import User from '../../models/user'
import { errorMiddleware } from '../../middleware/errors'
import { Logger } from '../../logging'

export const otpRouter = Router()

const logger = Logger()
otpRouter.use(logger.requestMiddleware as RequestHandler)

// DELETE endpoint to delete expired
otpRouter.delete('/otp/expired', async (req: Request, res: Response, next) => {
    try {
        await deleteExpiredPasscodes()
        return res.send()
    } catch (error) {
        next(error)
    }
})

// POST otp
otpRouter.post(
    '/otp',
    body('reason').isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const services = new OneTimePasscodeServices(OneTimePasscode, User)
            const code = await services.createOtp(req.user?.id as string, req.body.reason)
            return res.status(201).json({ code })
        } catch (error) {
            next(error)
        }
    },
)

otpRouter.use(errorMiddleware)
