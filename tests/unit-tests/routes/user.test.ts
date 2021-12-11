/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import { IUser, IUserDocument } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import User from '../../../src/models/user'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await User.deleteMany({})
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('/POST user', () => {
    it('with valid data', async () => {
        const user: IUser = {
            firstName: 'FirstName',
            lastName: 'LastName',
            email: 'last@email.com',
            password: 'Pass123!',
        }

        const response = await request(app)
            .post('/user')
            .send(user)
            .expect(201)

        const userResponse: IUserDocument = response.body.user
        const token = response.body.token

        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.lastName).toBe(user.lastName)
        expect(userResponse.email).toBe(user.email)
        expect(userResponse.password).toBeUndefined()
        expect(userResponse.tokens).toBeUndefined()
        expect(userResponse.playerTeams?.length).toBe(0)
        expect(userResponse.managerTeams?.length).toBe(0)
        expect(userResponse.stats?.length).toBe(0)

        expect(token).toBeDefined()
        expect(token.length).toBeGreaterThan(10)
    })

    it('with invalid data', async () => {
        const response = await request(app)
            .post('/user')
            .send({
                bad: 'data'
            })
            .expect(400)

        expect(response.body.message).toBe(Constants.MISSING_FIELDS)
    })
})
