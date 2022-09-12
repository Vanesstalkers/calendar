'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        UPDATE "user" as u
        SET "config" = u."config"::jsonb || ('{"personalProjectId": ' || p2u."projectId" || '}')::jsonb
        FROM   project_to_user as p2u
        WHERE  p2u."userId" = u.id AND p2u.personal = true AND p2u.role = 'owner';
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
