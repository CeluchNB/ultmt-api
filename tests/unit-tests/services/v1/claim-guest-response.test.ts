import * as Constants from '../../../../src/utils/constants'
import ClaimGuestRequest from '../../../../src/models/claim-guest-request'
import ClaimGuestRequestServices from '../../../../src/services/v1/claim-guest-request'
import User from '../../../../src/models/user'
import { resetDatabase, saveUsers, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Status } from '../../../../src/types'
import { anonId } from '../../../fixtures/utils'

const services = new ClaimGuestRequestServices(ClaimGuestRequest, User)

beforeAll(async () => {
    await setUpDatabase()
})

beforeEach(async () => {
    await saveUsers()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll((done) => {
    tearDownDatabase()
    done()
})

describe('ClaimGuestRequestServices', () => {
    describe('createClaimGuestRequest', () => {
        it('succeeds when it should', async () => {
            const [user, guest] = await User.find()
            guest.guest = true
            await guest.save()

            const result = await services.createClaimGuestRequest(user._id.toHexString(), guest._id.toHexString())
            expect(result).toMatchObject({
                userId: user._id,
                guestId: guest._id,
                status: Status.Pending,
            })

            const requests = await ClaimGuestRequest.find()
            expect(requests.length).toBe(1)
            expect(requests[0]).toMatchObject({
                userId: user._id,
                guestId: guest._id,
                status: Status.Pending,
            })
        })

        it('fails with unfound real user', async () => {
            const [guest] = await User.find()
            await expect(services.createClaimGuestRequest(anonId, guest._id.toHexString())).rejects.toThrow(
                Constants.UNABLE_TO_FIND_USER,
            )
        })

        it('fails with unfound guest', async () => {
            const [user] = await User.find()
            await expect(services.createClaimGuestRequest(user._id.toHexString(), anonId)).rejects.toThrow(
                Constants.UNABLE_TO_FIND_USER,
            )
        })

        it('fails with non-guest', async () => {
            const [user, guest] = await User.find()

            await expect(
                services.createClaimGuestRequest(user._id.toHexString(), guest._id.toHexString()),
            ).rejects.toThrow(Constants.USER_IS_NOT_A_GUEST)
        })
    })
})
