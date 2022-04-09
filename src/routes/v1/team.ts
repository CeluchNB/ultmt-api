import { Request, Response, Router } from 'express'
import passport from 'passport'
import TeamServices from '../../services/v1/team'
import Team from '../../models/team'
import User from '../../models/user'
import RosterRequest from '../../models/roster-request'
import ArchiveTeam from '../../models/archive-team'
import { errorMiddleware } from '../../middleware/errors'
import { CreateTeam, IUser } from '../../types'

export const teamRouter = Router()

teamRouter.get('/team/search', async (req: Request, res: Response, next) => {
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

teamRouter.get('/team/:id', async (req: Request, res: Response, next) => {
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

teamRouter.use(errorMiddleware)
