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
    } else if (error.includes(Constants.UNABLE_TO_FIND_USER)) {
        return createExpressErrorObject(Constants.UNABLE_TO_FIND_USER, 404)
    } else if (error.includes(Constants.UNABLE_TO_FIND_TEAM)) {
        return createExpressErrorObject(Constants.UNABLE_TO_FIND_TEAM, 404)
    } else if (error.includes(Constants.UNABLE_TO_CREATE_USER)) {
        return createExpressErrorObject(Constants.UNABLE_TO_CREATE_USER, 500)
    } else if (error.includes(Constants.UNAUTHORIZED_TO_GET_TEAM)) {
        return createExpressErrorObject(Constants.UNAUTHORIZED_TO_GET_TEAM, 401)
    } else {
        return createExpressErrorObject(Constants.GENERIC_ERROR, 500)
    }
}

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
    if (err) {
        const { message, code } = userErrorResponse(err.toString())
        res.status(code).json({ message })
    }
    next()
}
