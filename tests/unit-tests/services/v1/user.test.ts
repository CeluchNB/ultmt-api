import UserServices from '../../../../src/services/v1/user'
import User from '../../../../src/models/user'
import Team from '../../../../src/models/team'
import OneTimePasscode from '../../../../src/models/one-time-passcode'
import { setUpDatabase, resetDatabase, tearDownDatabase, saveUsers } from '../../../fixtures/setup-db'
import { getUser, getTeam, anonId } from '../../../fixtures/utils'
import * as Constants from '../../../../src/utils/constants'
import { ApiError, OTPReason } from '../../../../src/types'
import { getEmbeddedTeam, getEmbeddedUser } from '../../../../src/utils/utils'
import bcrypt from 'bcryptjs'
import sgMail from '@sendgrid/mail'
import { Types } from 'mongoose'

const services: UserServices = new UserServices(User, Team)

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

describe('test sign up', () => {
    it('with valid user data', async () => {
        const user = getUser()

        const { user: userRecord, tokens } = await services.signUp(user)
        expect(userRecord._id).toBeDefined()
        expect(userRecord.firstName).toBe(user.firstName)
        expect(userRecord.lastName).toBe(user.lastName)
        expect(userRecord.email).toBe(user.email)
        expect(userRecord.password).not.toBe(user.password)
        expect(userRecord.playerTeams.length).toBe(0)
        expect(userRecord.managerTeams.length).toBe(0)
        expect(userRecord.archiveTeams.length).toBe(0)
        expect(userRecord.requests.length).toBe(0)

        expect(tokens).toBeDefined()
        expect(tokens.access.length).toBeGreaterThan(20)
        expect(tokens.refresh.length).toBeGreaterThan(20)
    })

    it('with invalid user data', async () => {
        const user = getUser()
        user.email = 'bad@email'

        await expect(services.signUp(user)).rejects.toThrow(Constants.UNABLE_TO_CREATE_USER)
    })
})

describe('test get user', () => {
    it('with existing, public user', async () => {
        const user = getUser()
        const userRecord = await User.create(user)

        const userResponse = await services.getUser(userRecord._id.toHexString())

        expect(userResponse._id.toString()).toBe(userRecord._id.toString())
        expect(userResponse.firstName).toBe(userRecord.firstName)
        expect(userResponse.lastName).toBe(userRecord.lastName)
        expect(userResponse.email).toBe(userRecord.email)
        expect(userResponse.playerTeams.toString()).toBe(userRecord.playerTeams?.toString())
        expect(userResponse.managerTeams.toString()).toBe(userRecord.managerTeams?.toString())
        expect(userResponse.archiveTeams.toString()).toBe(userRecord.archiveTeams?.toString())
        expect(userResponse.requests.length).toBe(0)
    })

    it('with existing, private user', async () => {
        const user = getUser()
        const userRecord = await User.create(user)
        userRecord.private = true
        await userRecord.save()

        const userResponse = await services.getUser(userRecord._id.toHexString())
        expect(userResponse._id.toString()).toBe(userRecord._id.toString())
        expect(userResponse.firstName).toBe(userRecord.firstName)
        expect(userResponse.lastName).toBe(userRecord.lastName)
        expect(userResponse.email).toBe(userRecord.email)
        expect(userResponse.playerTeams.length).toBe(0)
        expect(userResponse.managerTeams.length).toBe(0)
        expect(userResponse.archiveTeams.length).toBe(0)
        expect(userResponse.requests.length).toBe(0)
    })

    it('with non-existent user', async () => {
        await expect(services.getUser(anonId)).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_USER, 404))
    })

    it('with bad id', async () => {
        await expect(services.getUser('badid')).rejects.toThrow()
    })
})

describe('test get me', () => {
    it('with valid user', async () => {
        const team = getTeam()
        await Team.create(team)
        const userRecord = await User.create(getUser())
        const id = new Types.ObjectId()
        userRecord.requests = [id]
        userRecord.managerTeams = [team]
        await userRecord.save()

        const { user, fullManagerTeams } = await services.getMe(userRecord._id.toString())
        expect(user._id.toString()).toBe(userRecord._id.toString())
        expect(user.email).toBe(userRecord.email)
        expect(user.firstName).toBe(userRecord.firstName)
        expect(user.lastName).toBe(userRecord.lastName)
        expect(user.username).toBe(userRecord.username)
        expect(user.requests[0].toString()).toBe(id.toString())
        expect(fullManagerTeams.length).toBe(1)
        expect(fullManagerTeams[0]._id.toString()).toBe(team._id.toString())
    })

    it('with unfound user', async () => {
        await expect(services.getMe(anonId)).rejects.toThrow(new ApiError(Constants.UNABLE_TO_FIND_USER, 404))
    })
})

describe('test delete account', () => {
    it('with existing user', async () => {
        const user1 = getUser()
        const user2 = getUser()
        user2.email = 'first.last2@email.com'
        user2.username = 'lastfirst'
        const userRecord1 = await User.create(user1)
        const userRecord2 = await User.create(user2)

        await services.deleteUser(userRecord1._id.toHexString())

        const userResult1 = await User.findById(userRecord1._id)
        const userResult2 = await User.findById(userRecord2._id)

        expect(userResult1).toBeNull()
        expect(userResult2).not.toBeNull()
    })

    it('with non-existing user', async () => {
        const user = getUser()
        const userRecord = await User.create(user)

        services.deleteUser(anonId)
        const userResult = await User.findById(userRecord._id)
        expect(userResult).not.toBeNull()
    })
})

describe('test set open to requests', () => {
    it('with valid open data', async () => {
        const user = await User.create(getUser())

        const userResponse = await services.setOpenToRequests(user._id.toHexString(), true)
        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.openToRequests).toBe(true)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.openToRequests).toBe(true)
    })

    it('with valid close data', async () => {
        const user = await User.create(getUser())
        user.openToRequests = true
        await user.save()

        const userResponse = await services.setOpenToRequests(user._id.toHexString(), false)
        expect(userResponse.firstName).toBe(user.firstName)
        expect(userResponse.openToRequests).toBe(false)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.openToRequests).toBe(false)
    })

    it('with non-existent user', async () => {
        await User.create(getUser())
        await expect(services.setOpenToRequests(anonId, true)).rejects.toThrow(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test leave team', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
        await team.save()

        const result = await services.leaveTeam(user._id.toString(), team._id.toString())
        expect(result._id.toString()).toBe(user._id.toString())
        expect(result.playerTeams.length).toBe(0)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.playerTeams.length).toBe(0)

        const teamRecord = await Team.findById(team._id)
        expect(teamRecord?.players.length).toBe(0)
    })

    it('with non-existent user', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
        await team.save()

        await expect(services.leaveTeam(anonId, team._id.toString())).rejects.toThrow(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with non-existent team', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        user.playerTeams.push(getEmbeddedTeam(team))
        await user.save()
        team.players.push(getEmbeddedUser(user))
        await team.save()

        await expect(services.leaveTeam(user._id.toHexString(), anonId)).rejects.toThrow(
            new ApiError(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with user not on team', async () => {
        const user = await User.create(getUser())
        const team = await Team.create(getTeam())

        await expect(services.leaveTeam(user._id.toString(), team._id.toString())).rejects.toThrow(
            new ApiError(Constants.PLAYER_NOT_ON_TEAM, 404),
        )
    })
})

describe('test search user', () => {
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

        const user3 = getUser()
        user3.firstName = 'Zach'
        user3.lastName = 'Risinger'
        user3.username = 'zachris'
        user3.email = 'zachris@gmail.com'

        const user4 = getUser()
        user4.firstName = 'Zach'
        user4.lastName = 'Dahm'
        user4.username = 'zachdahm'
        user4.email = 'zachdahm@gmail.com'

        const noah = await User.create(user1)
        noah.openToRequests = true
        await noah.save()
        const connor = await User.create(user2)
        connor.openToRequests = true
        await connor.save()
        const zachr = await User.create(user3)
        zachr.openToRequests = true
        await zachr.save()
        const zachd = await User.create(user4)
        zachd.openToRequests = true
        await zachd.save()
    })

    it('test search first name', async () => {
        const result = await services.searchUsers('Noah')

        expect(result.length).toBe(1)
        expect(result[0].username).toBe('noahceluch')
    })

    it('test search last name', async () => {
        const result = await services.searchUsers('Tipping')

        expect(result.length).toBe(1)
        expect(result[0].username).toBe('connortipping')
    })

    it('test by full name', async () => {
        await User.updateOne({ username: 'zachdahm' }, { openToRequests: false })

        const result = await services.searchUsers('Zach Risinger')

        expect(result.length).toBe(2)
        expect(result[0].username).toBe('zachris')
        expect(result[1].username).toBe('zachdahm')
    })

    it('test search username', async () => {
        const result = await services.searchUsers('zachris')

        expect(result.length).toBe(1)
        expect(result[0].username).toBe('zachris')
    })

    it('test partial name', async () => {
        const result = await services.searchUsers('Con Tip')
        expect(result.length).toBe(1)
        expect(result[0].username).toBe('connortipping')
    })

    it('test search zachs', async () => {
        await User.updateOne({ username: 'zachdahm' }, { openToRequests: false })

        const result = await services.searchUsers('zach')
        expect(result.length).toBe(2)
    })

    it('search with open true', async () => {
        await User.updateOne({ username: 'zachdahm' }, { openToRequests: false })
        const result = await services.searchUsers('zach', true)
        expect(result.length).toBe(1)
        expect(result[0].username).toBe('zachris')
    })

    it('search with open false', async () => {
        await User.updateOne({ username: 'zachdahm' }, { openToRequests: false })

        const result = await services.searchUsers('zach', false)
        expect(result.length).toBe(1)
        expect(result[0].username).toBe('zachdahm')
    })

    it('test not enough characters', async () => {
        await expect(services.searchUsers('no')).rejects.toThrow(new ApiError(Constants.NOT_ENOUGH_CHARACTERS, 400))
    })
})

describe('test manager leave', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const [manager, manager2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        const result = await services.leaveManagerRole(team._id.toString(), manager._id.toString())
        expect(result._id.toString()).toBe(manager._id.toString())
        expect(result.managerTeams.length).toBe(0)

        const resultTeam = await Team.findById(team._id)
        expect(resultTeam?.managers.length).toBe(1)
        expect(resultTeam?.managers[0]._id.toString()).toBe(manager2._id.toString())
    })

    it('with non-existent team', async () => {
        const [manager, manager2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        await expect(services.leaveManagerRole(anonId, manager._id.toHexString())).rejects.toThrow(
            Constants.UNABLE_TO_FIND_TEAM,
        )
    })

    it('with non-existent manager', async () => {
        const [manager, manager2] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.managers.push(getEmbeddedUser(manager2))
        await team.save()
        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        manager2.managerTeams.push(getEmbeddedTeam(team))
        await manager2.save()

        await expect(services.leaveManagerRole(team._id.toString(), anonId)).rejects.toThrow(
            Constants.UNABLE_TO_FIND_USER,
        )
    })

    it('with last manager leaving', async () => {
        const [manager, playerOne, playerTwo] = await User.find({})
        const team = await Team.create(getTeam())
        team.managers.push(getEmbeddedUser(manager))
        team.players.push(getEmbeddedUser(playerOne))
        team.players.push(getEmbeddedUser(playerTwo))
        await team.save()

        manager.managerTeams.push(getEmbeddedTeam(team))
        await manager.save()
        playerOne.playerTeams.push(getEmbeddedTeam(team))
        await playerOne.save()
        playerTwo.playerTeams.push(getEmbeddedTeam(team))
        await playerTwo.save()

        await expect(services.leaveManagerRole(team._id.toString(), manager._id.toString())).rejects.toThrow(
            Constants.USER_IS_ONLY_MANAGER,
        )
    })
})

describe('test change user password', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        await user.save()
        const oldPassword = user.password

        const { user: newUser, tokens } = await services.changePassword(user._id.toString(), 'Test987!')
        const newPassword = newUser.password as string
        expect(oldPassword).not.toBe(newPassword)
        expect(bcrypt.compareSync('Test987!', newPassword)).toBe(true)
        expect(tokens.access.length).toBeGreaterThan(20)
        expect(tokens.refresh.length).toBeGreaterThan(20)

        const newUserRecord = await User.findById(user._id.toString())
        expect(newUserRecord?.password).toBe(newPassword)
    })

    it('with unfound user', async () => {
        await User.create(getUser())

        expect(services.changePassword(anonId, 'Test987!')).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })

    it('with invalid password', async () => {
        const user = await User.create(getUser())
        const oldPassword = user.password

        expect(services.changePassword(user._id.toString(), 'test')).rejects.toThrow(Constants.INVALID_PASSWORD)

        const userRecord = await User.findById(user._id.toString())
        expect(userRecord?.password).toBe(oldPassword)
    })
})

describe('test change user email', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())

        const newUser = await services.changeEmail(user._id.toString(), 'newemail@hotmail.com')
        expect(newUser._id.toString()).toBe(user._id.toString())
        expect(newUser.firstName).toBe(user.firstName)
        expect(newUser.email).toBe('newemail@hotmail.com')

        const newUserRecord = await User.findById(user._id)
        expect(newUserRecord?.email).toBe('newemail@hotmail.com')
    })

    it('with invalid email', async () => {
        const user = await User.create(getUser())

        expect(services.changeEmail(user._id.toString(), 'newemail@hotmailcom')).rejects.toThrow(
            Constants.INVALID_EMAIL,
        )
        const userRecord = await User.findById(user._id)
        expect(userRecord?.email).toBe(user.email)
    })

    it('with unfound user', async () => {
        await User.create(getUser())
        expect(services.changeEmail(anonId, 'newemail@hotmail.com')).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })
})

describe('test change user name', () => {
    it('with valid first name and last name data', async () => {
        const user = await User.create(getUser())

        const newUser = await services.changeName(user._id.toString(), 'New First', 'New Last')

        expect(newUser.firstName).toBe('New First')
        expect(newUser.lastName).toBe('New Last')
        expect(newUser.username).toBe(user.username)

        const newUserRecord = await User.findById(user._id)
        expect(newUserRecord?.firstName).toBe('New First')
        expect(newUserRecord?.lastName).toBe('New Last')
    })

    it('with neither first name nor last name', async () => {
        const userData = getUser()
        const user = await User.create(userData)
        const newUser = await services.changeName(user._id.toString())

        expect(newUser.firstName).toBe(userData.firstName)
        expect(newUser.lastName).toBe(userData.lastName)

        const newUserRecord = await User.findById(user._id)
        expect(newUserRecord?.firstName).toBe(userData.firstName)
        expect(newUserRecord?.lastName).toBe(userData.lastName)
    })

    it('with invalid (too long) first name and valid last name', async () => {
        const userData = getUser()
        const user = await User.create(userData)
        expect(
            services.changeName(user._id.toString(), 'thisiswaytoolongforonepersonsname', 'New Last'),
        ).rejects.toThrow(Constants.NAME_TOO_LONG)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.firstName).toBe(userData.firstName)
        expect(userRecord?.lastName).toBe(userData.lastName)
    })

    it('with invalid last name and valid first name', async () => {
        const userData = getUser()
        const user = await User.create(userData)
        expect(
            services.changeName(user._id.toString(), 'New First', 'thisiswaytoolongforonepersonsname'),
        ).rejects.toThrow(Constants.NAME_TOO_LONG)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.firstName).toBe(userData.firstName)
        expect(userRecord?.lastName).toBe(userData.lastName)
    })

    it('with unfound user', async () => {
        await User.create(getUser())
        expect(services.changeName(anonId, 'New First', 'New Last')).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })
})

describe('test request password recovery', () => {
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

        await services.requestPasswordRecovery(user.email)

        const [otp] = await OneTimePasscode.find({})

        expect(otp).toBeDefined()
        expect(otp?.passcode.length).toBe(6)
        expect(otp?.reason).toBe(OTPReason.PasswordRecovery)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it('with unfound user', async () => {
        await User.create(getUser())
        expect(services.requestPasswordRecovery('unknown@email.com')).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })

    it('with send error', async () => {
        const spy = jest.spyOn(sgMail, 'send').mockImplementationOnce(() => {
            throw new ApiError('', 400)
        })
        const user = await User.create(getUser())
        expect(services.requestPasswordRecovery(user.email)).rejects.toThrow(Constants.UNABLE_TO_SEND_EMAIL)
        expect(spy).toHaveBeenCalled()
        const [otp] = await OneTimePasscode.find({})
        expect(otp).toBeUndefined()
    })
})

describe('test reset password', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        await user.save()
        const otp = await OneTimePasscode.create({
            creator: user._id,
            reason: OTPReason.PasswordRecovery,
        })

        const { user: userResult, tokens } = await services.resetPassword(otp.passcode, 'Test987#')

        expect(tokens).toBeDefined()
        expect(tokens.access.length).toBeGreaterThan(20)
        expect(tokens.refresh.length).toBeGreaterThan(20)
        expect(userResult.username).toBe(user.username)

        const newUser = await User.findById(user._id)
        expect(newUser?.password).not.toBe(user.password)

        const newOtp = await OneTimePasscode.findById(otp._id)
        expect(newOtp).toBeNull()
    })

    it('with unfound otp', async () => {
        await User.create(getUser())

        expect(services.resetPassword('123456', 'Test987#')).rejects.toThrow(Constants.INVALID_PASSCODE)
    })

    it('with expired otp', async () => {
        const user = await User.create(getUser())
        const otp = await OneTimePasscode.create({
            creator: user._id,
            reason: OTPReason.PasswordRecovery,
            expiresAt: new Date(),
        })

        expect(services.resetPassword(otp.passcode, 'Test987#')).rejects.toThrow(Constants.INVALID_PASSCODE)
    })

    it('with unfound user', async () => {
        await User.create(getUser())
        const otp = await OneTimePasscode.create({
            creator: anonId,
            reason: OTPReason.PasswordRecovery,
        })

        expect(services.resetPassword(otp.passcode, 'Test987#')).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })

    it('with invalid password', async () => {
        const user = await User.create(getUser())

        const otp = await OneTimePasscode.create({
            creator: user._id,
            reason: OTPReason.PasswordRecovery,
        })

        expect(services.resetPassword(otp.passcode, 'test#')).rejects.toThrow(Constants.INVALID_PASSWORD)
        const newUser = await User.findById(otp.creator)
        expect(newUser?.password).toBe(user.password)

        const newOtp = await OneTimePasscode.findById(otp._id)
        expect(newOtp).not.toBeNull()
    })
})

describe('test set private', () => {
    it('with valid data', async () => {
        const user = await User.create(getUser())
        user.private = false
        await user.save()

        const updatedUser = await services.setPrivateAccount(user._id.toHexString(), true)

        expect(updatedUser.username).toBe(user.username)
        expect(updatedUser.private).toBe(true)

        const userRecord = await User.findById(user._id)
        expect(userRecord?.private).toBe(true)
    })

    it('with unfound user', async () => {
        const user = await User.create(getUser())
        user.private = false
        await user.save()

        expect(services.setPrivateAccount(anonId, true)).rejects.toThrow(
            new ApiError(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })
})

describe('test join team by bulk code', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with valid data', async () => {
        const team = getTeam()
        const [user, manager] = await User.find({})
        const teamRecord = await Team.create(team)

        const otp = await OneTimePasscode.create({
            creator: manager._id,
            team: teamRecord._id,
            reason: OTPReason.TeamJoin,
        })

        const userResult = await services.joinByCode(user._id.toHexString(), otp.passcode)
        expect(userResult._id.toString()).toBe(user._id.toString())
        expect(userResult.playerTeams.length).toBe(1)
        expect(userResult.playerTeams[0]._id.toString()).toBe(teamRecord._id.toString())

        const updatedTeam = await Team.findById(teamRecord._id)
        expect(updatedTeam?.players.length).toBe(1)
        expect(updatedTeam?.players[0]._id.toString()).toBe(user._id.toString())
    })

    it('with non-existent user', async () => {
        const team = getTeam()
        const [, manager] = await User.find({})
        const teamRecord = await Team.create(team)

        const otp = await OneTimePasscode.create({
            creator: manager._id,
            team: teamRecord._id,
            reason: OTPReason.TeamJoin,
        })

        expect(services.joinByCode(anonId, otp.passcode)).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)
    })

    it('with non-existent code', async () => {
        const team = getTeam()
        const [user, manager] = await User.find({})
        const teamRecord = await Team.create(team)

        await OneTimePasscode.create({
            creator: manager._id,
            team: teamRecord._id,
            reason: OTPReason.TeamJoin,
        })

        expect(services.joinByCode(user._id.toHexString(), 'abcdef')).rejects.toThrow(Constants.INVALID_PASSCODE)
    })

    it('with expired code', async () => {
        const team = getTeam()
        const [user, manager] = await User.find({})
        const teamRecord = await Team.create(team)

        const otp = await OneTimePasscode.create({
            creator: manager._id,
            team: teamRecord._id,
            reason: OTPReason.TeamJoin,
            expiresAt: new Date('01-01-2022'),
        })

        expect(services.joinByCode(user._id.toHexString(), otp.passcode)).rejects.toThrow(Constants.INVALID_PASSCODE)
    })

    it('with non-existent team', async () => {
        const team = getTeam()
        const [user, manager] = await User.find({})
        await Team.create(team)

        const otp = await OneTimePasscode.create({
            creator: manager._id,
            team: anonId,
            reason: OTPReason.TeamJoin,
        })
        expect(services.joinByCode(user._id.toHexString(), otp.passcode)).rejects.toThrow(Constants.UNABLE_TO_FIND_TEAM)
    })
})

describe('test username taken', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('with username already take', async () => {
        const [user] = await User.find()

        const result = await services.usernameTaken(user.username)
        expect(result).toBe(true)
    })

    it('with username not taken', async () => {
        const [user] = await User.find()

        const result = await services.usernameTaken(`${user.username}75930957`)
        expect(result).toBe(false)
    })

    it('with missing username', async () => {
        await expect(services.usernameTaken()).rejects.toThrow(Constants.INVALID_USERNAME)
    })

    it('with short string', async () => {
        await expect(services.usernameTaken('a')).rejects.toThrow(Constants.INVALID_USERNAME)
    })
})
