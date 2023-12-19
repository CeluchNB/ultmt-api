import * as Constants from '../../../../src/utils/constants'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'
import { createTeamDesignation, getDesignations } from '../../../../src/services/v1/team-designation'
import User from '../../../../src/models/user'
import { getUser } from '../../../fixtures/utils'
import TeamDesignation from '../../../../src/models/team-designation'

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

describe('Team Designation Services', () => {
    describe('create designation', () => {
        it('creates designation that does not exist', async () => {
            const user = await User.create({ ...getUser(), email: 'noah.celuch@gmail.com' })

            const data = {
                description: 'Classic',
                abbreviation: 'C',
            }

            const result = await createTeamDesignation(user._id.toHexString(), data)

            expect(result).toMatchObject(data)

            const designationRecord = await TeamDesignation.findOne({})
            expect(designationRecord).toMatchObject(data)
        })

        it('finds designation that already exists', async () => {
            const user = await User.create({ ...getUser(), email: 'noah.celuch@gmail.com' })

            const data = {
                description: 'Classic',
                abbreviation: 'C',
            }

            await TeamDesignation.create(data)

            const result = await createTeamDesignation(user._id.toHexString(), data)

            expect(result).toMatchObject(data)

            const designationRecords = await TeamDesignation.find({})
            expect(designationRecords.length).toBe(1)
            expect(designationRecords[0]).toMatchObject(data)
        })

        it('fails if user is not a manager', async () => {
            const user = await User.create(getUser())

            const data = {
                description: 'Classic',
                abbreviation: 'C',
            }

            await expect(createTeamDesignation(user._id.toHexString(), data)).rejects.toThrow(
                Constants.UNAUTHORIZED_ADMIN,
            )
        })
    })

    describe('get all designations', () => {
        it('returns designations', async () => {
            const classicData = { description: 'Classic', abbreviation: 'C' }
            const selectData = { description: 'Select', abbreviation: 'S' }

            await TeamDesignation.create(classicData)
            await TeamDesignation.create(selectData)

            const designations = await getDesignations()
            expect(designations.length).toBe(2)

            expect(designations[0]).toMatchObject(classicData)
            expect(designations[1]).toMatchObject(selectData)
        })
    })
})
