# ultmt-api
API for The Ultmt App

[![codecov](https://codecov.io/gh/CeluchNB/ultmt-api/branch/main/graph/badge.svg?token=5TZJ3CJOJ9)](https://codecov.io/gh/CeluchNB/ultmt-api)

## Installation Directions
- Install and run [MongoDB](https://www.mongodb.com/try/download/community) locally
- Clone repository
- Run `yarn` to install dependencies
- Depending on OS add `mongodb://127.0.0.1/27017` to `src/config/.env` && `tests/config/.env`
- `yarn dev` starts the app with nodemon for development
- `yarn start` starts the app
- `yarn test` runs tests

## Developing with Docker (Recommended)
- Clone repository
- Download [Docker Desktop](https://www.docker.com/products/docker-desktop/)
### Without VS Code**
- Run command `docker compose -f docker-compose.dev.yml up --build`
- Docker starts the app on in a container `localhost:3000` connected to a mongo instance on port `27017`
- Start coding!
- To run tests, open a shell from Docker Container/Apps Dashboard and run `yarn test`
### In VS Code
- Press `CMD` + `shift` + `p`
- Select "Open Folder in Container..."
- App is running on `localhost:3000`
- Start coding!
- To run tests, open a terminal in VS code and run `yarn test`