import request from 'supertest'
import app from '../../../src/app'
import { client } from '../../../src/loaders/redis'

afterAll(() => {
    if (client.isOpen) {
        client.quit()
    }
})

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
