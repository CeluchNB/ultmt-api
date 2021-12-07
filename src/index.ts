import app from './app'

const PORT = process.env.PORT || 3000

app.listen(PORT, (): void => {
    return console.log(`Server started on port: ${PORT}`)
})
