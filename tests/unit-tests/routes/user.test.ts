import request from 'supertest'
import app from '../../../src/app'
import { ApiError, IUser, OTPReason } from '../../../src/types'
import * as Constants from '../../../src/utils/constants'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers, redisClient } from '../../fixtures/setup-db'
import { getUser, anonId, getTeam } from '../../fixtures/utils'
import User from '../../../src/models/user'
import OneTimePasscode from '../../../src/models/one-time-passcode'
import Team from '../../../src/models/team'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../src/utils/utils'
import sgMail from '@sendgrid/mail'
import { client } from '../../../src/loaders/redis'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'

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
    if (client.isOpen) {
        client.quit()
    }
    done()
})

describe('test /POST user', () => {
    it('with valid data', async () => {
        const user = getUser()
        user.lastName = "O'Brien"

        const response = await request(app).post('/api/v1/user').send(user).expect(201)

        const userResponse: IUser = response.body.user
        const tokens = response.body.tokens

        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.lastName).toBe(user.lastName)
        expect(userResponse.email).toBe(user.email)
        expect(userResponse.password).toBeUndefined()
        expect(userResponse.playerTeams?.length).toBe(0)
        expect(userResponse.managerTeams?.length).toBe(0)
        expect(userResponse.archiveTeams?.length).toBe(0)
        expect(userResponse.stats?.length).toBe(0)

        expect(tokens).toBeDefined()
        expect(tokens.access.length).toBeGreaterThan(20)
        expect(tokens.refresh.length).toBeGreaterThan(20)
    })

    it('with invalid data', async () => {
        const response = await request(app)
            .post('/api/v1/user')
            .send({
                bad: 'data',
            })
            .expect(400)

        expect(response.body.message).toBe(Constants.MISSING_FIELDS)
    })
})

describe('test /GET me', () => {
    it('with valid token', async () => {
        const userRecord = await User.create(getUser())
        const token = await userRecord.generateAuthToken()

        const response = await request(app)
            .get('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const { user, fullManagerTeams } = response.body
        expect(user._id.toString()).toBe(userRecord._id.toString())
        expect(user.firstName).toBe(userRecord.firstName)
        expect(user.email).toBe(userRecord.email)
        expect(fullManagerTeams.length).toBe(0)
    })

    it('with unfound user', async () => {
        const token = jwt.sign({ sub: new Types.ObjectId() }, process.env.JWT_SECRET as string)
        const response = await request(app)
            .get('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
    })

    it('with invalid token', async () => {
        const userRecord = await User.create(getUser())
        const token = await userRecord.generateAuthToken()
        await redisClient.setEx(token, 60 * 60 * 12, '1')

        const response = await request(app)
            .get('/api/v1/user/me')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(401)

        const { user } = response.body
        expect(user).toBeUndefined()
    })
})

describe('test /GET user', () => {
    it('with existing user', async () => {
        const user = getUser()
        const userRecord = await User.create(user)

        const response = await request(app).get(`/api/v1/user/${userRecord._id}`).send().expect(200)

        const userResponse = response.body
        expect(userResponse.firstName).toBe(userRecord.firstName)
        expect(userResponse.lastName).toBe(userRecord.lastName)
        expect(userResponse.email).toBe(userRecord.email)
        expect(userResponse.stats?.toString()).toBe(userRecord.stats?.toString())
    })

    it('with non-existing user', async () => {
        const response = await request(app).get(`/api/v1/user/${anonId}`).send().expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
    })
})

describe('test /DELETE profile', () => {
    it('test delete with existing token', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        await request(app).delete('/api/v1/user/me').set('Authorization', `Bearer ${token}`).send().expect(200)
    })

    it('test delete with service error', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        const token = await userRecord.generateAuthToken()

        jest.spyOn(User, 'deleteOne').mockImplementationOnce(() => {
            throw new ApiError(Constants.GENERIC_ERROR, 500)
        })

        await request(app).delete('/api/v1/user/me').set('Authorization', `Bearer ${token}`).send().expect(500)
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
        const response = await request(app).get('/api/v1/user/search?q=noah').send().expect(200)

        const { users } = response.body
        expect(users.length).toBe(1)
        expect(users[0].username).toBe('noahceluch')
    })

    it('with invalid query', async () => {
        await request(app).get('/api/v1/user/search').send().expect(400)
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

describe('test /PUT change user password', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const oldPassword = user.password

        const response = await request(app)
            .put('/api/v1/user/changePassword')
            .send({ email: 'firstlast', password: 'Pass123!', newPassword: 'Test987!' })
            .expect(200)

        const { user: userResponse, tokens } = response.body
        expect(userResponse.password).toBeUndefined()
        expect(userResponse.email).toBe(user.email)
        expect(userResponse.username).toBe(user.username)
        expect(userResponse.firstName).toBe(user.firstName)
        expect(tokens).not.toBeNull()
        expect(tokens.access.length).toBeGreaterThan(20)
        expect(tokens.refresh.length).toBeGreaterThan(20)

        const userRecord = await User.findById(user._id.toString())
        expect(userRecord?.password).not.toEqual(oldPassword)

        await request(app).post('/api/v1/auth/login').send({ email: 'firstlast', password: 'Test987!' }).expect(200)
    })

    it('with invalid login', async () => {
        await User.create(getUser())
        await request(app)
            .put('/api/v1/user/changePassword')
            .send({ email: 'firstlast', password: 'test123', newPassword: 'Test987!' })
            .expect(401)
    })

    it('with invalid new password', async () => {
        await User.create(getUser())
        const response = await request(app)
            .put('/api/v1/user/changePassword')
            .send({ email: 'firstlast', password: 'Pass123!', newPassword: 'test234' })
            .expect(400)

        expect(response.body.message).toBe(Constants.INVALID_PASSWORD)
    })
})

describe('test /PUT change user email', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())

        const response = await request(app)
            .put('/api/v1/user/changeEmail')
            .send({ email: 'first.last@email.com', password: 'Pass123!', newEmail: 'newemail@hotmail.com' })
            .expect(200)

        const { user: userResponse } = response.body
        expect(userResponse._id.toString()).toBe(user._id.toString())
        expect(userResponse.email).toBe('newemail@hotmail.com')

        const newUserRecord = await User.findById(userResponse._id)
        expect(newUserRecord?.email).toBe('newemail@hotmail.com')
    })

    it('with invalid login', async () => {
        await User.create(getUser())

        await request(app)
            .put('/api/v1/user/changeEmail')
            .send({ email: 'first.last@email.com', password: 'test!', newEmail: 'newemail@hotmail.com' })
            .expect(401)
    })

    it('with invalid new email', async () => {
        const user = await User.create(getUser())

        const response = await request(app)
            .put('/api/v1/user/changeEmail')
            .send({ email: 'first.last@email.com', password: 'Pass123!', newEmail: 'newemail@hotmailcom' })
            .expect(400)

        expect(response.body.message).toBe(Constants.INVALID_EMAIL)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.email).toBe('first.last@email.com')
    })
})

describe('test /PUT change user names', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()

        const response = await request(app)
            .put('/api/v1/user/changeName')
            .set('Authorization', `Bearer ${token}`)
            .send({ newFirstName: 'New First', newLastName: 'New Last' })
            .expect(200)

        const { user: userResponse } = response.body
        expect(userResponse.firstName).toBe('New First')
        expect(userResponse.lastName).toBe('New Last')
        expect(userResponse.username).toBe(user.username)

        const newUserRecord = await User.findById(user._id)
        expect(newUserRecord?.firstName).toBe('New First')
        expect(newUserRecord?.lastName).toBe('New Last')
    })

    it('with invalid token', async () => {
        const user = await User.create(getUser())
        await user.generateAuthToken()

        await request(app)
            .put('/api/v1/user/changeName')
            .set('Authorization', `Bearer 1234sdf.fadt43rth5.44far42sfhasd`)
            .send({ newFirstName: 'New First', newLastName: 'New Last' })
            .expect(401)
    })

    it('with invalid name', async () => {
        const user = await User.create(getUser())
        const token = await user.generateAuthToken()

        const response = await request(app)
            .put('/api/v1/user/changeName')
            .set('Authorization', `Bearer ${token}`)
            .send({ newFirstName: 'waytoolongofafirstname', newLastName: '' })
            .expect(400)

        expect(response.body.message).toBe(Constants.NAME_TOO_LONG)
    })
})

describe('test /POST request password recovery', () => {
    it('with valid data', async () => {
        const spy = jest.spyOn(sgMail, 'send').mockReturnValueOnce(
            Promise.resolve([
                {
                    statusCode: 200,
                    body: {},
                    headers: {},
                },
                {},
            ]),
        )
        const user = await User.create(getUser())

        const response = await request(app)
            .post('/api/v1/user/requestPasswordRecovery')
            .send({ email: user.email })
            .expect(200)

        expect(response.body).toEqual({})

        const [otp] = await OneTimePasscode.find({})
        expect(otp).toBeDefined()
        expect(otp?.passcode.length).toBe(6)

        expect(spy).toHaveBeenCalled()
    })

    it('with sendgrid error', async () => {
        jest.spyOn(sgMail, 'send').mockImplementationOnce(() => {
            throw new ApiError('', 400)
        })
        const user = await User.create(getUser())

        const response = await request(app)
            .post('/api/v1/user/requestPasswordRecovery')
            .send({ email: user.email })
            .expect(500)

        expect(response.body.message).toBe(Constants.UNABLE_TO_SEND_EMAIL)
        const [otp] = await OneTimePasscode.find({})
        expect(otp).toBeUndefined()
    })

    it('with find user error', async () => {
        await User.create(getUser())

        const response = await request(app)
            .post('/api/v1/user/requestPasswordRecovery')
            .send({ email: 'fakeemail@test1234.com' })
            .expect(200)

        expect(response.body).toEqual({})
        const [otp] = await OneTimePasscode.find({})
        expect(otp).toBeUndefined()
    })
})

describe('test /POST reset password', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const otp = await OneTimePasscode.create({
            creator: user._id,
            reason: OTPReason.PasswordRecovery,
        })

        const response = await request(app)
            .post('/api/v1/user/resetPassword')
            .send({ passcode: otp.passcode, newPassword: 'Test987!' })
            .expect(200)

        const { user: userResponse, tokens } = response.body

        expect(tokens).toBeDefined()
        expect(tokens.access.length).toBeGreaterThan(20)
        expect(tokens.refresh.length).toBeGreaterThan(20)
        expect(userResponse.username).toBe(user.username)

        const updatedUser = await User.findById(userResponse)
        expect(updatedUser?.password).not.toBe(user.password)

        const newOtp = await OneTimePasscode.findById(otp._id)
        expect(newOtp).toBeNull()
    })

    it('with invalid passcode', async () => {
        const user = await User.create(getUser())
        await OneTimePasscode.create({
            creator: user._id,
            reason: OTPReason.PasswordRecovery,
            passcode: '123456',
        })

        const response = await request(app)
            .post('/api/v1/user/resetPassword')
            .send({ passcode: '654321', newPassword: 'Test987!' })
            .expect(400)

        expect(response.body.message).toBe(Constants.INVALID_PASSCODE)
    })
})

describe('test /PUT set private', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        user.private = false
        await user.save()
        const token = await user.generateAuthToken()

        const response = await request(app)
            .put('/api/v1/user/setPrivate?private=true')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const { user: userResponse } = response.body

        expect(userResponse.username).toBe(user.username)
        expect(userResponse.private).toBe(true)
    })

    it('with error thrown', async () => {
        const user = await User.create(getUser())
        user.private = false
        await user.save()
        const token = await user.generateAuthToken()

        jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
            throw new ApiError(Constants.UNABLE_TO_FIND_USER, 404)
        })

        const response = await request(app)
            .put('/api/v1/user/setPrivate?private=true')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.UNABLE_TO_FIND_USER)
    })

    it('with invalid token', async () => {
        const user = await User.create(getUser())
        user.private = false
        await user.save()
        await user.generateAuthToken()

        await request(app)
            .put('/api/v1/user/setPrivate?private=true')
            .set('Authorization', 'Bearer 1234.adfgf.3241')
            .send()
            .expect(401)
    })
})

describe('test /POST join team by code', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const team = getTeam()
        const [user, manager] = await User.find({})
        const teamRecord = await Team.create(team)
        const token = await user.generateAuthToken()

        const otp = await OneTimePasscode.create({
            creator: manager._id,
            team: teamRecord._id,
            reason: OTPReason.TeamJoin,
        })

        const result = await request(app)
            .post(`/api/v1/user/joinTeamByCode?code=${otp.passcode}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)

        const { user: userResponse } = result.body
        expect(userResponse.playerTeams.length).toBe(1)
        expect(userResponse.playerTeams[0]._id.toString()).toBe(team._id.toString())
    })

    it('with invalid code', async () => {
        const team = getTeam()
        const [user, manager] = await User.find({})
        const teamRecord = await Team.create(team)
        const token = await user.generateAuthToken()

        await OneTimePasscode.create({
            creator: manager._id,
            team: teamRecord._id,
            reason: OTPReason.TeamJoin,
        })

        const result = await request(app)
            .post('/api/v1/user/joinTeamByCode?code=abcdef')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(400)

        expect(result.body.message).toBe(Constants.INVALID_PASSCODE)
    })

    it('with unauthenticated user', async () => {
        const team = getTeam()
        const [user, manager] = await User.find({})
        const teamRecord = await Team.create(team)
        await user.generateAuthToken()

        const otp = await OneTimePasscode.create({
            creator: manager._id,
            team: teamRecord._id,
            reason: OTPReason.TeamJoin,
        })

        await request(app)
            .post(`/api/v1/user/joinTeamByCode?code=${otp.passcode}`)
            .set('Authorization', 'Bearer da4asd44.asdgy543asf.asft53g')
            .send()
            .expect(401)
    })
})
