export const createExpressErrorObject = (message: string, code: number): { message: string; code: number } => {
    return { message, code }
}
