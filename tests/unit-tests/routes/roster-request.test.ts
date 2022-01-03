import request from 'supertest'
import app from '../../../src/app'
import { setUpDatabase, tearDownDatabase, saveUsers, resetDatabase } from '../../fixtures/setup-db'
import { getTeam, anonId, getRosterRequest } from '../../fixtures/utils'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequest from '../../../src/models/roster-request'
import { Initiator, IRosterRequestDocument, Status } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'

beforeAll(async () => {
    await setUpDatabase()
})

beforeEach(async () => {
    await saveUsers()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('test request from team route', () => {
    it('with valid data', async () => {
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const response = await request(app)
            .post(`/request/team/${team._id}?user=${user._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const rosterRequest = response.body.request as IRosterRequestDocument
        expect(rosterRequest.user.toString()).toBe(user._id.toString())
        expect(rosterRequest.team.toString()).toBe(team._id.toString())
        expect(rosterRequest.requestSource).toBe(Initiator.Team)
        expect(rosterRequest.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(rosterRequest._id)
        expect(requestRecord?.user.toString()).toBe(user._id.toString())
        expect(requestRecord?.team.toString()).toBe(team._id.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Team)
        expect(requestRecord?.status).toBe(Status.Pending)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(1)
        expect(userRecord?.requests[0].toString()).toBe(requestRecord?._id.toString())

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(requestRecord?._id.toString())
    })

    it('with bad token', async () => {
        const [manager, user] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        await request(app)
            .post(`/request/team/${team._id}?user=${user._id}`)
            .set('Authorization', 'Bearer averybad.34sadf23.token')
            .send()
            .expect(401)
    })

    it('with non-existent team', async () => {
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        const response = await request(app)
            .post(`/request/team/${anonId}?user=${user._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })

    it('with non-existent user', async () => {
        const [manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

        const response = await request(app)
            .post(`/request/team/${team._id}?user=${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
    })
})

describe('test request from user route', () => {
    it('with valid data', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())

        const response = await request(app)
            .post(`/request/user?team=${team._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const rosterRequest = response.body.request as IRosterRequestDocument
        expect(rosterRequest.user.toString()).toBe(user._id.toString())
        expect(rosterRequest.team.toString()).toBe(team._id.toString())
        expect(rosterRequest.requestSource).toBe(Initiator.Player)
        expect(rosterRequest.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(rosterRequest._id)
        expect(requestRecord?.user.toString()).toBe(user._id.toString())
        expect(requestRecord?.team.toString()).toBe(team._id.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Player)
        expect(requestRecord?.status).toBe(Status.Pending)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(1)
        expect(userRecord?.requests[0].toString()).toBe(rosterRequest._id.toString())

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(rosterRequest._id.toString())
    })

    it('with invalid token', async () => {
        const [user] = await User.find({})
        await user.generateAuthToken()
        const team = await Team.create(getTeam())

        await request(app)
            .post(`/request/user?team=${team._id}`)
            .set('Authorization', 'Bearer averybad.asdf43rasd.token')
            .send()
            .expect(401)
    })

    it('with non-existent team', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        await Team.create(getTeam())

        const response = await request(app)
            .post(`/request/user?team=${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test team accept route', () => {
    it('with valid data', async () => {
        const [user, manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const response = await request(app)
            .post(`/request/team/accept/${requestData._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const responseRequest = response.body.request as IRosterRequestDocument
        expect(responseRequest.user.toString()).toBe(user._id.toString())
        expect(responseRequest.team.toString()).toBe(team._id.toString())
        expect(responseRequest.requestSource).toBe(Initiator.Player)
        expect(responseRequest.status).toBe(Status.Approved)

        const requestRecord = await RosterRequest.findById(requestData?._id)
        expect(requestRecord?.user.toString()).toBe(user._id.toString())
        expect(requestRecord?.team.toString()).toBe(team._id.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Player)
        expect(requestRecord?.status).toBe(Status.Approved)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(1)
        expect(userRecord?.playerTeams[0].toString()).toBe(team._id.toString())
        expect(userRecord?.requests.length).toBe(1)
        expect(userRecord?.requests[0].toString()).toBe(requestRecord?._id.toString())

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(1)
        expect(teamRecord?.players[0].toString()).toBe(user._id.toString())
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('with invalid token', async () => {
        const [user, manager] = await User.find({})
        await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        await request(app)
            .post(`/request/team/accept/${requestData._id}`)
            .set('Authorization', 'Bearer asdfasdf123.sdfgad43243.1324123arfad')
            .send()
            .expect(401)
    })

    it('with non-existent request', async () => {
        const [user, manager] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/team/accept/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_REQUEST)
    })
})

describe('test team deny route', () => {
    it('with valid data', async () => {
        const [user, manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const response = await request(app)
            .post(`/request/team/deny/${requestData._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const responseRequest = response.body.request as IRosterRequestDocument
        expect(responseRequest.user.toString()).toBe(user._id.toString())
        expect(responseRequest.team.toString()).toBe(team._id.toString())
        expect(responseRequest.requestSource).toBe(Initiator.Player)
        expect(responseRequest.status).toBe(Status.Denied)

        const requestRecord = await RosterRequest.findById(requestData._id)
        expect(requestRecord?.user.toString()).toBe(user._id.toString())
        expect(requestRecord?.team.toString()).toBe(team._id.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Player)
        expect(requestRecord?.status).toBe(Status.Denied)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
        expect(userRecord?.requests.length).toBe(1)
        expect(userRecord?.requests[0].toString()).toBe(requestData._id.toString())

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('with invalid token', async () => {
        const [user, manager] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        await request(app)
            .post(`/request/team/deny/${requestData._id}`)
            .set('Authorization', 'Bearer asdfa1234.adsf34asdf.asdfaf431')
            .send()
            .expect(401)
    })

    it('with non-existent request', async () => {
        const [user, manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/team/deny/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_REQUEST)
    })
})

describe('test user accept route', () => {
    it('with valid data', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/user/accept/${requestData._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const responseRequest = response.body.request as IRosterRequestDocument
        expect(responseRequest._id.toString()).toBe(requestData._id.toString())
        expect(responseRequest.user.toString()).toBe(requestData.user.toString())
        expect(responseRequest.team.toString()).toBe(requestData.team.toString())
        expect(responseRequest.requestSource).toBe(Initiator.Team)
        expect(responseRequest.status).toBe(Status.Approved)

        const requestRecord = await RosterRequest.findById(requestData._id)
        expect(requestRecord?.user.toString()).toBe(requestData.user.toString())
        expect(requestRecord?.team.toString()).toBe(requestData.team.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Team)
        expect(requestRecord?.status).toBe(Status.Approved)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(1)
        expect(userRecord?.playerTeams[0].toString()).toBe(team._id.toString())
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(1)
        expect(teamRecord?.players[0].toString()).toBe(user._id.toString())
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(requestData._id.toString())
    })

    it('with invalid token', async () => {
        const [user] = await User.find({})
        await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        await request(app)
            .post(`/request/user/accept/${requestData._id}`)
            .set('Authorization', 'Bearer asdfa1234.asdfar342a.asdf3214')
            .send()
            .expect(401)
    })

    it('with non-existent request', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/user/accept/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_REQUEST)
    })
})

describe('test user deny route', () => {
    it('with valid data', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/user/deny/${requestData._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const responseRequest = response.body.request as IRosterRequestDocument
        expect(responseRequest._id.toString()).toBe(requestData._id.toString())
        expect(responseRequest.user.toString()).toBe(requestData.user.toString())
        expect(responseRequest.team.toString()).toBe(requestData.team.toString())
        expect(responseRequest.requestSource).toBe(Initiator.Team)
        expect(responseRequest.status).toBe(Status.Denied)

        const requestRecord = await RosterRequest.findById(requestData._id)
        expect(requestRecord?.user.toString()).toBe(requestData.user.toString())
        expect(requestRecord?.team.toString()).toBe(requestData.team.toString())
        expect(requestRecord?.requestSource).toBe(Initiator.Team)
        expect(requestRecord?.status).toBe(Status.Denied)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)
        expect(teamRecord?.requests.length).toBe(1)
        expect(teamRecord?.requests[0].toString()).toBe(requestData._id.toString())
    })

    it('with invalid token', async () => {
        const [user] = await User.find({})
        await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        await request(app)
            .post(`/request/user/deny/${requestData._id}`)
            .set('Authorization', 'Bearer asdfa1234.asdfar342a.asdf3214')
            .send()
            .expect(401)
    })

    it('with non-existent request', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Team))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/user/deny/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_REQUEST)
    })
})

describe('test team delete request', () => {
    it('with valid data', async () => {
        const [user, manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const response = await request(app)
            .post(`/request/team/delete/${requestData._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const requestResponse = response.body.request
        expect(requestResponse._id.toString()).toBe(requestData._id.toString())
        expect(requestResponse.user.toString()).toBe(requestData.user.toString())
        expect(requestResponse.team.toString()).toBe(requestData.team.toString())
        expect(requestResponse.requestSource).toBe(Initiator.Player)
        expect(requestResponse.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(requestData._id)
        expect(requestRecord).toBeNull()

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('with invalid token', async () => {
        const [user, manager] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        await request(app)
            .post(`/request/team/delete/${requestData._id}`)
            .set('Authorization', 'Bearer asdfa324.asdft421df.a3294fa')
            .send()
            .expect(401)
    })

    it('with non-existent request', async () => {
        const [user, manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.managers.push(manager._id)
        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()
        manager.managerTeams.push(team._id)
        await manager.save()

        const response = await request(app)
            .post(`/request/team/delete/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_REQUEST)
    })
})

describe('test user delete route', () => {
    it('with valid data', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/user/delete/${requestData._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const requestResponse = response.body.request
        expect(requestResponse._id.toString()).toBe(requestData._id.toString())
        expect(requestResponse.user.toString()).toBe(requestData.user.toString())
        expect(requestResponse.team.toString()).toBe(requestData.team.toString())
        expect(requestResponse.requestSource).toBe(Initiator.Player)
        expect(requestResponse.status).toBe(Status.Pending)

        const requestRecord = await RosterRequest.findById(requestData._id)
        expect(requestRecord).toBeNull()

        const userRecord = await User.findById(user._id)
        expect(userRecord?.requests.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.requests.length).toBe(0)
    })

    it('with invalid token', async () => {
        const [user] = await User.find({})
        await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        await request(app)
            .post(`/request/user/delete/${requestData._id}`)
            .set('Authorization', 'Bearer asdf1234.asdfasdg.324513dsfae')
            .send()
            .expect(401)
    })

    it('with non-existent request', async () => {
        const [user] = await User.find({})
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())
        const requestData = await RosterRequest.create(getRosterRequest(team._id, user._id, Initiator.Player))

        team.requests.push(requestData._id)
        await team.save()
        user.requests.push(requestData._id)
        await user.save()

        const response = await request(app)
            .post(`/request/user/delete/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_REQUEST)
    })
})
