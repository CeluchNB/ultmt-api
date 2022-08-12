import { Request, Response, Router } from 'express'
import passport from 'passport'
import TeamServices from '../../services/v1/team'
import Team from '../../models/team'
import User from '../../models/user'
import RosterRequest from '../../models/roster-request'
import ArchiveTeam from '../../models/archive-team'
import OneTimePasscode from '../../models/one-time-passcode'
import { errorMiddleware } from '../../middleware/errors'
import { CreateTeam, IUser } from '../../types'
import { query, body, param } from 'express-validator'

export const teamRouter = Router()

teamRouter.get('/team/search', query('q').escape().isString(), async (req: Request, res: Response, next) => {
    try {
        const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
        const term = (req.query.q as string) || ''
        const teams = await teamServices.search(term)
        return res.send(teams)
    } catch (error) {
        next(error)
    }
})

teamRouter.post(
    '/team',
    body('place').escape().isString(),
    body('name').escape().isString(),
    body('teamname').escape().isString(),
    body('seasonStart').escape().isString(),
    body('seasonEnd').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = req.body.team as CreateTeam
            const teamResponse = await teamServices.createTeam(team, (req.user as IUser)._id.toString())

            return res.status(201).json({ team: teamResponse })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.get('/team/:id', param('id').escape().isString(), async (req: Request, res: Response, next) => {
    try {
        const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
        const team = await teamServices.getTeam(req.params.id, true)
        return res.json({ team })
    } catch (error) {
        next(error)
    }
})

teamRouter.get(
    '/team/managing/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.getManagedTeam(req.params.id, (req.user as IUser)._id.toString())
            return res.json({ team })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.post(
    '/team/remove/player/:id',
    param('id').escape().isString(),
    query('user').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.removePlayer(
                (req.user as IUser)._id.toString(),
                req.params.id,
                req.query.user as string,
            )
            return res.json({ team })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.post(
    '/team/rollover/:id',
    param('id').escape().isString(),
    body('copyPlayers').escape().isBoolean(),
    body('seasonStart').escape().isString(),
    body('seasonEnd').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.rollover(
                (req.user as IUser)._id.toString(),
                req.params.id,
                req.body.copyPlayers,
                new Date(req.body.seasonStart),
                new Date(req.body.seasonEnd),
            )
            return res.json({ team })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.put(
    '/team/open/:id',
    param('id').escape().isString(),
    query('open').escape().isBoolean(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.setRosterOpen(
                (req.user as IUser)._id.toString(),
                req.params.id,
                req.query.open === 'true',
            )
            return res.json({ team })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.post(
    '/team/:id/addManager',
    param('id').escape().isString(),
    query('manager').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.addManager(
                (req.user as IUser)._id.toString(),
                req.query.manager as string,
                req.params.id,
            )
            return res.json({ team })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.post(
    '/team/getBulkCode',
    query('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam, OneTimePasscode)
            const code = await teamServices.createBulkJoinCode(
                (req.user as IUser)._id.toString(),
                req.query.id as string,
            )
            return res.json({ code })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.get('/archiveTeam/:id', param('id').escape().isString(), async (req: Request, res: Response, next) => {
    try {
        const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
        const team = await teamServices.getArchivedTeam(req.params.id)
        return res.json({ team })
    } catch (error) {
        next(error)
    }
})

teamRouter.use(errorMiddleware)
