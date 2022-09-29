import { readFileSync } from 'fs';
import { Sequelize } from 'sequelize';

async function clearDB() {
  try {
    const { phones } = JSON.parse(readFileSync('test/helpers/constants.json'));
    const { test } = JSON.parse(readFileSync('config/database/postgres/config.json'));
    const sequelize = new Sequelize({
      ...test,
      dialect: 'postgres',
      autoLoadModels: true,
      synchronize: false, // если удалить или поставить в true, то начнет перетирать данные
      // logging: false,
    });
    const sql = `
      --psql
      DELETE FROM "user"
      WHERE config->>'fake' = 'true';
      DELETE FROM "comment"
      WHERE config->>'fake' = 'true';
      DELETE FROM "file"
      WHERE config->>'fake' = 'true';
      DELETE FROM "hashtag"
      WHERE config->>'fake' = 'true';
      DELETE FROM "project"
      WHERE config->>'fake' = 'true';
      DELETE FROM "task"
      WHERE config->>'fake' = 'true';
      DELETE FROM "task_group"
      WHERE config->>'fake' = 'true';
      DELETE FROM "task_to_user"
      WHERE config->>'fake' = 'true';
      DELETE FROM "tick"
      WHERE config->>'fake' = 'true';
      DELETE FROM "user_to_user"
      WHERE config->>'fake' = 'true';
      DELETE FROM "user"
      WHERE phone IN (${phones.map((phone) => `'${phone}'`).join(', ')});`;
    await sequelize.query(sql, {});
    await sequelize.close();
  } catch (err) {
    console.log({ err });
  }
}
clearDB();
