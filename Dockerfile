FROM node:16.13.1-alpine

RUN apk update && apk add --no-cache git

WORKDIR /usr/backend

# Добавляем все файлы в контейнер
COPY . .

# Зависимости обновятся только при изменении package.json или package-lock.json.
# package.json нужен только для npm <7. Когда обновим версию ноды до >=14.17,
# можно его отсюда убрать и ставить зависимости только при обновлении
# package-lock.json
RUN npm ci
RUN npx sequelize-cli init
RUN npm run build


CMD ["sh", "-c", "node -v; npm -v; npx sequelize-cli db:migrate; npm run start:prod"]

