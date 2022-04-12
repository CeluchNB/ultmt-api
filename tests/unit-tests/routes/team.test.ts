/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import User from '../../../src/models/user'
import { ITeam, CreateUser } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../fixtures/setup-db'
import { getTeam, getUser, anonId } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'
import Team from '../../../src/models/team'
import ArchiveTeam from '../../../src/models/archive-team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('test /POST team', () => {
    it('with valid team and user', async () => {
        const user: CreateUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        const response = await request(app)
            .post('/api/v1/team')
            .set('Authorization', `Bearer ${token}`)
            .send({ team })
            .expect(201)

        const teamResponse = response.body.team as ITeam
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
        expect(new Date(teamResponse.seasonStart)).toEqual(getTeam().seasonStart)
        expect(new Date(teamResponse.seasonEnd)).toEqual(getTeam().seasonEnd)

        const userResponse = await User.findById(userRecord._id)
        expect(userResponse?.managerTeams?.length).toBe(1)
        expect(userResponse?.managerTeams?.[0]._id.toString()).toBe(teamResponse._id.toString())
    })

    it('with invalid team', async () => {
        const user: CreateUser = getUser()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        const response = await request(app)
            .post('/api/v1/team')
            .set('Authorization', `Bearer ${token}`)
            .send({ team: {} })
            .expect(400)

        expect(response.body.message).toBe(Constants.MISSING_FIELDS)
    })

    it('with invalid user', async () => {
        const user: CreateUser = getUser()

        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()

        await request(app)
            .post('/api/v1/team')
            .set('Authorization', `Bearer ${anonId}`)
            .send({ team: {} })
            .expect(401)
    })
})

describe('test /GET public team', () => {
    it('with valid id', async () => {
        const team: ITeam = getTeam()

        const teamRecord = await Team.create(team)

        const response = await request(app)
            .get(`/api/v1/team/${teamRecord._id}`)
            .send()
            .expect(200)

        const teamResponse = response.body.team as ITeam

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(0)
    })

    it('with invalid id', async () => {
        const team: ITeam = getTeam()

        await Team.create(team)

        const response = await request(app)
            .get(`/api/v1/team/${anonId}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test /GET managed id', () => {
    it('with valid data', async () => {
        const user: CreateUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()
        team.managers.push(getEmbeddedUser(userRecord))

        const teamRecord = await Team.create(team)
        userRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await userRecord.save()

        const response = await request(app)
            .get(`/api/v1/team/managing/${teamRecord._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const teamResponse = response.body.team as ITeam
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
    })

    it('with invalid user', async () => {
        const user: CreateUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        team.managers.push(getEmbeddedUser(userRecord))

        const teamRecord = await Team.create(team)
        userRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await userRecord.save()

        await request(app)
            .get(`/api/v1/team/managing/${teamRecord._id}`)
            .set('Authorization', 'Bearer badadf.asdf.token1')
            .send()
            .expect(401)
    })

    it('with invalid team', async () => {
        const user: CreateUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()
        team.managers.push(getEmbeddedUser(userRecord))

        const teamRecord = await Team.create(team)
        userRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await userRecord.save()

        await request(app)
            .get(`/api/v1/team/managing/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)
    })
})

describe('test /POST remove player', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const response = await request(app)
            .post(`/api/v1/team/remove/player/${team._id}?user=${user._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const teamResponse = response.body.team
        expect(teamResponse._id.toString()).toBe(team._id.toString())
        expect(teamResponse.players.length).toBe(0)
        
        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
    })

    it('with invalid manager token', async () => {
        const [manager, user] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        await request(app)
            .post(`/api/v1/team/remove/player/${team._id}?user=${user._id}`)
            .set('Authorization', 'Bearer asfd1234.asdf341.asdf5341')
            .send()
            .expect(401)
    })

    it('with non-existent team', async () => {
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(user))
        await team.save()
        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const response = await request(app)
            .post(`/api/v1/team/remove/player/${anonId}?user=${user._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test /POST rollover', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const response = await request(app)
            .post(`/api/v1/team/rollover/${team._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                copyPlayers: true,
                seasonStart: new Date(),
                seasonEnd: new Date()
            })
            .expect(200)
        
        const responseTeam = response.body.team as ITeam
        expect(responseTeam._id.toString()).not.toBe(team._id.toString())
        expect(responseTeam.managers.length).toBe(1)
        expect(responseTeam.seasonNumber).toBe(2)

        const teamRecord = await Team.findOne({})
        expect(teamRecord?._id.toString()).not.toBe(team._id.toString())
        expect(teamRecord?.managers.length).toBe(1)
        expect(teamRecord?.seasonNumber).toBe(2)

        const archiveTeamRecord = await ArchiveTeam.findById(team._id)
        expect(archiveTeamRecord?.place).toBe(teamRecord?.place)
        expect(archiveTeamRecord?.name).toBe(teamRecord?.name)
        expect(archiveTeamRecord?.seasonNumber).toBe(1)

        const managerRecord = await User.findById(manager._id)
        expect(managerRecord?.managerTeams.length).toBe(1)
        expect(managerRecord?.managerTeams[0]._id.toString()).toBe(teamRecord?._id.toString())
    })

    it('with invalid token', async () => {
        const [manager] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        await request(app)
            .post(`/api/v1/team/rollover/${team._id}`)
            .set('Authorization', 'Bearer adsf5431.asdf415g.gbhso54')
            .send({
                copyPlayers: true,
                seasonStart: new Date(),
                seasonEnd: new Date()
            })
            .expect(401)
    })

    it('with non-existent team', async () => {
        const [manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const response = await request(app)
            .post(`/api/v1/team/rollover/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                copyPlayers: true,
                seasonStart: new Date(),
                seasonEnd: new Date()
            })
            .expect(404)
        
        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test /PUT set open', () => {
    it('with valid open data', async () => {
        const manager = await User.create(getUser())
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        const response = await request(app)
            .put(`/api/v1/team/open/${team._id}?open=true`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const teamResponse = response.body.team as ITeam
        expect(teamResponse._id.toString()).toBe(team._id.toString())
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.rosterOpen).toBe(true)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.rosterOpen).toBe(true)
    })

    it('with valid close data', async () => {
        const manager = await User.create(getUser())
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        const response = await request(app)
            .put(`/api/v1/team/open/${team._id}?open=false`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const teamResponse = response.body.team as ITeam
        expect(teamResponse._id.toString()).toBe(team._id.toString())
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.rosterOpen).toBe(false)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.place).toBe(team.place)
        expect(teamRecord?.rosterOpen).toBe(false)
    })

    it('with invalid token', async () => {
        const manager = await User.create(getUser())
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        await request(app)
            .put(`/api/v1/team/open/${team._id}?open=false`)
            .set('Authorization', 'Bearer asdf654.asdf4536.vfs934')
            .send()
            .expect(401)
    })

    it('with non-existent team', async () => {
        const manager = await User.create(getUser())
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        const response = await request(app)
            .put(`/api/v1/team/open/${anonId}?open=false`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test /GET search', () => {
    beforeEach(async () => {
        const team1 = getTeam()
        team1.place = 'Pittsburgh'
        team1.name = 'Temper'
        team1.teamname = 'pghtemper'
        team1.rosterOpen = true
        await Team.create(team1)

        const team2 = getTeam()
        team2.place = 'Towson'
        team2.name = 'Bomb Squad'
        team2.teamname = 'towsonbombsquad'
        team2.rosterOpen = true
        await Team.create(team2)
    })

    it('with valid query', async () => {
        const term = 'Pit'
        const response = await request(app)
            .get(`/api/v1/team/search?q=${term}`)
            .send()
            .expect(200)

        const json = response.body
        expect(json.length).toBe(1)
        expect(json[0].name).toBe('Temper')
    })

    it('with invalid query', async () => {
        await request(app)
            .get('/api/v1/team/search')
            .send()
            .expect(400)
    })
})

describe('test /POST add manager', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid query', async () =>{
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.openToRequests = true
        await user.save()

        const response = await request(app)
            .post(`/api/v1/team/${team._id}/addManager?manager=${user._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const resultTeam = response.body.team as ITeam
        expect(resultTeam._id.toString()).toBe(team._id.toString())
        expect(resultTeam.managers.length).toBe(2)

        const newManager = await User.findById(user._id)
        expect(newManager?.managerTeams.length).toBe(1)
    })

    it('with unauthorized requesting user', async () => {
        const [manager, user] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.openToRequests = true
        await user.save()

        await request(app)
            .post(`/api/v1/team/${team._id}/addManager?manager=${user._id}`)
            .set('Authorization', 'Bearer 1234.asdgf.4313f')
            .send()
            .expect(401)
    })

    it('adding already managing user', async () => {
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(user))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        user.openToRequests = true
        await user.save()

        const response = await request(app)
            .post(`/api/v1/team/${team._id}/addManager?manager=${user._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(400)
        
        expect(response.body.message).toEqual(Constants.USER_ALREADY_MANAGES_TEAM)
    })
})

describe('test /PUT leave manager', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager, manager2] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        const response = await request(app)
            .put(`/api/v1/team/${team._id}/managerLeave`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const resultTeam = response.body.team
        expect(resultTeam._id.toString()).toBe(team._id.toString())
        expect(resultTeam.managers.length).toBe(1)

        const resultManager = await User.findById(manager._id)
        expect(resultManager?.managerTeams.length).toBe(0)
    })

    it('with unauthenticated manager', async () => {
        const [manager, manager2] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        await request(app)
            .put(`/api/v1/team/${team._id}/managerLeave`)
            .set('Authorization', 'Bearer adf432.fdt543fggd.5432rffgt')
            .send()
            .expect(401)
    })

    it('with last manager error', async () => {
        const [manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const response = await request(app)
            .put(`/api/v1/team/${team._id}/managerLeave`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(400)

        expect(response.body.message).toBe(Constants.USER_IS_ONLY_MANAGER)

    })
})