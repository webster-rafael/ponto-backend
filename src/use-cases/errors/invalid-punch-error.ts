export class InvalidPunchError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "InvalidPunchError"
    }
}
