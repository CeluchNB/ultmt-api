import express, { Request, Response, Application } from 'express'

const app: Application = express()
const PORT = process.env.PORT || 3000

app.get('/', (req: Request, res: Response) => {
    res.send('Initial API response')
})

app.listen(PORT, (): void => {
    return console.log(`Server started on port: ${PORT}`)
})
