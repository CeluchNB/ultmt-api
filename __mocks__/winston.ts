export default {
    transports: {
        Console: jest.fn(),
    },
    format: {
        json: jest.fn(),
    },
    createLogger: jest.fn().mockReturnValue({
        http: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    }),
}
