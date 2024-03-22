import { parseBoolean, findByIdOrThrow } from '../../../src/utils/utils'
import { IUser } from '../../../src/types'
import User from '../../../src/models/user'
import { resetDatabase, saveUsers, setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'
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

describe('test parse boolean', () => {
    it('should parse true', () => {
        const result = parseBoolean('true')
        expect(result).toBe(true)
    })

    it('should parse false', () => {
        const result = parseBoolean('false')
        expect(result).toBe(false)
    })

    it('should parse undefined', () => {
        const result = parseBoolean('')
        expect(result).toBeUndefined()
    })
})

describe('test findByIdOrThrow', () => {
    beforeEach(async () => {
        await saveUsers()
    })

    it('returns model when it exists', async () => {
        const user = await User.findOne()
        const result = await findByIdOrThrow<IUser>(user!._id, User, 'test error')
        expect(result).toMatchObject(user!)
    })

    it('throws error when missing', async () => {
        await expect(findByIdOrThrow<IUser>(new Types.ObjectId(), User, 'test error')).rejects.toThrow('test error')
    })
})
