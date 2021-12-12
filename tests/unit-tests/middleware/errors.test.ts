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
        expect(userErrorResponse('Random error text')).toEqual(
            createExpressErrorObject(Constants.UNABLE_TO_CREATE_USER, 500),
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
