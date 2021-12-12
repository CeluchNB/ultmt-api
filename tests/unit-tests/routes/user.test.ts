/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import { ApiError, IUser, IUserDocument } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser } from '../../fixtures/utils'
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

describe('test /POST user', () => {
    it('with valid data', async () => {
        const user: IUser = getUser()

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

describe('test /POST login', () => {
    it('with existing email', async () => {
        const user: IUser = getUser()
        
        await User.create(user)

        const response = await request(app)
            .post('/user/login')
            .send({ email: user.email, password: user.password })
            .expect(200)

        expect(response.body.token).toBeDefined()
        expect(response.body.token.length).toBeGreaterThan(10)
    })

    it('with existing username', async () => {
        const user: IUser = getUser()
        
        await User.create(user)

        const response = await request(app)
            .post('/user/login')
            .send({ email: user.username, password: user.password })
            .expect(200)
        
        expect(response.body.token).toBeDefined()
        expect(response.body.token.length).toBeGreaterThan(10)
    })

    it('with wrong password', async () => {
        const user: IUser = getUser()

        await User.create(user)

        await request(app)
            .post('/user/login')
            .send({ email: user.email, password: 'nottherealpassword' })
            .expect(401)

    })

    it('without existing email', async () => {
        const user: IUser = getUser()
        
        await User.create(user)

        await request(app)
            .post('/user/login')
            .send({ email: 'absent@email.com', password: user.password })
            .expect(401)

    })

    it('with null password on user', async () => {
        const user: IUser = getUser()

        await User.create(user)

        // @ts-ignore
        jest.spyOn(User, 'findOne').mockImplementationOnce(() => {
            return {
                _id: 'id1',
                firstName: 'first', 
                lastName: 'last', 
                email: 'first@email.com',
                username: 'firstlast',
            }
        })

        await request(app)
            .post('/user/login')
            .send({ email: user.email, password: user.password })
            .expect(401)
    })

    it('with service error', async () => {
        const user: IUser = getUser()

        await User.create(user)

        jest.spyOn(User.prototype, 'generateAuthToken').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
        })

        const response = await request(app)
            .post('/user/login')
            .send({ email: user.email, password: user.password })
            .expect(500)

        expect(response.body.message).toBe(Constants.UNABLE_TO_GENERATE_TOKEN)
    })
})