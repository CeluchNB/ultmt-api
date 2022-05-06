import * as winston from 'winston'
import * as expressWinston from 'express-winston'
import 'winston-daily-rotate-file'

const dailyRotateTransport = new winston.transports.DailyRotateFile({
    dirname: 'logs',
    filename: 'log-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
})

const logger = expressWinston.logger({
    transports: [dailyRotateTransport],
    format: winston.format.combine(winston.format.colorize(), winston.format.json()),
    meta: true,
    expressFormat: true,
    colorize: true,
})

export default logger
