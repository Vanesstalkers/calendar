'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `

      ALTER TABLE "user" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "user" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "user" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "task_to_user" RENAME CONSTRAINT "task_to_user_user_id_task_id" TO "task_to_user_userId_taskId";
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
