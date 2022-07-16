import { Request, Response, Router } from 'express'
import { deleteExpiredPasscodes } from '../../utils/jobs'

export const otpRouter = Router()

// DELETE endpoint to delete expired
otpRouter.delete('/otp/expired', async (req: Request, res: Response, next) => {
    try {
        await deleteExpiredPasscodes()
        res.send()
    } catch (error) {
        next(error)
    }
})
