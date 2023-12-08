import VerificationRequest from '../../../src/models/verification-request'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../fixtures/setup-db'
import * as Constants from '../../../src/utils/constants'
import { Types } from 'mongoose'
import {
    getVerification,
    requestVerification,
    respondToVerification,
} from '../../../src/services/v1/verification-request'
import { getUser, getTeam } from '../../fixtures/utils'
import User from '../../../src/models/user'
import sgMail from '@sendgrid/mail'
import Team from '../../../src/models/team'
import { IUser } from '../../../src/types'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    jest.resetAllMocks()
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
})

describe('verification request services', () => {
    describe('get verification request', () => {
        it('finds valid request', async () => {
            const user = getUser()
            const expected = await VerificationRequest.create({
                sourceType: 'user',
                sourceId: new Types.ObjectId(),
                creator: user,
            })

            const result = await getVerification(expected._id.toHexString())
            expect(result._id.toHexString()).toBe(expected._id.toHexString())
            expect(result.sourceType).toBe(expected.sourceType)
            expect(result.sourceId.toHexString()).toBe(expected.sourceId.toHexString())
            expect(result.status).toBe(expected.status)
        })

        it('handles unfound request', async () => {
            await expect(getVerification(new Types.ObjectId().toHexString())).rejects.toThrow(
                Constants.UNABLE_TO_FIND_VERIFICATION,
            )
        })
    })

    describe('request verification', () => {
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
        it('handles successful creation', async () => {
            const user = getUser()
            const creator = await await User.create(user)
            const sourceId = new Types.ObjectId()

            await requestVerification('team', sourceId.toHexString(), creator._id.toHexString())

            const result = await VerificationRequest.findOne({})
            expect(result?.sourceType).toBe('team')
            expect(result?.sourceId.toHexString()).toBe(sourceId.toHexString())
            expect(result?.creator._id.toHexString()).toBe(creator._id.toHexString())

            expect(spy).toHaveBeenCalled()
        })

        it('handles unfound creator', async () => {
            const sourceId = new Types.ObjectId()

            await expect(
                requestVerification('team', sourceId.toHexString(), new Types.ObjectId().toHexString()),
            ).rejects.toThrow(Constants.UNABLE_TO_FIND_USER)

            const result = await VerificationRequest.findOne({})
            expect(result).toBeNull()

            expect(spy).not.toHaveBeenCalled()
        })

        it('handles invalid source type', async () => {
            const user = getUser()
            const creator = await await User.create(user)
            const sourceId = new Types.ObjectId()

            await expect(
                requestVerification('game', sourceId.toHexString(), creator._id.toHexString()),
            ).rejects.toThrow(Constants.INVALID_SOURCE_TYPE)

            const result = await VerificationRequest.findOne({})
            expect(result).toBeNull()

            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('respond to verification', () => {
        let creator: IUser
        beforeEach(async () => {
            creator = await User.create({ ...getUser(), email: 'noah.celuch@gmail.com' })
        })

        it('with successful team approve', async () => {
            const team = await Team.create(getTeam())
            const verificationRequest = await VerificationRequest.create({
                sourceType: 'team',
                sourceId: team._id,
                creator,
            })

            const result = await respondToVerification(
                verificationRequest._id.toHexString(),
                'approved',
                creator._id.toHexString(),
            )

            expect(result.status).toBe('approved')

            const updatedTeam = await Team.findOne({})
            expect(updatedTeam?.verified).toBe(true)
        })

        it('with successful user approve', async () => {
            const user = await User.create({ ...getUser(), username: 'firstlast2' })
            const verificationRequest = await VerificationRequest.create({
                sourceType: 'user',
                sourceId: user._id,
                creator,
            })

            const result = await respondToVerification(
                verificationRequest._id.toHexString(),
                'approved',
                creator._id.toHexString(),
            )

            expect(result.status).toBe('approved')

            const updatedUser = await User.findById(user._id)
            expect(updatedUser?.verified).toBe(true)
        })

        it('with successful deny', async () => {
            const team = await Team.create(getTeam())
            const verificationRequest = await VerificationRequest.create({
                sourceType: 'team',
                sourceId: team._id,
                creator,
            })

            const result = await respondToVerification(
                verificationRequest._id.toHexString(),
                'denied',
                creator._id.toHexString(),
            )

            expect(result.status).toBe('denied')

            const updatedTeam = await Team.findOne({})
            expect(updatedTeam?.verified).toBe(false)
        })

        it('with invalid response type', async () => {
            await expect(
                respondToVerification(new Types.ObjectId().toHexString(), 'badresponse' as 'approved'),
            ).rejects.toThrow(Constants.INVALID_RESPONSE_TYPE)
        })

        it('with unfound verification', async () => {
            await expect(respondToVerification(new Types.ObjectId().toHexString(), 'approved')).rejects.toThrow(
                Constants.UNABLE_TO_FIND_VERIFICATION,
            )
        })

        it('with unauthorized responder', async () => {
            const user = await User.create({ ...getUser(), username: 'firstlast2' })
            const verificationRequest = await VerificationRequest.create({
                sourceType: 'user',
                sourceId: user._id,
                creator,
            })

            await expect(
                respondToVerification(verificationRequest._id.toHexString(), 'approved', user._id.toHexString()),
            ).rejects.toThrow(Constants.UNAUTHORIZED_TO_VERIFY)
        })
    })
})
