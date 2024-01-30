# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY ["package.json", "yarn.lock", "./"]

RUN yarn install

COPY . /app

CMD ["yarn", "start"]