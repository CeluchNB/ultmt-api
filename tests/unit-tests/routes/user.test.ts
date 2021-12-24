/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import { ApiError, IUser, IUserDocument, ITeam } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam } from '../../fixtures/utils'
import User from '../../../src/models/user'
import jwt from 'jsonwebtoken'
import Team from '../../../src/models/team'

const anonId = '507f191e810c19729de860ea'

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

describe('test /POST logout', () => {
    it('with existing user and valid token', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        await request(app)
            .post('/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const userRecord2 = await User.findById(userRecord._id)
        expect(userRecord2?.tokens?.length).toBe(0)
    })

    it('with existing user and non-existent token', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()
        const token = jwt.sign({ sub: userRecord._id, iat: Date.now() }, process.env.JWT_SECRET as string)

        await request(app)
            .post('/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
        
        const userRecord2 = await User.findById(userRecord._id)
        expect(userRecord2?.tokens?.length).toBe(1)
    })

    it('with non-existent objectid of user', async () => {
        const token = jwt.sign({ sub: anonId, iat: Date.now() }, process.env.JWT_SECRET as string)

        await request(app)
            .post('/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
    })

    it('with service error', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 400)
        })

        await request(app)
            .post('/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)
    })
})

describe('test /POST logout all', () => {
    it('with existing user and multiple tokens', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()
        await userRecord.generateAuthToken()
        await userRecord.generateAuthToken()

        await request(app)
            .post('/user/logoutAll')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const testUser = await User.findById(userRecord._id)
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with service error', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 400)
        })

        await request(app)
            .post('/user/logoutAll')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)
    })
})

describe('test /GET me', () => {
    it('with valid token', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        const response = await request(app)
            .get('/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        expect(response.body._id.toString()).toBe(userRecord._id.toString())
        expect(response.body.firstName).toBe(userRecord.firstName)
        expect(response.body.email).toBe(userRecord.email)
    })

    it('with invalid token', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()
        const token = jwt.sign({ sub: userRecord._id, iat: Date.now() }, process.env.JWT_SECRET as string)

        const response = await request(app)
            .get('/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
        
        expect(response.body._id).toBeUndefined()
        expect(response.body.firstName).toBeUndefined()
        expect(response.body.email).toBeUndefined()
    })
})

describe('test /GET user', () => {
    it('with existing user', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)

        const response = await request(app)
            .get(`/user/${userRecord._id}`)
            .send()
            .expect(200)
        
        const userResponse = response.body
        expect(userResponse.firstName).toBe(userRecord.firstName)
        expect(userResponse.lastName).toBe(userRecord.lastName)
        expect(userResponse.email).toBe(userRecord.email)
        expect(userResponse.stats?.toString()).toBe(userRecord.stats?.toString())
    })

    it('with non-existing user', async () => {
        const response = await request(app)
            .get(`/user/${anonId}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
    })
})

describe('test /DELETE profile', () => {
    it('test delete with existing token', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        await request(app)
            .delete('/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)
    })

    it('test delete with non-existing token', async () => {
        const token = jwt.sign({ sub: anonId, iat: Date.now() }, process.env.JWT_SECRET as string)

        await request(app)
            .delete('/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
    })

    it('test delete with service error', async () => {
        const user: IUser = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User, 'deleteOne').mockImplementationOnce(() => {
            throw new ApiError(Constants.GENERIC_ERROR, 500)
        })

        await request(app)
            .delete('/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(500)
    })
})
