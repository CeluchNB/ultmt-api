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
    } else if (error.includes(Constants.UNAUTHORIZED_MANAGER)) {
        return createExpressErrorObject(Constants.UNAUTHORIZED_MANAGER, 401)
    } else if (error.includes(Constants.PLAYER_ALREADY_REQUESTED)) {
        return createExpressErrorObject(Constants.PLAYER_ALREADY_REQUESTED, 400)
    } else if (error.includes(Constants.PLAYER_ALREADY_ROSTERED)) {
        return createExpressErrorObject(Constants.PLAYER_ALREADY_ROSTERED, 400)
    } else if (error.includes(Constants.TEAM_ALREADY_REQUESTED)) {
        return createExpressErrorObject(Constants.TEAM_ALREADY_REQUESTED, 400)
    } else if (error.includes(Constants.TEAM_ALREADY_JOINED)) {
        return createExpressErrorObject(Constants.TEAM_ALREADY_JOINED, 400)
    } else if (error.includes(Constants.UNABLE_TO_FIND_REQUEST)) {
        return createExpressErrorObject(Constants.UNABLE_TO_FIND_REQUEST, 404)
    } else if (error.includes(Constants.PLAYER_NOT_ON_TEAM)) {
        return createExpressErrorObject(Constants.PLAYER_NOT_ON_TEAM, 400)
    } else if (error.includes(Constants.TEAM_NOT_IN_PLAYER_LIST)) {
        return createExpressErrorObject(Constants.TEAM_NOT_IN_PLAYER_LIST, 400)
    } else if (error.includes(Constants.NOT_ALLOWED_TO_RESPOND)) {
        return createExpressErrorObject(Constants.NOT_ALLOWED_TO_RESPOND, 400)
    } else if (error.includes(Constants.REQUEST_ALREADY_RESOLVED)) {
        return createExpressErrorObject(Constants.REQUEST_ALREADY_RESOLVED, 400)
    } else if (error.includes(Constants.REQUEST_NOT_IN_LIST)) {
        return createExpressErrorObject(Constants.REQUEST_NOT_IN_LIST, 400)
    } else if (error.includes(Constants.SEASON_START_ERROR)) {
        return createExpressErrorObject(Constants.SEASON_START_ERROR, 400)
    } else if (error.includes(Constants.NOT_ACCEPTING_REQUESTS)) {
        return createExpressErrorObject(Constants.NOT_ACCEPTING_REQUESTS, 400)
    } else if (error.includes(Constants.NOT_ENOUGH_CHARACTERS)) {
        return createExpressErrorObject(Constants.NOT_ENOUGH_CHARACTERS, 400)
    } else if (error.includes(Constants.UNAUTHORIZED_TO_VIEW_REQUEST)) {
        return createExpressErrorObject(Constants.UNAUTHORIZED_TO_VIEW_REQUEST, 401)
    } else if (error.includes(Constants.DUPLICATE_TEAM_NAME)) {
        return createExpressErrorObject(Constants.DUPLICATE_TEAM_NAME, 400)
    } else if (error.includes(Constants.DUPLICATE_EMAIL)) {
        return createExpressErrorObject(Constants.DUPLICATE_EMAIL, 400)
    } else if (error.includes(Constants.DUPLICATE_USERNAME)) {
        return createExpressErrorObject(Constants.DUPLICATE_USERNAME, 400)
    } else if (error.includes(Constants.NON_ALPHANUM_TEAM_NAME)) {
        return createExpressErrorObject(Constants.NON_ALPHANUM_TEAM_NAME, 400)
    } else if (error.includes(Constants.USER_ALREADY_MANAGES_TEAM)) {
        return createExpressErrorObject(Constants.USER_ALREADY_MANAGES_TEAM, 400)
    } else if (error.includes(Constants.USER_IS_ONLY_MANAGER)) {
        return createExpressErrorObject(Constants.USER_IS_ONLY_MANAGER, 400)
    } else if (error.includes(Constants.INVALID_SEASON_DATE)) {
        return createExpressErrorObject(Constants.INVALID_SEASON_DATE, 400)
    } else if (error.includes(Constants.NAME_TOO_LONG)) {
        return createExpressErrorObject(Constants.NAME_TOO_LONG, 400)
    } else if (error.includes(Constants.UNABLE_TO_SEND_EMAIL)) {
        return createExpressErrorObject(Constants.UNABLE_TO_SEND_EMAIL, 500)
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
