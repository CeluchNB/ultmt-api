/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../../src/app'
import User from '../../../../src/models/user'
import { ITeam, CreateUser } from '../../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../../fixtures/setup-db'
import { getTeam, getUser, anonId } from '../../../fixtures/utils'
import * as Constants from '../../../../src/utils/constants'
import Team from '../../../../src/models/team'
import ArchiveTeam from '../../../../src/models/archive-team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../../src/utils/utils'
import MockDate from 'mockdate'
import TeamDesignation from '../../../../src/models/team-designation'
import { Types } from 'mongoose'

beforeAll(async () => {
    MockDate.set(new Date('2022'))
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    MockDate.reset()
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

        await request(app).post('/api/v1/team').set('Authorization', `Bearer ${anonId}`).send({ team: {} }).expect(401)
    })
})

describe('test /GET public team', () => {
    it('with valid id', async () => {
        const team: ITeam = getTeam()

        const teamRecord = await Team.create(team)

        const response = await request(app).get(`/api/v1/team/${teamRecord._id}`).send().expect(200)

        const teamResponse = response.body.team as ITeam

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requests.length).toBe(0)
    })

    it('with invalid id', async () => {
        const team: ITeam = getTeam()

        await Team.create(team)

        const response = await request(app).get(`/api/v1/team/${anonId}`).send().expect(404)

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
                seasonEnd: new Date(),
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
        expect(managerRecord?.archiveTeams.length).toBe(1)
        expect(managerRecord?.archiveTeams[0]._id.toString()).toBe(team._id.toString())
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
                seasonEnd: new Date(),
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
                seasonEnd: new Date(),
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
        const response = await request(app).get(`/api/v1/team/search?q=${term}`).send().expect(200)

        const { teams } = response.body
        expect(teams.length).toBe(1)
        expect(teams[0].name).toBe('Temper')
    })

    it('with false roster open param', async () => {
        const [team1] = await Team.find({})
        team1.rosterOpen = false
        await team1.save()

        const term = 'Pit'
        const response = await request(app).get(`/api/v1/team/search?q=${term}&rosterOpen=false`).send().expect(200)

        const { teams } = response.body
        expect(teams.length).toBe(1)
        expect(teams[0].name).toBe('Temper')
    })

    it('with true roster open param', async () => {
        const [team1] = await Team.find({})
        team1.rosterOpen = false
        await team1.save()

        const term = 'Pit'
        const response = await request(app).get(`/api/v1/team/search?q=${term}&rosterOpen=true`).send().expect(200)

        const { teams } = response.body
        expect(teams.length).toBe(0)
    })

    it('with invalid query', async () => {
        await request(app).get('/api/v1/team/search').send().expect(400)
    })
})

describe('test /POST add manager', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid query', async () => {
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

describe('test /GET archived team route', () => {
    it('with valid team', async () => {
        const team = getTeam()
        await ArchiveTeam.create(team)

        const response = await request(app).get(`/api/v1/archiveTeam/${team._id}`).send().expect(200)

        const { team: teamResponse } = response.body
        expect(teamResponse._id.toString()).toBe(team._id.toString())
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.teamname).toBe(team.teamname)
    })

    it('with invalid team', async () => {
        const team = getTeam()
        await ArchiveTeam.create(team)

        const response = await request(app).get(`/api/v1/archiveTeam/${anonId}`).send().expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test /POST create bulk join code', () => {
    it('with valid data', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        const token = await managerRecord.generateAuthToken()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        const response = await request(app)
            .post(`/api/v1/team/getBulkCode?id=${teamRecord._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const { code } = response.body
        expect(code.length).toBe(6)
        expect(Number(code)).not.toBeNaN()
    })

    it('with non existent team', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        const token = await managerRecord.generateAuthToken()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        const response = await request(app)
            .post(`/api/v1/team/getBulkCode?id=${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })

    it('with unauthorized user', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        await managerRecord.generateAuthToken()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        await request(app)
            .post(`/api/v1/team/getBulkCode?id=${teamRecord._id}`)
            .set('Authorization', 'Bearer 1234.adsf4t4sase.qer45sf')
            .send()
            .expect(401)
    })
})

describe('test PUT /team/:id/designation', () => {
    it('with successful call', async () => {
        const team = getTeam()
        const manager = getUser()
        const teamRecord = await Team.create(team)
        const managerRecord = await User.create(manager)
        teamRecord.managers.push(getEmbeddedUser(managerRecord))
        await teamRecord.save()
        const token = await managerRecord.generateAuthToken()
        managerRecord.managerTeams.push(getEmbeddedTeam(teamRecord))
        await managerRecord.save()

        const designation = await TeamDesignation.create({
            description: 'Test Description',
            abbreviation: 'RD',
        })

        const response = await request(app)
            .put(`/api/v1/team/${team._id.toHexString()}/designation`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                designation: designation._id.toHexString(),
            })
            .expect(200)

        const { team: teamResponse } = response.body

        expect(teamResponse.designation).toBe(designation._id.toHexString())
    })

    it('with unsuccessful call', async () => {
        const manager = getUser()
        const managerRecord = await User.create(manager)
        const token = await managerRecord.generateAuthToken()

        const response = await request(app)
            .put(`/api/v1/team/${new Types.ObjectId().toHexString()}/designation`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                designation: '12341234',
            })
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test DELETE /team', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('handles successful deletion', async () => {
        const team = await Team.create(getTeam())
        const [manager, playerOne, playerTwo] = await User.find({})

        team.players = [getEmbeddedUser(playerOne), getEmbeddedUser(playerTwo)]
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.playerTeams.push(getEmbeddedTeam(team))
        await playerTwo.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        const token = await manager.generateAuthToken()
        await manager.save()

        await request(app)
            .delete(`/api/v1/team/${team._id.toHexString()}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const allTeams = await Team.find()
        expect(allTeams.length).toBe(0)
    })

    it('handles error case', async () => {
        const team = await Team.create(getTeam())
        const [manager] = await User.find({})

        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        const token = await manager.generateAuthToken()
        await manager.save()

        await request(app).delete(`/api/v1/team/${anonId}`).set('Authorization', `Bearer ${token}`).send().expect(404)
    })
})

describe('test PUT /team/:id/archive', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('handles success case', async () => {
        const team = await Team.create(getTeam())
        const [manager, playerOne, playerTwo] = await User.find({})

        team.players = [getEmbeddedUser(playerOne), getEmbeddedUser(playerTwo)]
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.playerTeams.push(getEmbeddedTeam(team))
        await playerTwo.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        const token = await manager.generateAuthToken()
        await manager.save()

        const result = await request(app)
            .put(`/api/v1/team/${team._id.toHexString()}/archive`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const archiveTeamRecord = await ArchiveTeam.findOne({})

        expect(archiveTeamRecord?._id.toHexString()).toBe(result.body.team._id)
        expect(archiveTeamRecord?.teamname).toBe(result.body.team.teamname)

        const [managerRecord, playerRecord] = await User.find()

        expect(managerRecord.managerTeams.length).toBe(0)
        expect(managerRecord.archiveTeams.length).toBe(1)

        expect(playerRecord.playerTeams.length).toBe(0)
        expect(playerRecord.archiveTeams.length).toBe(1)

        const teamRecords = await Team.find()
        expect(teamRecords.length).toBe(0)
    })

    it('handles error case', async () => {
        const team = await Team.create(getTeam())
        const [manager, playerOne, playerTwo] = await User.find({})

        team.players = [getEmbeddedUser(playerOne), getEmbeddedUser(playerTwo)]
        team.managers.push(getEmbeddedUser(manager))
        await team.save()

        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.playerTeams.push(getEmbeddedTeam(team))
        await playerTwo.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        const token = await manager.generateAuthToken()
        await manager.save()

        const result = await request(app)
            .put(`/api/v1/team/${anonId}/archive`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(result.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)

        const archiveTeamRecords = await ArchiveTeam.find()
        expect(archiveTeamRecords.length).toBe(0)

        const teamRecords = await Team.find()
        expect(teamRecords.length).toBe(1)
    })
})

describe('test GET /team/teamname-taken', () => {
    it('with taken teamname', async () => {
        const team = await Team.create(getTeam())
        const response = await request(app)
            .get(`/api/v1/team/teamname-taken?teamname=${team.teamname}`)
            .send()
            .expect(200)

        expect(response.body.taken).toBe(true)
    })

    it('with free teamname', async () => {
        const team = await Team.create(getTeam())
        const response = await request(app)
            .get(`/api/v1/team/teamname-taken?teamname=${team.teamname}75828`)
            .send()
            .expect(200)

        expect(response.body.taken).toBe(false)
    })

    it('with invalid teamname', async () => {
        const response = await request(app).get(`/api/v1/team/teamname-taken`).send().expect(400)

        expect(response.body.message).toBe(Constants.DUPLICATE_TEAM_NAME)
    })
})

describe('test POST /team/:id/guest', () => {
    it('with successful result', async () => {
        const team = await Team.create(getTeam())
        const manager = await User.create(getUser())
        await team.updateOne({ $push: { managers: [getEmbeddedUser(manager)] } })
        await manager.updateOne({ $push: { managerTeams: [getEmbeddedTeam(team)] } })
        const token = await manager.generateAuthToken()

        const response = await request(app)
            .post(`/api/v1/team/${team._id.toHexString()}/guest`)
            .set({ Authorization: `Bearer ${token}` })
            .send({ guest: { firstName: 'guest', lastName: 'guest'} })
            .expect(201)

        expect(response.body.team._id).toBe(team._id.toHexString())
        expect(response.body.team.players.length).toBe(1)
    })

    it('with failure', async () => {
        const team = await Team.create(getTeam())
        const manager = await User.create(getUser())
        const token = await manager.generateAuthToken()

        const response = await request(app)
            .post(`/api/v1/team/${team._id.toHexString()}/guest`)
            .set({ Authorization: `Bearer ${token}` })
            .send({ guest: { firstName: 'guest', lastName: 'guest' } })
            .expect(401)

        expect(response.body.message).toBe(Constants.UNAUTHORIZED_MANAGER)
    })
})

describe('test GET /team/all/:continuationId', () => {
    it('returns found teams', async () => {
        const continuationId = new Types.ObjectId()
        const team = await Team.create({ ...getTeam(), continuationId })
        const archiveTeam = await ArchiveTeam.create({ ...getTeam(), continuationId })

        const response = await request(app).get(`/api/v1/team/all/${continuationId.toHexString()}`).send().expect(200)

        const { teams } = response.body
        expect(teams[0]._id.toString()).toBe(team._id.toHexString())
        expect(teams[1]._id.toString()).toBe(archiveTeam._id.toHexString())
    })

    it('handles error', async () =>{
        const response = await request(app).get('/api/v1/team/all/badid').send().expect(500)
        expect(response.body.message).toBe(Constants.GENERIC_ERROR)
    })
})