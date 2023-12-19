import { Request, Response, Router } from 'express'
import { errorMiddleware } from '../../middleware/errors'
import passport from 'passport'
import { body } from 'express-validator'
import { createTeamDesignation, getDesignations } from '../../services/v1/team-designation'

export const teamDesignationRouter = Router()

teamDesignationRouter.post(
    '/team-designation',
    body('designationData').isObject(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const designation = await createTeamDesignation(req.user?.id as string, req.body.designationData)
            res.status(201).json({ designation })
        } catch (e) {
            next(e)
        }
    },
)

teamDesignationRouter.get('/team-designations', async (req: Request, res: Response) => {
    const designations = await getDesignations()
    res.status(200).json({ designations })
})

teamDesignationRouter.use(errorMiddleware)
