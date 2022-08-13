'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      ALTER TABLE "tick" RENAME COLUMN task_id TO "taskId";
      ALTER TABLE "tick" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "tick" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "tick" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "hashtag" RENAME COLUMN hashtag TO "name";
      ALTER TABLE "hashtag" ADD CONSTRAINT "hashtag_taskId_name" UNIQUE ("taskId", "name");
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
