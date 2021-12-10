import { Request, Response, Router } from 'express'
import { IUser } from '../types/user'
import UserServices from '../services/user'
import User from '../models/user'
import { createErrorMessage } from '../utils/utils'
import * as Constants from '../utils/constants'

export const userRouter = Router()

userRouter.post('/user', async (req: Request, res: Response) => {
    try {
        const user: IUser = req.body
        const userService = new UserServices(User)

        const userObject = await userService.signUp(user)
        return res.status(201).json(userObject)
    } catch (error) {
        return res.status(400).send(createErrorMessage(Constants.UNABLE_TO_CREATE_USER))
    }
})

export default userRouter
