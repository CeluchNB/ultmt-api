/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import User from '../../../src/models/user'
import { ITeam, ITeamDocument, IUser } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getTeam, getUser } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'
import Team from '../../../src/models/team'

const anonId = '507f191e810c19729de860ea'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
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

        const teamResponse: ITeamDocument = response.body.team
        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.managers.length).toBe(1)
        expect(teamResponse.managerArray.length).toBe(1)
        expect(teamResponse.managerArray[0].firstName).toBe(user.firstName)
        expect(teamResponse.managerArray[0].lastName).toBe(user.lastName)

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

        const teamResponse: ITeamDocument = response.body.team as ITeamDocument

        expect(teamResponse.place).toBe(team.place)
        expect(teamResponse.name).toBe(team.name)
        expect(teamResponse.requestsFromPlayers.length).toBe(0)
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

        const response = await request(app)
            .get(`/team/managing/${teamRecord._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const teamResponse = response.body.team as ITeamDocument
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

        await request(app)
            .get(`/team/managing/${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)
    })
})
