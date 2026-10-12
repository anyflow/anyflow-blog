FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY .eleventy.js ./
COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY src/ ./src/
COPY .cache/blog/ ./.cache/blog/
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/_site /usr/share/nginx/html
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
