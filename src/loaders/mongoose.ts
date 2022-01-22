import { connect } from 'mongoose'

export async function connectDatabase() {
    const url = process.env.MONGOOSE_URL as string
    await connect(url, { autoIndex: false })
}
