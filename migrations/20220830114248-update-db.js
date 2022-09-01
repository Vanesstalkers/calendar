'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        UPDATE "project_to_user" SET "userId" = NULL WHERE id IN (
          SELECT MIN(t1.id) FROM "project_to_user" t1
          LEFT JOIN "project_to_user" t2 ON t2."userId" = t1."userId" AND t2."projectId" = t1."projectId" AND t2.id != t1.id
          WHERE t2.id IS NOT NULL
          GROUP BY t1."userId", t1."projectId"
        );
        ALTER TABLE "project_to_user" ADD CONSTRAINT "project_to_user_user_id_project_id" UNIQUE ("userId", "projectId");
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "project_to_user" DROP CONSTRAINT "project_to_user_user_id_project_id";
    `,
      { transaction },
    );
    await transaction.commit();
  }
};
