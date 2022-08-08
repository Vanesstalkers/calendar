'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      ALTER TABLE tick ALTER COLUMN status TYPE CHAR(50);
      ALTER TABLE tick ALTER COLUMN status SET DEFAULT 'inwork';

      ALTER TABLE file ADD COLUMN file_name VARCHAR(255) NOT NULL DEFAULT '';
      ALTER TABLE file ADD COLUMN file_extension VARCHAR(255) NOT NULL DEFAULT '';
      ALTER TABLE file ADD COLUMN file_mimetype VARCHAR(255) NOT NULL DEFAULT '';
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      ALTER TABLE tick ALTER COLUMN status SET DEFAULT false;
      ALTER TABLE tick ALTER COLUMN status TYPE BOOLEAN 
        USING CASE WHEN status ~ 'true|false' then status::boolean else null end;

      ALTER TABLE file 
        DROP COLUMN file_name,
        DROP COLUMN file_extension,
        DROP COLUMN file_mimetype;
    `,
      { transaction },
    );
    await transaction.commit();
  },
};
