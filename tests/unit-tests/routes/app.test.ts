import request from 'supertest'
import app from '../../../src/app'

describe('base path', () => {
    it('should return a message', async () => {
        const response = await request(app).get('/').send().expect(200)

        expect(response.body.message).toBeDefined()
    })
})
