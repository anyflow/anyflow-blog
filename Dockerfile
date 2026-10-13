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

FROM node:22-alpine AS comments-api
RUN apk add --no-cache git openssh-client
WORKDIR /app
COPY lib/comments/ ./lib/comments/
COPY scripts/comments-server.js ./scripts/comments-server.js
COPY --from=build /app/_site/comments/catalog.json ./_preview/comments/catalog.json
ENV HOST=0.0.0.0 PORT=3000 COMMENTS_PREVIEW=false
USER node
CMD ["node", "scripts/comments-server.js"]

FROM nginx:alpine
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY --from=build /app/_site /usr/share/nginx/html
COPY deployment/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
