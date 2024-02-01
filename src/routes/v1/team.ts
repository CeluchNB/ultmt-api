import { Request, RequestHandler, Response, Router } from 'express'
import passport from 'passport'
import TeamServices from '../../services/v1/team'
import Team from '../../models/team'
import User from '../../models/user'
import RosterRequest from '../../models/roster-request'
import ArchiveTeam from '../../models/archive-team'
import OneTimePasscode from '../../models/one-time-passcode'
import { CreateTeam } from '../../types'
import { query, body, param } from 'express-validator'
import { parseBoolean } from '../../utils/utils'
import { Logger } from '../../logging'

export const teamRouter = Router()

const logger = Logger()

teamRouter.get(
    '/team/search',
    query('q').escape().isString(),
    query('rosterOpen').escape().isString(),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const term = (req.query.q as string) || ''
            const rosterOpen = parseBoolean(req.query.rosterOpen as string)
            const teams = await teamServices.search(term, rosterOpen)
            return res.json({ teams })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.get(
    '/team/teamname-taken',
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const taken = await teamServices.teamnameTaken(req.query.teamname as string)
            return res.json({ taken })
        } catch (e) {
            next(e)
        }
    },
)

teamRouter.post(
    '/team',
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = req.body.team as CreateTeam
            const teamResponse = await teamServices.createTeam(team, req.user?.id as string)

            return res.status(201).json({ team: teamResponse })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.get(
    '/team/:id',
    param('id').escape().isString(),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.getTeam(req.params.id, true)
            return res.json({ team })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.get(
    '/team/managing/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.getManagedTeam(req.params.id, req.user?.id as string)
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.removePlayer(
                req.user?.id as string,
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.rollover(
                req.user?.id as string,
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.setRosterOpen(
                req.user?.id as string,
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.addManager(
                req.user?.id as string,
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
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam, OneTimePasscode)
            const code = await teamServices.createBulkJoinCode(req.user?.id as string, req.query.id as string)
            return res.json({ code })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.get(
    '/archiveTeam/:id',
    param('id').escape().isString(),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.getArchivedTeam(req.params.id)
            return res.json({ team })
        } catch (error) {
            next(error)
        }
    },
)

teamRouter.put(
    '/team/:id/designation',
    param('id').escape().isString(),
    body('designation').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.changeDesignation(
                req.user?.id as string,
                req.params.id,
                req.body.designation,
            )
            return res.json({ team })
        } catch (e) {
            next(e)
        }
    },
)

teamRouter.delete(
    '/team/:id',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            await teamServices.deleteTeam(req.user?.id as string, req.params.id)
            return res.sendStatus(200)
        } catch (e) {
            next(e)
        }
    },
)

teamRouter.put(
    '/team/:id/archive',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const team = await teamServices.archiveTeam(req.user?.id as string, req.params.id)
            return res.json({ team })
        } catch (e) {
            next(e)
        }
    },
)

teamRouter.post(
    '/team/:id/guest',
    param('id').escape().isString(),
    passport.authenticate('jwt', { session: false }),
    logger.requestMiddleware as RequestHandler,
    async (req: Request, res: Response, next) => {
        try {
            const teamServices = new TeamServices(Team, User, RosterRequest, ArchiveTeam)
            const guest = await teamServices.addGuest(
                req.params.id,
                req.user?.id as string,
                req.body.firstName,
                req.body.lastName,
            )
            return res.status(201).json({ guest })
        } catch (e) {
            next(e)
        }
    },
)
