import VerificationRequest from '../../../src/models/verification-request'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../fixtures/setup-db'
import * as Constants from '../../../src/utils/constants'
import { Types } from 'mongoose'
import { getVerification, requestVerification } from '../../../src/services/v1/verification-request'
import { getUser } from '../../fixtures/utils'
import User from '../../../src/models/user'
import sgMail from '@sendgrid/mail'

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
})
