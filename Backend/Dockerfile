FROM node:20-alpine AS builder

WORKDIR /app

ARG APP_NAME

COPY package*.json ./
RUN npm install

COPY . .


RUN npx nest build ${APP_NAME}

ENV APP=$APP_NAME
CMD node dist/apps/${APP}/main.js