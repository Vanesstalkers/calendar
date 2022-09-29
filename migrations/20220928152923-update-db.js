'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        ALTER TABLE comment ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE file ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE hashtag ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE project ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE task ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE task_group ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE task_to_user ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE tick ADD COLUMN config json DEFAULT '{}';
        ALTER TABLE user_to_user ADD COLUMN config json DEFAULT '{}';
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
