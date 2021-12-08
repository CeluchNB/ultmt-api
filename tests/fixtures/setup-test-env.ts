/* eslint-disable @typescript-eslint/no-var-requires */
// const path = require('path')
// const dotenv = require('dotenv')
import path from 'path'
import dotenv from 'dotenv'

export default async () => {
    dotenv.config({ path: path.resolve(__dirname, '../config/.env') })
}
