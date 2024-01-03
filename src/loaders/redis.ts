import { createClient } from 'redis'

export const client = createClient({ url: process.env.REDIS_URL })

export async function connectRedis() {
    if (!client.isOpen) {
        await client.connect()
    }
}

export async function closeRedis() {
    if (client.isOpen) {
        client.quit()
    }
}
