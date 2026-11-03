FROM node:22.22.2-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:1.28-alpine
LABEL org.opencontainers.image.source="https://github.com/wppconnect-team/wppconnect-manager"
RUN apk add --no-cache jq libcap \
 && setcap cap_net_bind_service=+ep /usr/sbin/nginx \
 && chown -R nginx:nginx /var/cache/nginx /run /etc/nginx/conf.d \
 && touch /run/nginx.pid && chown nginx:nginx /run/nginx.pid
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-manager-config.sh /docker-entrypoint.d/40-manager-config.sh
RUN chmod +x /docker-entrypoint.d/40-manager-config.sh \
 && chown nginx:nginx /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/manager
RUN chown -R nginx:nginx /usr/share/nginx/html/manager
USER nginx
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/manager/ || exit 1
