FROM barichello/godot-ci:4.7 AS builder

WORKDIR /project

COPY . .

RUN mkdir -p /project/dist/web \
    && godot --headless --export-release "Web" /project/dist/web/index.html

FROM nginx:1.31-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /project/dist/web/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
