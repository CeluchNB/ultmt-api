/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable prettier/prettier */
import request from 'supertest'
import app from '../../../src/app'
import { ApiError, IUser } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../fixtures/setup-db'
import { getUser, anonId, getTeam } from '../../fixtures/utils'
import User from '../../../src/models/user'
import jwt from 'jsonwebtoken'
import Team from '../../../src/models/team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'

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
        const user = getUser()

        const response = await request(app)
            .post('/api/v1/user')
            .send(user)
            .expect(201)

        const userResponse: IUser = response.body.user
        const token = response.body.token

        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.lastName).toBe(user.lastName)
        expect(userResponse.email).toBe(user.email)
        expect(userResponse.password).toBeUndefined()
        expect(userResponse.tokens).toBeUndefined()
        expect(userResponse.playerTeams?.length).toBe(0)
        expect(userResponse.managerTeams?.length).toBe(0)
        expect(userResponse.archiveTeams?.length).toBe(0)
        expect(userResponse.stats?.length).toBe(0)

        expect(token).toBeDefined()
        expect(token.length).toBeGreaterThan(10)
    })

    it('with invalid data', async () => {
        const response = await request(app)
            .post('/api/v1/user')
            .send({
                bad: 'data'
            })
            .expect(400)

        expect(response.body.message).toBe(Constants.MISSING_FIELDS)
    })
})

describe('test /POST login', () => {
    it('with existing email', async () => {
        const user = getUser()
        
        await User.create(user)

        const response = await request(app)
            .post('/api/v1/user/login')
            .send({ email: user.email, password: user.password })
            .expect(200)

        expect(response.body.token).toBeDefined()
        expect(response.body.token.length).toBeGreaterThan(10)
    })

    it('with existing username', async () => {
        const user = getUser()
        
        await User.create(user)

        const response = await request(app)
            .post('/api/v1/user/login')
            .send({ email: user.username, password: user.password })
            .expect(200)
        
        expect(response.body.token).toBeDefined()
        expect(response.body.token.length).toBeGreaterThan(10)
    })

    it('with wrong password', async () => {
        const user = getUser()

        await User.create(user)

        await request(app)
            .post('/api/v1/user/login')
            .send({ email: user.email, password: 'nottherealpassword' })
            .expect(401)

    })

    it('without existing email', async () => {
        const user = getUser()
        
        await User.create(user)

        await request(app)
            .post('/api/v1/user/login')
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

        await request(app)
            .post('/api/v1/user/login')
            .send({ email: user.email, password: user.password })
            .expect(401)
    })

    it('with service error', async () => {
        const user = getUser()

        await User.create(user)

        jest.spyOn(User.prototype, 'generateAuthToken').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
        })

        const response = await request(app)
            .post('/api/v1/user/login')
            .send({ email: user.email, password: user.password })
            .expect(500)

        expect(response.body.message).toBe(Constants.UNABLE_TO_GENERATE_TOKEN)
    })
})

describe('test /POST logout', () => {
    it('with existing user and valid token', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        await request(app)
            .post('/api/v1/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const userRecord2 = await User.findById(userRecord._id)
        expect(userRecord2?.tokens?.length).toBe(0)
    })

    it('with existing user and non-existent token', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()
        const token = jwt.sign({ sub: userRecord._id, iat: Date.now() }, process.env.JWT_SECRET as string)

        await request(app)
            .post('/api/v1/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
        
        const userRecord2 = await User.findById(userRecord._id)
        expect(userRecord2?.tokens?.length).toBe(1)
    })

    it('with non-existent objectid of user', async () => {
        const token = jwt.sign({ sub: anonId, iat: Date.now() }, process.env.JWT_SECRET as string)

        await request(app)
            .post('/api/v1/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
    })

    it('with service error', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 400)
        })

        await request(app)
            .post('/api/v1/user/logout')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)
    })
})

describe('test /POST logout all', () => {
    it('with existing user and multiple tokens', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()
        await userRecord.generateAuthToken()
        await userRecord.generateAuthToken()

        await request(app)
            .post('/api/v1/user/logoutAll')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const testUser = await User.findById(userRecord._id)
        expect(testUser?.tokens?.length).toBe(0)
    })

    it('with service error', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 400)
        })

        await request(app)
            .post('/api/v1/user/logoutAll')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)
    })
})

describe('test /GET me', () => {
    it('with valid token', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        const response = await request(app)
            .get('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        expect(response.body._id.toString()).toBe(userRecord._id.toString())
        expect(response.body.firstName).toBe(userRecord.firstName)
        expect(response.body.email).toBe(userRecord.email)
    })

    it('with invalid token', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        await userRecord.generateAuthToken()
        const token = jwt.sign({ sub: userRecord._id, iat: Date.now() }, process.env.JWT_SECRET as string)

        const response = await request(app)
            .get('/api/v1/user/me')
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
        const user = getUser()
        const userRecord = await User.create(user)

        const response = await request(app)
            .get(`/api/v1/user/${userRecord._id}`)
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
            .get(`/api/v1/user/${anonId}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
    })
})

describe('test /DELETE profile', () => {
    it('test delete with existing token', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        await request(app)
            .delete('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)
    })

    it('test delete with non-existing token', async () => {
        const token = jwt.sign({ sub: anonId, iat: Date.now() }, process.env.JWT_SECRET as string)

        await request(app)
            .delete('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)
    })

    it('test delete with service error', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User, 'deleteOne').mockImplementationOnce(() => {
            throw new ApiError(Constants.GENERIC_ERROR, 500)
        })

        await request(app)
            .delete('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(500)
    })
})

describe('test /PUT set open', () => {
    it('with valid open data', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()

        const response = await request(app)
            .put('/api/v1/user/open?open=true')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const userResponse = response.body.user as IUser
        expect(userResponse._id.toString()).toBe(user._id.toString())
        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.openToRequests).toBe(true)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.firstName).toBe(user.firstName)
        expect(userRecord?.openToRequests).toBe(true)
    })

    it('with valid close data', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()

        const response = await request(app)
            .put('/api/v1/user/open?open=false')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const userResponse = response.body.user as IUser
        expect(userResponse._id.toString()).toBe(user._id.toString())
        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.openToRequests).toBe(false)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.firstName).toBe(user.firstName)
        expect(userRecord?.openToRequests).toBe(false)
    })

    it('with invalid token', async () => {
        const user = await User.create(getUser())
        await user.generateAuthToken()

        await request(app)
            .put('/api/v1/user/open?open=false')
            .set('Authorization', 'Bearer asdf1234.uetrf56.hffgu4234')
            .send()
            .expect(401)
    })

    it('with error', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new ApiError(Constants.GENERIC_ERROR, 500)
        })

        const response = await request(app)
            .put('/api/v1/user/open?open=false')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(500)

        expect(response.body.message).toBe(Constants.GENERIC_ERROR)
    })
})

describe('test /POST leave team', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
        await team.save()

        const response = await request(app)
            .post(`/api/v1/user/leave/team?team=${team._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)
        
        const userResponse = response.body.user
        expect(userResponse._id).toBe(user._id.toString())
        expect(userResponse.playerTeams.length).toBe(0)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)
    })

    it('with invalid token', async () => {
        const user = await User.create(getUser())
        await user.generateAuthToken()
        const team = await Team.create(getTeam())

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
        await team.save()

        await request(app)
            .post(`/api/v1/user/leave/team?team=${team._id}`)
            .set('Authorization', 'Bearer asdf431gf.asdft541fg.g86f9jf')
            .send()
            .expect(401)
    })

    it('with non-existent team', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()
        const team = await Team.create(getTeam())

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
        await team.save()

        const response = await request(app)
            .post(`/api/v1/user/leave/team?team=${anonId}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test /GET search users', () => {
    beforeEach(async () => {
        const user1 = getUser()
        user1.firstName = 'Noah'
        user1.lastName = 'Celuch'
        user1.username = 'noahceluch'
        user1.email = 'noahceluch@gmail.com'

        const user2 = getUser()
        user2.firstName = 'Connor'
        user2.lastName = 'Tipping'
        user2.username = 'connortipping'
        user2.email = 'connortipping@gmail.com'

        const noah = await User.create(user1)
        noah.openToRequests = true
        await noah.save()
        const connor = await User.create(user2)
        connor.openToRequests = true
        await connor.save()
    })

    it('with valid query', async () => {
        const response = await request(app)
            .get('/api/v1/user/search?q=noah')
            .send()
            .expect(200)

        const { users } = response.body
        expect(users.length).toBe(1)
        expect(users[0].username).toBe('noahceluch')
    })

    it('with invalid query', async () => {
        await request(app)
            .get('/api/v1/user/search')
            .send()
            .expect(400)
    })
})

describe('test /PUT leave manager', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager, manager2] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        const response = await request(app)
            .put(`/api/v1/user/managerLeave?team=${team._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const resultUser = response.body.user
        expect(resultUser._id.toString()).toBe(manager._id.toString())
        expect(resultUser.managerTeams.length).toBe(0)

        const resultTeam = await Team.findById(team._id)
        expect(resultTeam?.managers.length).toBe(1)
    })

    it('with unauthenticated manager', async () => {
        const [manager, manager2] = await User.find({})
        await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        await request(app)
            .put(`/api/v1/user/managerLeave?team=${team._id}`)
            .set('Authorization', 'Bearer adf432.fdt543fggd.5432rffgt')
            .send()
            .expect(401)
    })

    it('with last manager error', async () => {
        const [manager] = await User.find({})
        const token = await manager.generateAuthToken()
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()

        const response = await request(app)
            .put(`/api/v1/user/managerLeave?team=${team._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(400)

        expect(response.body.message).toBe(Constants.USER_IS_ONLY_MANAGER)

    })
})
