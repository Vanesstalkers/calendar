'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "user" ALTER COLUMN config SET DEFAULT '{"iconFileId": null}';
        ALTER TABLE "project" ALTER COLUMN config SET DEFAULT '{"iconFileId": null}';
        ALTER TABLE "project_to_user" ALTER COLUMN config SET DEFAULT '{"scheduleFilters": null, "userIconFileId": null}';

        UPDATE "user" as u SET "config" = u."config"::jsonb || ('{"iconFileId": null}')::jsonb;
        UPDATE "user" as u SET "config" = u."config"::jsonb || ('{"iconFileId": ' || f."id" || '}')::jsonb
        FROM   "file" as f
        WHERE  f."id" = (
          SELECT "id" FROM "file"
          WHERE "parentId" = u.id AND "parentType" = 'user' AND "fileType" = 'icon' AND "deleteTime" IS NULL
          ORDER BY "addTime" DESC LIMIT 1
        );

        UPDATE "project" as p SET "config" = p."config"::jsonb || ('{"iconFileId": null}')::jsonb;
        UPDATE "project" as p SET "config" = p."config"::jsonb || ('{"iconFileId": ' || f."id" || '}')::jsonb
        FROM   "file" as f
        WHERE  f."id" = (
          SELECT "id" FROM "file"
          WHERE "parentId" = p.id AND "parentType" = 'project' AND "fileType" = 'icon' AND "deleteTime" IS NULL
          ORDER BY "addTime" DESC LIMIT 1
        );

        UPDATE "project_to_user" as p2u SET "config" = p2u."config"::jsonb || ('{"userIconFileId": null}')::jsonb;
        UPDATE "project_to_user" as p2u SET "config" = p2u."config"::jsonb || ('{"userIconFileId": ' || f."id" || '}')::jsonb
        FROM   "file" as f
        WHERE  f."id" = (
          SELECT "id" FROM "file"
          WHERE "parentId" = p2u.id AND "parentType" = 'project_to_user' AND "fileType" = 'icon' AND "deleteTime" IS NULL
          ORDER BY "addTime" DESC LIMIT 1
        );

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