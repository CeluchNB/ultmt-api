/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import * as Constants from '../../../src/utils/constants'
import { ApiError } from '../../../src/types'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { getUser, getTeam } from '../../fixtures/utils'
import User from '../../../src/models/user'
import Team from '../../../src/models/team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'
import jwt from 'jsonwebtoken'

jest.mock('node-cron', () => {
    return {
        schedule: jest.fn(),
    }
})

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

describe('test /POST login', () => {
    it('with existing email', async () => {
        const user = getUser()

        await User.create(user)

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: user.password })
            .expect(200)

        expect(response.body.token).toBeDefined()
        expect(response.body.token.length).toBeGreaterThan(10)
    })

    it('with existing username', async () => {
        const user = getUser()

        await User.create(user)

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: user.username, password: user.password })
            .expect(200)

        expect(response.body.token).toBeDefined()
        expect(response.body.token.length).toBeGreaterThan(10)
    })

    it('with wrong password', async () => {
        const user = getUser()

        await User.create(user)

        await request(app)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'nottherealpassword' })
            .expect(401)
    })

    it('without existing email', async () => {
        const user = getUser()

        await User.create(user)

        await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'absent@email.com', password: user.password })
            .expect(401)
    })

    it('with null password on user', async () => {
        const user = getUser()

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

        await request(app).post('/api/v1/auth/login').send({ email: user.email, password: user.password }).expect(401)
    })

    it('with service error', async () => {
        const user = getUser()

        await User.create(user)

        jest.spyOn(User.prototype, 'generateAuthToken').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
        })

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: user.password })
            .expect(500)

        expect(response.body.message).toBe(Constants.UNABLE_TO_GENERATE_TOKEN)
    })
})

// describe('test /POST logout', () => {
//     it('with existing user and valid token', async () => {
//         const user = getUser()
//         const userRecord = await User.create(user)
//         const token = await userRecord.generateAuthToken()

//         await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send().expect(200)

//         const userRecord2 = await User.findById(userRecord._id)
//         expect(userRecord2?.tokens?.length).toBe(0)
//     })

//     it('with existing user and non-existent token', async () => {
//         const user = getUser()
//         const userRecord = await User.create(user)
//         await userRecord.generateAuthToken()
//         const token = jwt.sign({ sub: userRecord._id, iat: Date.now() }, process.env.JWT_SECRET as string)

//         await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send().expect(401)

//         const userRecord2 = await User.findById(userRecord._id)
//         expect(userRecord2?.tokens?.length).toBe(1)
//     })

//     it('with non-existent objectid of user', async () => {
//         const token = jwt.sign({ sub: anonId, iat: Date.now() }, process.env.JWT_SECRET as string)

//         await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send().expect(401)
//     })

//     it('with service error', async () => {
//         const user = getUser()
//         const userRecord = await User.create(user)
//         const token = await userRecord.generateAuthToken()

//         jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
//             throw new ApiError(Constants.UNABLE_TO_FIND_USER, 400)
//         })

//         await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send().expect(404)
//     })
// })

describe('test /POST logout all', () => {
    // it('with existing user and multiple tokens', async () => {
    //     const user = getUser()
    //     const userRecord = await User.create(user)
    //     const token = await userRecord.generateAuthToken()
    //     await userRecord.generateAuthToken()
    //     await userRecord.generateAuthToken()

    //     await request(app).post('/api/v1/auth/logoutAll').set('Authorization', `Bearer ${token}`).send().expect(200)

    //     const testUser = await User.findById(userRecord._id)
    //     expect(testUser?.tokens?.length).toBe(0)
    // })

    it('with service error', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 400)
        })

        await request(app).post('/api/v1/auth/logoutAll').set('Authorization', `Bearer ${token}`).send().expect(404)
    })
})

describe('test /GET authenticate manager', () => {
    it('with valid manager', async () => {
        const teamData = getTeam()
        const userData = getUser()
        const team = await Team.create(teamData)
        const user = await User.create(userData)

        team.managers.push(getEmbeddedUser(user))
        await team.save()
        user.managerTeams.push(getEmbeddedTeam(team))
        await user.save()

        const token = await user.generateAuthToken()

        const response = await request(app)
            .get(`/api/v1/auth/manager?team=${team._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)
    
        const { user: userResponse } = response.body
        expect(userResponse._id.toString()).toBe(user._id.toString())
        expect(userResponse.username).toBe(user.username)
    })

    it('with non-manager', async () => {
        const teamData = getTeam()
        const userData = getUser()
        const team = await Team.create(teamData)
        const user = await User.create(userData)

        const token = await user.generateAuthToken()

        await request(app)
            .get(`/api/v1/auth/manager?team=${team._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
    })

    it('with invalid token', async () => {
        const teamData = getTeam()
        const userData = getUser()
        const team = await Team.create(teamData)
        const user = await User.create(userData)

        team.managers.push(getEmbeddedUser(user))
        await team.save()
        user.managerTeams.push(getEmbeddedTeam(team))
        await user.save()

        await user.generateAuthToken()

        await request(app)
            .get(`/api/v1/auth/manager?team=${team._id}`)
            .set('Authorization', `Bearer asdf.13425ra.asdf4f`)
            .send()
            .expect(401)
    })
})