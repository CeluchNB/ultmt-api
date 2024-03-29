/* eslint-disable @typescript-eslint/ban-ts-comment */
import { userErrorResponse, errorMiddleware } from '../../../src/middleware/errors'
import { createExpressErrorObject } from '../../../src/utils/utils'
import * as Constants from '../../../src/utils/constants'
import { Response, Request } from 'express'

describe('test user error response parsing', () => {
    it('with invalid email', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.INVALID_EMAIL} extra details`)).toEqual(
            createExpressErrorObject(Constants.INVALID_EMAIL, 400),
        )
    })

    it('with invalid password', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.INVALID_PASSWORD} extra details`)).toEqual(
            createExpressErrorObject(Constants.INVALID_PASSWORD, 400),
        )
    })

    it('with invalid username', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.INVALID_USERNAME} extra details`)).toEqual(
            createExpressErrorObject(Constants.INVALID_USERNAME, 400),
        )
    })

    it('with missing fields', () => {
        expect(userErrorResponse("Error: 'password' is required.")).toEqual(
            createExpressErrorObject(Constants.MISSING_FIELDS, 400),
        )
    })

    it('with bad auth token', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_GENERATE_TOKEN} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_GENERATE_TOKEN, 500),
        )
    })

    it('with general error', () => {
        expect(userErrorResponse('Random error text')).toEqual(createExpressErrorObject(Constants.GENERIC_ERROR, 500))
    })

    it('with not found user', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_FIND_USER} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_FIND_USER, 404),
        )
    })

    it('with not found team', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_FIND_TEAM} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_FIND_TEAM, 404),
        )
    })

    it('with unauthorized team error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNAUTHORIZED_TO_GET_TEAM} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNAUTHORIZED_TO_GET_TEAM, 401),
        )
    })

    it('with unauthorized team requested', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNAUTHORIZED_MANAGER} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNAUTHORIZED_MANAGER, 401),
        )
    })

    it('with player already rostered error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.PLAYER_ALREADY_ROSTERED} extra details`)).toEqual(
            createExpressErrorObject(Constants.PLAYER_ALREADY_ROSTERED, 400),
        )
    })

    it('with player already requested error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.PLAYER_ALREADY_REQUESTED} extra details`)).toEqual(
            createExpressErrorObject(Constants.PLAYER_ALREADY_REQUESTED, 400),
        )
    })

    it('with team already joined error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.TEAM_ALREADY_JOINED} extra details`)).toEqual(
            createExpressErrorObject(Constants.TEAM_ALREADY_JOINED, 400),
        )
    })

    it('with team already requested error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.TEAM_ALREADY_REQUESTED} extra details`)).toEqual(
            createExpressErrorObject(Constants.TEAM_ALREADY_REQUESTED, 400),
        )
    })

    it('with create user error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_CREATE_USER} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_CREATE_USER, 500),
        )
    })

    it('with not found roster request', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_FIND_REQUEST} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_FIND_REQUEST, 404),
        )
    })

    it('with player not on team', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.PLAYER_NOT_ON_TEAM} extra details`)).toEqual(
            createExpressErrorObject(Constants.PLAYER_NOT_ON_TEAM, 400),
        )
    })

    it('with team not on player list', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.TEAM_NOT_IN_PLAYER_LIST} extra details`)).toEqual(
            createExpressErrorObject(Constants.TEAM_NOT_IN_PLAYER_LIST, 400),
        )
    })

    it('with wrong party responding', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.NOT_ALLOWED_TO_RESPOND} extra details`)).toEqual(
            createExpressErrorObject(Constants.NOT_ALLOWED_TO_RESPOND, 400),
        )
    })

    it('with request status not pending', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.REQUEST_ALREADY_RESOLVED} extra details`)).toEqual(
            createExpressErrorObject(Constants.REQUEST_ALREADY_RESOLVED, 400),
        )
    })

    it('with request not in list', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.REQUEST_NOT_IN_LIST} extra details`)).toEqual(
            createExpressErrorObject(Constants.REQUEST_NOT_IN_LIST, 400),
        )
    })

    it('with season start error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.SEASON_START_ERROR} extra details`)).toEqual(
            createExpressErrorObject(Constants.SEASON_START_ERROR, 400),
        )
    })

    it('with not accepting requests', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.NOT_ACCEPTING_REQUESTS} extra details`)).toEqual(
            createExpressErrorObject(Constants.NOT_ACCEPTING_REQUESTS, 400),
        )
    })

    it('with not enough characters', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.NOT_ENOUGH_CHARACTERS} extra details`)).toEqual(
            createExpressErrorObject(Constants.NOT_ENOUGH_CHARACTERS, 400),
        )
    })

    it('with unauthorized request requester', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNAUTHORIZED_TO_VIEW_REQUEST} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNAUTHORIZED_TO_VIEW_REQUEST, 401),
        )
    })

    it('with duplicate team name', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.DUPLICATE_TEAM_NAME} extra details`)).toEqual(
            createExpressErrorObject(Constants.DUPLICATE_TEAM_NAME, 400),
        )
    })

    it('with duplicate username', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.DUPLICATE_USERNAME} extra details`)).toEqual(
            createExpressErrorObject(Constants.DUPLICATE_USERNAME, 400),
        )
    })

    it('with duplicate email', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.DUPLICATE_EMAIL} extra details`)).toEqual(
            createExpressErrorObject(Constants.DUPLICATE_EMAIL, 400),
        )
    })

    it('with non alphanumeric team name', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.NON_ALPHANUM_TEAM_NAME} extra details`)).toEqual(
            createExpressErrorObject(Constants.NON_ALPHANUM_TEAM_NAME, 400),
        )
    })

    it('with user already manager', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.USER_ALREADY_MANAGES_TEAM} extra details`)).toEqual(
            createExpressErrorObject(Constants.USER_ALREADY_MANAGES_TEAM, 400),
        )
    })

    it('with user as only manager', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.USER_IS_ONLY_MANAGER} extra details`)).toEqual(
            createExpressErrorObject(Constants.USER_IS_ONLY_MANAGER, 400),
        )
    })

    it('with invalid date error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.INVALID_SEASON_DATE} extra details`)).toEqual(
            createExpressErrorObject(Constants.INVALID_SEASON_DATE, 400),
        )
    })

    it('with name too long error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.NAME_TOO_LONG} extra details`)).toEqual(
            createExpressErrorObject(Constants.NAME_TOO_LONG, 400),
        )
    })

    it('with unable to send email error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_SEND_EMAIL} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_SEND_EMAIL, 500),
        )
    })

    it('with invalid passcode error', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.INVALID_PASSCODE} extra details`)).toEqual(
            createExpressErrorObject(Constants.INVALID_PASSCODE, 400),
        )
    })

    it('with invalid token', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_VERIFY_TOKEN} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_VERIFY_TOKEN, 401),
        )
    })

    it('with invalid source type', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.INVALID_SOURCE_TYPE} extra details`)).toEqual(
            createExpressErrorObject(Constants.INVALID_SOURCE_TYPE, 400),
        )
    })

    it('with unable to find verification', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNABLE_TO_FIND_VERIFICATION} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_FIND_VERIFICATION, 404),
        )
    })

    it('with unauthorized to verify request', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNAUTHORIZED_TO_VERIFY} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNAUTHORIZED_TO_VERIFY, 401),
        )
    })

    it('with invalid response type', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.INVALID_RESPONSE_TYPE} extra details`)).toEqual(
            createExpressErrorObject(Constants.INVALID_RESPONSE_TYPE, 400),
        )
    })

    it('with unauthorized admin', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.UNAUTHORIZED_ADMIN} extra details`)).toEqual(
            createExpressErrorObject(Constants.UNAUTHORIZED_ADMIN, 401),
        )
    })

    it('with non-guest user', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.USER_IS_NOT_A_GUEST} extra details`)).toEqual(
            createExpressErrorObject(Constants.USER_IS_NOT_A_GUEST, 400),
        )
    })

    it('with claim guest request already created', () => {
        expect(userErrorResponse(`Extra Error: ${Constants.CLAIM_GUEST_REQUEST_ALREADY_EXISTS} extra details`)).toEqual(
            createExpressErrorObject(Constants.CLAIM_GUEST_REQUEST_ALREADY_EXISTS, 400),
        )
    })
})

describe('test middleware', () => {
    it('with error', () => {
        // @ts-ignore
        const req: Request = {}

        // @ts-ignore
        const res: Response = {}
        res.status = jest.fn().mockReturnValue(res)
        res.json = jest.fn()

        errorMiddleware('Error', req, res, () => {
            // do nothing
        })

        expect(res.status).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500)
    })

    it('without error', () => {
        // @ts-ignore
        const req: Request = {}

        // @ts-ignore
        const res: Response = {}
        res.status = jest.fn().mockReturnValue(res)
        res.json = jest.fn()

        errorMiddleware(undefined, req, res, () => {
            // do nothing
        })

        expect(res.status).toHaveBeenCalledTimes(0)
    })
})
