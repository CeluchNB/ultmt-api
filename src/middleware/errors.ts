import { ErrorRequestHandler } from 'express'
import * as Constants from '../utils/constants'
import { createExpressErrorObject } from '../utils/utils'

export const userErrorResponse = (error: string): { message: string; code: number } => {
    if (error.includes(Constants.INVALID_EMAIL)) {
        return createExpressErrorObject(Constants.INVALID_EMAIL, 400)
    } else if (error.includes(Constants.INVALID_PASSWORD)) {
        return createExpressErrorObject(Constants.INVALID_PASSWORD, 400)
    } else if (error.includes(Constants.INVALID_USERNAME)) {
        return createExpressErrorObject(Constants.INVALID_USERNAME, 400)
    } else if (error.includes('required.')) {
        return createExpressErrorObject(Constants.MISSING_FIELDS, 400)
    } else if (error.includes(Constants.UNABLE_TO_GENERATE_TOKEN)) {
        return createExpressErrorObject(Constants.UNABLE_TO_GENERATE_TOKEN, 500)
    } else {
        return createExpressErrorObject(Constants.UNABLE_TO_CREATE_USER, 500)
    }
}

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
    if (err) {
        const { message, code } = userErrorResponse(err.toString())
        res.status(code).json({ message })
    }
    next()
}
