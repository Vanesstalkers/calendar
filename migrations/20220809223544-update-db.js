'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      ALTER TABLE "project" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "project" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "project" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "project_to_user" RENAME COLUMN user_id TO "userId";
      ALTER TABLE "project_to_user" RENAME COLUMN project_id TO "projectId";
      ALTER TABLE "project_to_user" RENAME COLUMN user_name TO "userName";
      ALTER TABLE "project_to_user" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "project_to_user" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "project_to_user" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "task" RENAME COLUMN project_id TO "projectId";
      ALTER TABLE "task" RENAME COLUMN exec_end_time TO "execEndTime";
      ALTER TABLE "task" RENAME COLUMN exec_user TO "execUser";
      ALTER TABLE "task" RENAME COLUMN start_time TO "startTime";
      ALTER TABLE "task" RENAME COLUMN end_time TO "endTime";
      ALTER TABLE "task" RENAME COLUMN time_type TO "timeType";
      ALTER TABLE "task" RENAME COLUMN ext_source TO "extSource";
      ALTER TABLE "task" RENAME COLUMN ext_destination TO "extDestination";
      ALTER TABLE "task" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "task" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "task" RENAME COLUMN delete_time TO "deleteTime";
      ALTER TABLE "task" ADD "groupId" integer;
      ALTER TABLE "task" ADD CONSTRAINT "task_group_id_fkey" FOREIGN KEY ("groupId") REFERENCES task_group(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

      ALTER TABLE "task_to_user" RENAME COLUMN user_id TO "userId";
      ALTER TABLE "task_to_user" RENAME COLUMN task_id TO "taskId";
      ALTER TABLE "task_to_user" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "task_to_user" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "task_to_user" RENAME COLUMN delete_time TO "deleteTime";
      ALTER TABLE "task_to_user" RENAME CONSTRAINT "task_to_user_user_id_task_id" TO "task_to_user_userId_taskId";
      ALTER TABLE "task_to_user" DROP COLUMN exec_user;

      ALTER TABLE "task_group" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "task_group" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "task_group" RENAME COLUMN delete_time TO "deleteTime";
      ALTER TABLE "task_group" DROP COLUMN task_id;

      ALTER TABLE "comment" RENAME COLUMN task_id TO "taskId";
      ALTER TABLE "comment" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "comment" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "comment" RENAME COLUMN delete_time TO "deleteTime";

      ALTER TABLE "hashtag" RENAME COLUMN task_id TO "taskId";
      ALTER TABLE "hashtag" RENAME COLUMN add_time TO "addTime";
      ALTER TABLE "hashtag" RENAME COLUMN update_time TO "updateTime";
      ALTER TABLE "hashtag" RENAME COLUMN delete_time TO "deleteTime";
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
