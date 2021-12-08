import { connect } from 'mongoose'

export async function connectDatabase() {
    const url = process.env.MONGOOSE_URL as string
    await connect(url)
        .then(() => {
            console.log('Connected to Database')
        })
        .catch((error) => {
            console.log('Error connecting to Database', error)
        })
}
