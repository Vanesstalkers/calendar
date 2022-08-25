'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      DELETE FROM task WHERE "ownUser" IS NULL;

      INSERT INTO task_to_user("userId", "taskId", "addTime", "updateTime")
      SELECT t."ownUser", t."id", NOW(), NOW() FROM task t
      LEFT JOIN task_to_user t2u ON t2u."taskId" = t.id
      WHERE t2u.id IS NULL AND t."ownUser" IS NOT NULL;
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
