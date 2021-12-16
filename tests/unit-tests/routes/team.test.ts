/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import User from '../../../src/models/user'
import { ITeam, ITeamDocument, IUser } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getTeam, getUser } from '../../fixtures/utils'
import * as Constants from '../../../src/utils/constants'

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
