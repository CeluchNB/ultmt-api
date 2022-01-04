/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import User from '../../../src/models/user'
import { ITeam, IUser } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../fixtures/setup-db'
import { getTeam, getUser, anonId } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'
import Team from '../../../src/models/team'
import ArchiveTeam from '../../../src/models/archive-team'

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
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        const response = await request(app)
            .post('/team')
            .set('Authorization', `Bearer ${token}`)
            .send({ team })
            .expect(201)

        const teamResponse = response.body.team as ITeam
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
        // expect(teamResponse.managerArray.length).toBe(1)
        // expect(teamResponse.managerArray[0].firstName).toBe(user.firstName)
        // expect(teamResponse.managerArray[0].lastName).toBe(user.lastName)
        expect(new Date(teamResponse.seasonStart)).toEqual(getTeam().seasonStart)
        expect(new Date(teamResponse.seasonEnd)).toEqual(getTeam().seasonEnd)

        const userResponse = await User.findById(userRecord._id)
        expect(userResponse?.managerTeams?.length).toBe(1)
        expect(userResponse?.managerTeams?.[0].toString()).toBe(teamResponse._id.toString())
    })

    it('with invalid team', async () => {
        const user: IUser = getUser()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        const response = await request(app)
            .post('/team')
            .set('Authorization', `Bearer ${token}`)
            .send({ team: {} })
            .expect(400)

        expect(response.body.message).toBe(Constants.MISSING_FIELDS)
    })

    it('with invalid user', async () => {
        const user: IUser = getUser()

        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()

        await request(app)
            .post('/team')
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
            .get(`/team/${teamRecord._id}`)
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
            .get(`/team/${anonId}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test /GET managed id', () => {
    it('with valid data', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()
        team.managers.push(userRecord._id)

        const teamRecord = await Team.create(team)
        userRecord.managerTeams.push(teamRecord._id)
        await userRecord.save()

        const response = await request(app)
            .get(`/team/managing/${teamRecord._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const teamResponse = response.body.team as ITeam
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
    })

    it('with invalid user', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        team.managers.push(userRecord._id)

        const teamRecord = await Team.create(team)
        userRecord.managerTeams.push(teamRecord._id)
        await userRecord.save()

        await request(app)
            .get(`/team/managing/${teamRecord._id}`)
            .set('Authorization', 'Bearer badadf.asdf.token1')
            .send()
            .expect(401)
    })

    it('with invalid team', async () => {
        const user: IUser = getUser()
        const team: ITeam = getTeam()

        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()
        team.managers.push(userRecord._id)

        const teamRecord = await Team.create(team)
        userRecord.managerTeams.push(teamRecord._id)
        await userRecord.save()

        await request(app)
            .get(`/team/managing/${anonId}`)
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

        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        user.playerTeams.push(team._id)
        await user.save()

        const response = await request(app)
            .post(`/team/remove/player/${team._id}?user=${user._id}`)
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

        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        user.playerTeams.push(team._id)
        await user.save()

        await request(app)
            .post(`/team/remove/player/${team._id}?user=${user._id}`)
            .set('Authorization', 'Bearer asfd1234.asdf341.asdf5341')
            .send()
            .expect(401)
    })

    it('with non-existent team', async () => {
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())

        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        team.players.push(user._id)
        await team.save()
        user.playerTeams.push(team._id)
        await user.save()

        const response = await request(app)
            .post(`/team/remove/player/${anonId}?user=${user._id}`)
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
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const response = await request(app)
            .post(`/team/rollover/${team._id}`)
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
        expect(managerRecord?.managerTeams[0].toString()).toBe(teamRecord?._id.toString())
    })

    it('with invalid token', async () => {
        const [manager] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        await request(app)
            .post(`/team/rollover/${team._id}`)
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
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const response = await request(app)
            .post(`/team/rollover/${anonId}`)
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
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        await team.save()

        const response = await request(app)
            .put(`/team/open/${team._id}?open=true`)
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
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        await team.save()

        const response = await request(app)
            .put(`/team/open/${team._id}?open=false`)
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
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        await team.save()

        await request(app)
            .put(`/team/open/${team._id}?open=false`)
            .set('Authorization', 'Bearer asdf654.asdf4536.vfs934')
            .send()
            .expect(401)
    })

    it('with non-existent team', async () => {
        const manager = await User.create(getUser())
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        manager.managerTeams.push(team._id)
        await manager.save()
        team.managers.push(manager._id)
        await team.save()

        const response = await request(app)
            .put(`/team/open/${anonId}?open=false`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})