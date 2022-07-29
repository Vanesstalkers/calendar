# Установка и запуск
## Установка
```bash
# install
$ npm install
```
\+ пример конфига в config.example (переименовать в config.ts и заполнить)
\+ создать БД
```bash
# install db
npx sequelize-cli db:migrate
```

## Запуск
```bash
# run development
$ npm run start:dev
# run production mode
$ npm run start:prod
```
# Комментарии по разработке
## Работа с БД
Все таблицы БД описываем и складываем отдельными файлами в /src/entity.
Заливаем обновления в БД миграциями (синхронизация БД через Sequalize должна быть отключена).

## Работа с ошибками
Универсальный обработчик ошибок: /src/exception.filter.ts.
Если нужен конкретный код ответа сервера + msg, то добавляем исключение в knownException.

## Данные сессии
/src/session/session.interface.ts - "публичные" данные (хранятся непосредственно в cookies в зашифрованном виде)
/src/session/storage.interface.ts - приватные данные (хранятся во внутреннем "быстром" хранилище)