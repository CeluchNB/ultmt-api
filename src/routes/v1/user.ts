import { Request, Response, Router } from 'express'
import { ApiError, CreateUser } from '../../types'
import UserServices from '../../services/v1/user'
import User from '../../models/user'
import Team from '../../models/team'
import passport from 'passport'
import { body, query, param } from 'express-validator'
import OneTimePasscode from '../../models/one-time-passcode'
import { parseBoolean } from '../../utils/utils'

export const userRouter = Router()

userRouter.get(
    '/user/search',
    query('q').escape(),
    query('open').escape(),
    async (req: Request, res: Response, next) => {
        try {
            const term = (req.query.q as string) || ''
            const open = parseBoolean(req.query.open as string)
            const userService = new UserServices(User, Team)
            const users = await userService.searchUsers(term, open)
            return res.json({ users })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.get('/user/username-taken', async (req: Request, res: Response, next) => {
    try {
        const userService = new UserServices(User, Team, OneTimePasscode)
        const taken = await userService.usernameTaken(req.query.username as string)
        return res.json({ taken })
    } catch (error) {
        next(error)
    }
})

userRouter.post(
    '/user',
    body('firstName').isString(),
    body('lastName').isString(),
    body('username').isString(),
    body('password').isString(),
    async (req: Request, res: Response, next) => {
        try {
            const userData: CreateUser = req.body
            const userService = new UserServices(User, Team)

            const { user, tokens } = await userService.signUp(userData)
            return res.status(201).json({ user, tokens })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.get(
    '/user/me',
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team)
            const { user, fullManagerTeams } = await userService.getMe(req.user?.id as string)
            return res.json({ user, fullManagerTeams })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.get('/user/:id', param('id').escape().isString(), async (req: Request, res: Response, next) => {
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
            const userService = new UserServices(User, Team)
            await userService.deleteUser(req.user?.id as string)
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
            const userService = new UserServices(User, Team)
            const user = await userService.setOpenToRequests(req.user?.id as string, req.query.open === 'true')
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.post(
    '/user/leave/team',
    query('team').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team)
            const user = await userService.leaveTeam(req.user?.id as string, req.query.team as string)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.put(
    '/user/managerLeave',
    query('team').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team)
            const user = await userService.leaveManagerRole(req.query.team as string, req.user?.id as string)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.put(
    '/user/changePassword',
    body('newPassword').escape().isString(),
    passport.authenticate('local', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team)
            const { user, tokens } = await userService.changePassword(req.user?.id as string, req.body.newPassword)
            return res.json({ user, tokens })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.put(
    '/user/changeEmail',
    body('newEmail').escape().isString(),
    passport.authenticate('local', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team)
            const user = await userService.changeEmail(req.user?.id as string, req.body.newEmail)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.put(
    '/user/changeName',
    body('newFirstName').escape(),
    body('newLastName').escape(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team)
            const user = await userService.changeName(
                req.user?.id as string,
                req.body.newFirstName,
                req.body.newLastName,
            )
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.post(
    '/user/requestPasswordRecovery',
    body('email').escape().isString(),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team, OneTimePasscode)
            await userService.requestPasswordRecovery(req.body.email)
            return res.json({})
        } catch (error) {
            if ((error as ApiError).code === 500) {
                next(error)
            } else {
                return res.json({})
            }
        }
    },
)

userRouter.post(
    '/user/resetPassword',
    body('passcode').escape().isString(),
    body('newPassword').isString(),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team, OneTimePasscode)
            const { user, tokens } = await userService.resetPassword(req.body.passcode, req.body.newPassword)
            return res.json({ user, tokens })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.put(
    '/user/setPrivate',
    query('private').escape().isBoolean(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team)
            const user = await userService.setPrivateAccount(req.user?.id as string, req.query.private === 'true')
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)

userRouter.post(
    '/user/joinTeamByCode',
    query('code').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const userService = new UserServices(User, Team, OneTimePasscode)
            const user = await userService.joinByCode(req.user?.id as string, req.query.code as string)
            return res.json({ user })
        } catch (error) {
            next(error)
        }
    },
)
