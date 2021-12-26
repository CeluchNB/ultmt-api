import request from 'supertest'
import app from '../../../src/app'
import { setUpDatabase, tearDownDatabase, saveUsers, resetDatabase } from '../../fixtures/setup-db'
import { getTeam, anonId } from '../../fixtures/utils'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import RosterRequest from '../../../src/models/roster-request'
import { Initiator, IRosterRequestDocument, Status } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('test request from team route', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager, user] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(manager._id)
        await team.save()

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

describe('test request from user', () => {
    beforeEach(async () => {
        await saveUsers()
    })

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
