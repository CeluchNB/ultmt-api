import winston from 'winston'
import { LoggingWinston } from '@google-cloud/logging-winston'
import { Request, Response, NextFunction } from 'express'
import { v4 as uuid } from 'uuid'
import { ApiError } from '../types'

interface UniqueRequest extends Request {
    uuid: string
}

export const Logger = () => {
    const projectId = process.env.GCP_PROJECT_ID
    const serviceId = 'ultmt-api'
    const loggingWinston = new LoggingWinston({
        projectId,
        logName: serviceId,
        serviceContext: { service: serviceId },
        defaultCallback: (error) => {
            if (error) console.log('received logging error')
        },
    })
    const logger = winston.createLogger({
        level: 'http',
        format: winston.format.json(),
        transports: [loggingWinston],
    })

    const requestMiddleware = (req: UniqueRequest, res: Response, next: NextFunction) => {
        req.uuid = uuid()
        logger.info(`${req.url} - ${req.uuid}`, {
            httpRequest: {
                status: res.statusCode,
                requestUrl: req.url,
                requestMethod: req.method,
            },
            body: req.body,
            params: req.params,
            query: req.query,
        })
        next()
    }

    const errorMiddleware = (err: ApiError, req: UniqueRequest, res: Response, next: NextFunction) => {
        logger.error(`${req.url} - ${req.uuid}`, {
            httpRequest: {
                status: res.statusCode,
                requestUrl: req.url,
                requestMethod: req.method,
            },
            errorMessage: err.message,
        })
        next(err)
    }

    const logError = (error: unknown) => {
        logger.error(error)
    }

    const logInfo = (result: unknown) => {
        logger.info(result)
    }

    return {
        requestMiddleware,
        errorMiddleware,
        logError,
        logInfo,
    }
}

export type UltmtLogger = ReturnType<typeof Logger>
