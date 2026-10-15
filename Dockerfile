FROM node:22-alpine AS comments-api
RUN apk add --no-cache git openssh-client
WORKDIR /app
COPY lib/comments/ ./lib/comments/
COPY scripts/comments-server.js ./scripts/comments-server.js
COPY _site/comments/catalog.json ./_preview/comments/catalog.json
ENV HOST=0.0.0.0 PORT=3000 COMMENTS_PREVIEW=false
USER node
CMD ["node", "scripts/comments-server.js"]

FROM nginx:alpine
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY _site /usr/share/nginx/html
COPY deployment/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
