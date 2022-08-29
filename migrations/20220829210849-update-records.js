'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        UPDATE "task"
        SET regular = '{}' 
        WHERE (regular->>'enabled')::boolean IS DISTINCT FROM true AND 
                (regular->>'enabled')::boolean IS DISTINCT FROM false
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
