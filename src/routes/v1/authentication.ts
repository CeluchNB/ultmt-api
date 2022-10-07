import { Request, Response, Router } from 'express'
import { errorMiddleware } from '../../middleware/errors'
import passport from 'passport'
import User from '../../models/user'
import Team from '../../models/team'
import { query } from 'express-validator'
import AuthenticationServices from '../../services/v1/authentication'
import { client } from '../../loaders/redis'

export const authRouter = Router()

authRouter.post(
    '/auth/login',
    passport.authenticate('local', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new AuthenticationServices(User, Team, client)
            const token = await userService.login(req.user?.id as string)
            return res.json({ token })
        } catch (error) {
            next(error)
        }
    },
)

authRouter.post(
    '/auth/logout',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '')

            const userService = new AuthenticationServices(User, Team, client)
            await userService.logout(req.user?.id as string, token as string)
            return res.send()
        } catch (error) {
            next(error)
        }
    },
)

authRouter.get(
    '/auth/manager',
    query('team').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new AuthenticationServices(User, Team, client)
            const user = await userService.authenticateManager(req.user?.id as string, req.query.team as string)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

authRouter.use(errorMiddleware)
