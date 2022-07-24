## Установка и запуск

```bash
# install
$ npm install
# run development
$ npm run start:dev
# run production mode
$ npm run start:prod
```


## Работа с БД

Все таблицы БД описываем и складываем отдельными файлами в /src/entity.
Заливаем обновления в БД миграциями (синхронизация БД через TypeORM отключена):
```bash
# create migration
$ npx typeorm-ts-node-esm migration:generate migrations/test -d ./src/migration-data-source.ts
# run migration
$ npx typeorm-ts-node-esm migration:run -d ./src/migration-data-source.ts
```

## Работа с ошибками

Универсальный обработчик ошибок: /src/exception.filter.ts.
Если нужен конкретный код ответа сервера + msg, то добавляем исключение в knownException.

## Данные сессии

/src/session/session.interface.ts - "публичные" данные (хранятся непосредственно в cookies в зашифрованном виде)
/src/session/storage.interface.ts - приватные данные (хранятся во внутреннем "быстром" хранилище)