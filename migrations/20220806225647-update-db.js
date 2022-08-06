'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "task_to_user" ADD CONSTRAINT "task_to_user_user_id_task_id" UNIQUE ("user_id", "task_id");
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "task_to_user" DROP CONSTRAINT "task_to_user_user_id_task_id";
    `,
      { transaction },
    );
    await transaction.commit();
  }
};
