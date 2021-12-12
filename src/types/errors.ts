export class ApiError extends Error {
    code: number

    constructor(name: string, code: number) {
        super(name)
        this.code = code
    }
}
