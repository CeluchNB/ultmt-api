import { Request, Response, Router } from 'express'
import passport from 'passport'
import User from '../../models/user'
import Team from '../../models/team'
import { body, query } from 'express-validator'
import AuthenticationServices from '../../services/v1/authentication'
import { client } from '../../loaders/redis'

export const authRouter = Router()

authRouter.post(
    '/auth/login',
    passport.authenticate('local', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const authService = new AuthenticationServices(User, Team, client)
            const tokens = await authService.login(req.user?.id as string)
            return res.json({ tokens })
        } catch (error) {
            next(error)
        }
    },
)

authRouter.post(
    '/auth/logout',
    body('refreshToken').isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const accessToken = req.header('Authorization')?.replace('Bearer ', '')
            const refreshToken = req.body.refreshToken

            const authService = new AuthenticationServices(User, Team, client)
            await authService.logout(req.user?.id as string, accessToken as string, refreshToken)
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
            const authService = new AuthenticationServices(User, Team, client)
            const user = await authService.authenticateManager(req.user?.id as string, req.query.team as string)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

authRouter.post('/auth/refresh', async (req: Request, res: Response, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '')
        const authService = new AuthenticationServices(User, Team, client)
        const tokens = await authService.refreshTokens(token as string)
        return res.json({ tokens })
    } catch (error) {
        next(error)
    }
})
