import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import User from '../../../src/models/user'
import { generateGuestData } from '../../../src/utils/team'
import { Types } from 'mongoose'

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

describe('Team utils', () => {
    describe('generateGuestData', () => {
        it('generates data with just first and last name', async () => {
            const guestData = { firstName: 'First', lastName: 'Last' }
            const result = await generateGuestData(guestData, User)
            expect(result).toMatchObject(guestData)
            expect(result.password).toBeDefined()
        })

        it('generates guest data with id and username', async () => {
            const _id = new Types.ObjectId().toHexString()
            const username = `guest${Date.now()}`
            const guestData = { _id, username, firstName: 'First', lastName: 'Last' }

            const result = await generateGuestData(guestData, User)
            expect(result).toMatchObject({
                username,
                firstName: 'First',
                lastName: 'Last',
            })
            expect(result._id.toHexString()).toBe(_id)
            expect(result.password).toBeDefined()
        })

        it('handles previously used username', async () => {
            await User.create({
                firstName: 'First',
                lastName: 'Last',
                username: 'guest',
                email: 'guest1234@theultmtapp.com',
                password: 'Pass1234!',
            })

            const _id = new Types.ObjectId().toHexString()
            const guestData = { _id, username: 'guest', firstName: 'First', lastName: 'Last' }

            const result = await generateGuestData(guestData, User)
            expect(result).toMatchObject({
                firstName: 'First',
                lastName: 'Last',
            })
            expect(result.username).not.toBe('guest')
            expect(result._id.toHexString()).toBe(_id)
            expect(result.password).toBeDefined()
        })

        it('handles previously used email', async () => {
            await User.create({
                firstName: 'First',
                lastName: 'Last',
                username: 'guest1234',
                email: 'guest@theultmtapp.com',
                password: 'Pass1234!',
            })

            const _id = new Types.ObjectId().toHexString()
            const guestData = { _id, username: 'guest', firstName: 'First', lastName: 'Last' }

            const result = await generateGuestData(guestData, User)
            expect(result).toMatchObject({
                firstName: 'First',
                lastName: 'Last',
            })
            expect(result.username).not.toBe('guest1234')
            expect(result.email).not.toBe('guest@theultmtapp.com')
            expect(result._id.toHexString()).toBe(_id)
            expect(result.password).toBeDefined()
        })
    })
})
