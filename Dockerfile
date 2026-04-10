FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY .eleventy.js ./
COPY src/ ./src/
RUN npx eleventy

FROM nginx:alpine
COPY --from=build /app/_site /usr/share/nginx/html
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
