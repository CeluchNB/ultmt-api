import { Request, Response, Router } from 'express'
import { CreateUser, IUser } from '../../types/user'
import UserServices from '../../services/v1/user'
import User from '../../models/user'
import Team from '../../models/team'
import { errorMiddleware } from '../../middleware/errors'
import passport from 'passport'

export const userRouter = Router()

userRouter.get('/user/search', async (req: Request, res: Response, next) => {
    try {
        const term = (req.query.q as string) || ''
        const userService = new UserServices(User, Team)
        const users = await userService.searchUsers(term)
        return res.json({ users })
    } catch (error) {
        next(error)
    }
})

userRouter.post('/user', async (req: Request, res: Response, next) => {
    try {
        const user: CreateUser = req.body
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
            const user: CreateUser = req.user as CreateUser
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
            const email = (req?.user as CreateUser).email

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
            const email = (req?.user as CreateUser).email

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
            const id = (req.user as IUser)._id
            const userService = new UserServices(User, Team)
            await userService.deleteUser(id.toString())
            return res.send()
        } catch (error) {
            next(error)
        }
    },
)

userRouter.put(
    '/user/open',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const id = (req.user as IUser)._id
            const userService = new UserServices(User, Team)
            const user = await userService.setOpenToRequests(id.toString(), req.query.open === 'true')
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
            const id = (req.user as IUser)._id
            const userService = new UserServices(User, Team)
            const user = await userService.leaveTeam(id.toString(), req.query.team as string)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.put(
    '/user/managerLeave',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userServices = new UserServices(User, Team)
            const user = await userServices.leaveManagerRole(req.query.team as string, (req.user as IUser)._id)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.use(errorMiddleware)
