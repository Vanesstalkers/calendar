'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        UPDATE "user" SET "config" = "config"::jsonb - 'sessionStorageId' WHERE "config" ->> 'sessionStorageId' IS NOT NULL
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down(queryInterface, Sequelize) {},
};
