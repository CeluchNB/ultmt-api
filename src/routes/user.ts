import { Request, Response, Router } from 'express'
import { IUser, IUserDocument } from '../types/user'
import UserServices from '../services/user'
import User from '../models/user'
import Team from '../models/team'
import { errorMiddleware } from '../middleware/errors'
import passport from 'passport'

export const userRouter = Router()

userRouter.post('/user', async (req: Request, res: Response, next) => {
    try {
        const user: IUser = req.body
        const userService = new UserServices(User, Team)

        const userObject = await userService.signUp(user)
        return res.status(201).json(userObject)
    } catch (error) {
        next(error)
    }
})

userRouter.post(
    '/user/login',
    passport.authenticate('local', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const user: IUser = req.user as IUser
            const userService = new UserServices(User, Team)
            const token = await userService.login(user.email)
            return res.json({ token })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.post(
    '/user/logout',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '')
            const email = (req?.user as IUser).email

            const userService = new UserServices(User, Team)
            await userService.logout(email, token as string)
            return res.send()
        } catch (error) {
            next(error)
        }
    },
)

userRouter.post(
    '/user/logoutAll',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const email = (req?.user as IUser).email

            const userService = new UserServices(User, Team)
            await userService.logoutAll(email)
            return res.send()
        } catch (error) {
            next(error)
        }
    },
)

userRouter.get('/user/me', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response) => {
    return res.send(req.user)
})

userRouter.get('/user/:id', async (req: Request, res: Response, next) => {
    try {
        const userService = new UserServices(User, Team)
        const user = await userService.getUser(req.params.id)
        return res.json(user)
    } catch (error) {
        next(error)
    }
})

userRouter.delete(
    '/user/me',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const id = (req.user as IUserDocument)._id
            const userService = new UserServices(User, Team)
            await userService.deleteUser(id)
            return res.send()
        } catch (error) {
            next(error)
        }
    },
)

userRouter.post(
    '/user/open',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const id = (req.user as IUserDocument)._id
            const userService = new UserServices(User, Team)
            const user = await userService.setOpenToRequests(id, req.query.open === 'true')
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.post(
    '/user/leave/team',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const id = (req.user as IUserDocument)._id
            const userService = new UserServices(User, Team)
            const user = await userService.leaveTeam(id, req.query.team as string)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.use(errorMiddleware)
