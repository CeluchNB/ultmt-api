import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { setUpDatabase, resetDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getUser } from '../../../fixtures/utils'
import { client } from '../../../../src/loaders/redis'
import User from '../../../../src/models/user'
import TeamDesignation from '../../../../src/models/team-designation'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(() => {
    tearDownDatabase()
    if (client.isOpen) {
        client.quit()
    }
})

describe('Team Designation Endpoints', () => {
    describe('POST /team-designation', () => {
        it('with valid data', async () => {
            const user = await User.create({ ...getUser(), email: 'noah.celuch@gmail.com' })
            const token = await user.generateAuthToken()

            const response = await request(app)
                .post('/api/v1/team-designation')
                .set('Authorization', `Bearer ${token}`)
                .send({ designationData: { description: 'Classic', abbreviation: 'C' } })
                .expect(201)

            expect(response.body.designation.description).toBe('Classic')
            expect(response.body.designation.abbreviation).toBe('C')
        })

        it('with error state', async () => {
            const user = await User.create({ ...getUser() })
            const token = await user.generateAuthToken()

            const response = await request(app)
                .post('/api/v1/team-designation')
                .set('Authorization', `Bearer ${token}`)
                .send({ designationData: { description: 'Classic', abbreviation: 'C' } })
                .expect(401)

            expect(response.body.message).toBe(Constants.UNAUTHORIZED_ADMIN)
        })
    })

    describe('GET /team-designations', () => {
        it('with valid data', async () => {
            const classicData = { description: 'Classic', abbreviation: 'C' }
            const selectData = { description: 'Select', abbreviation: 'S' }
            await TeamDesignation.create(classicData)
            await TeamDesignation.create(selectData)

            const response = await request(app).get('/api/v1/team-designations').expect(200)

            expect(response.body.designations).toHaveLength(2)
            expect(response.body.designations[0]).toMatchObject(classicData)
            expect(response.body.designations[1]).toMatchObject(selectData)
        })
    })
})
