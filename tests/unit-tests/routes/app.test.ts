import request from 'supertest'
import app from '../../../src/app'

jest.mock('node-cron', () => {
    return {
        schedule: jest.fn(),
    }
})

describe('base path', () => {
    it('should return a message', async () => {
        const response = await request(app).get('/ultmt').send().expect(200)

        expect(response.body.message).toBeDefined()
    })
})
