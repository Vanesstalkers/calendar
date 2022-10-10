FROM node:16.13.1-alpine

RUN apk update && apk add --no-cache git

WORKDIR /usr/backend

# Зависимости обновятся только при изменении package.json или package-lock.json.
# package.json нужен только для npm <7. Когда обновим версию ноды до >=14.17,
# можно его отсюда убрать и ставить зависимости только при обновлении
# package-lock.json
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.build.json ./
RUN npm ci

# Добавляем все файлы в контейнер
COPY . .

CMD ["sh", "-c", "node -v; npm -v; npx sequelize-cli init; npm run build; npx sequelize-cli db:migrate; npm run start:prod"]

