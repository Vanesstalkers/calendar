import { MigrationInterface, QueryRunner } from "typeorm";

export class createDB1658698061708 implements MigrationInterface {
    name = 'createDB1658698061708'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "phone" character varying NOT NULL, "position" character varying, "timezone" character varying, "config" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "config" json NOT NULL DEFAULT '{}', CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_to_user" ("id" SERIAL NOT NULL, "role" text, "userId" integer, "projectId" integer, CONSTRAINT "PK_f14510443b767012ccdaf06b843" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "task" ("id" SERIAL NOT NULL, "require" integer NOT NULL, "exec_end_time" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "project_to_user" ADD CONSTRAINT "FK_39fe950a39abd407ec7c5e8da29" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_to_user" ADD CONSTRAINT "FK_932714e72967e90c085ab35552c" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_to_user" DROP CONSTRAINT "FK_932714e72967e90c085ab35552c"`);
        await queryRunner.query(`ALTER TABLE "project_to_user" DROP CONSTRAINT "FK_39fe950a39abd407ec7c5e8da29"`);
        await queryRunner.query(`DROP TABLE "task"`);
        await queryRunner.query(`DROP TABLE "project_to_user"`);
        await queryRunner.query(`DROP TABLE "project"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
