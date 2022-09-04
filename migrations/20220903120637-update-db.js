'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        UPDATE "user" SET "phone" = "id"
        WHERE "phone" IN (
          SELECT t1."phone" FROM "user" t1
          LEFT JOIN "user" t2 ON t2."phone" = t1."phone" AND t2.id != t1.id
          WHERE t2.id IS NOT NULL
          GROUP BY t1."phone"
        )
        AND NOT ("id" IN (
          SELECT MIN(t1.id) FROM "user" t1
          LEFT JOIN "user" t2 ON t2."phone" = t1."phone" AND t2.id != t1.id
          WHERE t2.id IS NOT NULL
          GROUP BY t1."phone"
        ));
        ALTER TABLE "user" ADD CONSTRAINT "user_phone" UNIQUE ("phone");
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "user" DROP CONSTRAINT "user_phone";
    `,
      { transaction },
    );
    await transaction.commit();
  }
};
