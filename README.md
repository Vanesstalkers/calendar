# Установка и запуск
## Установка
```bash
$ npm install
```
Далее, создаем БД:
```bash
postgres=$ CREATE DATABASE calendar
```
Далее, напоняем актуальную структуру БД из миграций:
```bash
$ npx sequelize-cli db:migrate
```
Переменные среды (для CI/CD):
```js
// порт ноды
process.env.PORT || 3000
// postgres
process.env.PG_HOST
process.env.PG_USER
process.env.PG_PASS
// redis
process.env.REDIS_HOST
process.env.REDIS_PORT
// mongo (логи)
process.env.MONGO_URI || 'mongodb://127.0.0.1'
// sms-провайдер
process.env.GREENSMS_URL
process.env.GREENSMS_USER
process.env.GREENSMS_PASS
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
Все запросы к БД (кроме миграций) делаются через функцию-декоратор utils.queryDB (ловит ошибки и логирует все запросы).
```js
await this.utils.queryDB([sql-запрос], [стандартные options от sequelize])
```
Все запросы на запись делаются внутри функции-декоратора utils.withDBTransaction (инициирует/завершает транзакцию). Пример:
```js
  async create(taskData: taskFullDTO, transaction?: Transaction) {
    return await this.utils.withDBTransaction(transaction, async (transaction) => {
        ...
    });
  });
```
### Обновление структуры БД
Заливаем обновления в БД миграциями (синхронизация БД через Sequalize должна быть отключена).

## Работа с ошибками
Универсальный обработчик ошибок: /src/filters/exception.filter.ts.
Если нужен конкретный код ответа сервера + msg, то добавляем исключение в knownException.

## Данные сессии (быстрое хранилище)
Файл со структурами данных: /src/session/session.dto.ts
- sessionDTO - "публичные" данные (хранятся непосредственно в cookies в зашифрованном виде)
- sessionStorageDTO - приватные данные (хранятся во внутреннем "быстром" хранилище)

## Структура контроллеров и сервисов
- в контроллерах только валидация данных и вызовы сервисов
- работа с БД только в сервисах
- базовые методы для работы с БД для всех модулей лежат в /src/xxx/xxx.service.ts 
- если в сервисе нужна транзакция (больше одного запроса к БД), то выделяем его в отдельных файл

## Логирование
Данные хранятся в MongoDB. Вызов можно добавить в любом месте, где доступен logger.
Команда для добавления: 
```js
await this.logger.sendLog({ произвольные данные })
```
Все добавленные ключи в рамках одного request будут сложны в одну запись в БД. Исключение составляют записи с ключами "sql", каждая из которых добавляется отдельно (но с тем же самым traceId).
Данные большого размера складываются в logFiles, а в БД сохраняется ссылка на соответствующий файл.

Две "точки входа":
- /src/common/interceptors/request.interceptor.ts (основная)
- /src/common/decorators/access.decorators.ts (ловит запросы с code=NEED_LOGIN)
Точки выхода (запросы с finalizeType):
- /src/common/interceptors/request.interceptor.ts (основная)
- /src/common/filters/exception.filter.ts (ловит ошибки)