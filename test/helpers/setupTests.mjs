import { readFile, stat, unlink, writeFile } from 'fs/promises';
import { Sequelize } from 'sequelize';

async function unlinkIfExists(path) {
  try {
    await stat(path);
    await unlink(path);
  } catch (error) {}
}

async function prepare() {
  try {
    const phonesArr = [];
    const phonesCount = 200;
    for (let index = 0; index < phonesCount; index++) {
      let phone = `0000000${index.toString()}`;
      while (phone.length < 10) {
        phone = `0${phone}`;
      }
      phonesArr.push(phone);
    }
    await writeFile('test/helpers/constants.json', JSON.stringify({ phones: phonesArr }, null, 2));
    const { test } = JSON.parse(await readFile('config/database/postgres/config.json'));
    const sequelize = new Sequelize({
      ...test,
      dialect: 'postgres',
      autoLoadModels: true,
      synchronize: false, // если удалить или поставить в true, то начнет перетирать данные
      logging: false,
    });
    // clear files
    const filesListSql = `
      --psql
      SELECT "link" FROM "file"
      WHERE config->>'fake' = 'true';`;
    const filesListResult = await sequelize.query(filesListSql, {});
    const filesList = filesListResult[0].map((item) => item.link);
    for (let index = 0; index < filesList.length; index++) {
      await unlinkIfExists(`uploads/${filesList[index]}`);
    }
    // clear DB
    const deleteSql = `--psql
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
      WHERE phone IN (${phonesArr.map((phone) => `'${phone}'`).join(', ')});`;
    await sequelize.query(deleteSql, {});
    await sequelize.close();
    console.log('data clear finished');
  } catch (err) {
    console.log({ err });
  }
}
prepare();
