import { Request, Response, Router } from 'express'
import { IUser } from '../types/user'
import UserServices from '../services/user'
import User from '../models/user'
import { errorMiddleware } from '../middleware/errors'
import passport from 'passport'

export const userRouter = Router()

userRouter.post('/user', async (req: Request, res: Response, next) => {
    try {
        const user: IUser = req.body
        const userService = new UserServices(User)

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
            const userService = new UserServices(User)
            const token = await userService.login(user.email)
            return res.json({ token })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.use(errorMiddleware)

export default userRouter
