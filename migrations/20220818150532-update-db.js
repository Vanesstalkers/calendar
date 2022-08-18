'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      ALTER TABLE task ALTER COLUMN regular DROP DEFAULT;
      ALTER TABLE task ALTER COLUMN regular TYPE jsonb USING CASE WHEN regular = true THEN '{"enabled": true, "rule": "day"}'::jsonb ELSE '{}'::jsonb END;
      ALTER TABLE task ALTER COLUMN regular SET DEFAULT '{}'::jsonb;
      ALTER TABLE task ADD COLUMN later BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE task ADD COLUMN "ownUser" integer DEFAULT NULL;
    `,
      { transaction },
    );
    await transaction.commit();
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    await queryInterface.sequelize.query(
      `
      ALTER TABLE task ALTER COLUMN regular DROP DEFAULT;
      ALTER TABLE task ALTER COLUMN regular TYPE boolean USING CASE WHEN regular = '{}'::jsonb THEN false ELSE true END;
      ALTER TABLE task ALTER COLUMN regular SET DEFAULT true;
      ALTER TABLE task DROP COLUMN later;
      ALTER TABLE task DROP COLUMN "ownUser";
    `,
      { transaction },
    );
    await transaction.commit();
  },
};
