'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      ALTER TABLE "file" RENAME COLUMN parent_type TO "parentType";
      ALTER TABLE "file" RENAME COLUMN parent_id TO "parentId";
      ALTER TABLE "file" RENAME COLUMN file_type TO "fileType";
      ALTER TABLE "file" RENAME COLUMN file_name TO "fileName";
      ALTER TABLE "file" RENAME COLUMN file_extension TO "fileExtension";
      ALTER TABLE "file" RENAME COLUMN file_mimetype TO "fileMimetype";
      ALTER TABLE "file" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "file" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "file" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "user" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "user" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "user" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "user_to_user" RENAME COLUMN user_id TO "userId";
      ALTER TABLE "user_to_user" RENAME COLUMN user_rel_id TO "contactId";
      ALTER TABLE "user_to_user" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "user_to_user" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "user_to_user" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "user_to_user" ADD CONSTRAINT "user_to_user_userId_contactId" UNIQUE ("userId", "contactId");
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
