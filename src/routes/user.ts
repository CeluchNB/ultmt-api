import { Request, Response, Router } from 'express'
import { IUser } from '../types/user'
import UserServices from '../services/user'
import User from '../models/user'

export const userRouter = Router()

userRouter.post('/user', async (req: Request, res: Response) => {
    const user: IUser = req.body
    const userService = new UserServices(User)

    const userObject = await userService.signUp(user)

    return res.send(userObject)
})
