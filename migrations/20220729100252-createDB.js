'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const res = await queryInterface.sequelize.query(`

      CREATE SEQUENCE project_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."project" (
          "id" integer DEFAULT nextval('project_id_seq') NOT NULL,
          "title" character varying(255),
          "config" json DEFAULT '{}',
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "project_pkey" PRIMARY KEY ("id")
      ) WITH (oids = false);

      CREATE SEQUENCE user_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."user" (
          "id" integer DEFAULT nextval('user_id_seq') NOT NULL,
          "name" character varying(255),
          "phone" character varying(255),
          "position" character varying(255),
          "timezone" character varying(255),
          "config" json DEFAULT '{}',
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "user_pkey" PRIMARY KEY ("id")
      ) WITH (oids = false);

      CREATE SEQUENCE user_to_user_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."user_to_user" (
          "id" integer DEFAULT nextval('user_to_user_id_seq') NOT NULL,
          "user_id" integer,
          "user_rel_id" integer,
          "priority" integer,
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "user_to_user_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "user_to_user_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "user"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE,
          CONSTRAINT "user_to_user_user_rel_id_fkey" FOREIGN KEY (user_rel_id) REFERENCES "user"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);

      CREATE SEQUENCE project_to_user_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."project_to_user" (
          "id" integer DEFAULT nextval('project_to_user_id_seq') NOT NULL,
          "role" character varying(255),
          "user_id" integer,
          "project_id" integer,
          "personal" boolean DEFAULT false,
          "user_name" character varying(255),
          "config" json DEFAULT '{}',
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "project_to_user_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "project_to_user_project_id_fkey" FOREIGN KEY (project_id) REFERENCES project(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE,
          CONSTRAINT "project_to_user_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "user"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);   

      CREATE SEQUENCE task_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."task" (
          "id" integer DEFAULT nextval('task_id_seq') NOT NULL,
          "project_id" integer,
          "require" boolean DEFAULT true,
          "exec_end_time" timestamptz,
          "exec_user" integer,
          "title" character varying(255),
          "info" text,
          "date" timestamptz,
          "start_time" timestamptz,
          "end_time" timestamptz,
          "time_type" character varying(255),
          "regular" boolean DEFAULT true,
          "ext_source" character varying(255),
          "ext_destination" character varying(255),
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "task_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "task_exec_user_fkey" FOREIGN KEY (exec_user) REFERENCES "user"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE,
          CONSTRAINT "task_project_id_fkey" FOREIGN KEY (project_id) REFERENCES project(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);

      CREATE SEQUENCE task_group_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."task_group" (
          "id" integer DEFAULT nextval('task_group_id_seq') NOT NULL,
          "task_id" integer,
          "name" character varying(255),
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "task_group_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "task_group_task_id_fkey" FOREIGN KEY (task_id) REFERENCES task(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);
      
      CREATE SEQUENCE task_to_user_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."task_to_user" (
          "id" integer DEFAULT nextval('task_to_user_id_seq') NOT NULL,
          "user_id" integer,
          "task_id" integer,
          "role" character varying(255),
          "status" character varying(255),
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          "exec_user" integer,
          CONSTRAINT "task_to_user_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "task_to_user_exec_user_fkey" FOREIGN KEY (exec_user) REFERENCES "user"(id) ON UPDATE CASCADE ON DELETE SET NULL NOT DEFERRABLE,
          CONSTRAINT "task_to_user_task_id_fkey" FOREIGN KEY (task_id) REFERENCES task(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE,
          CONSTRAINT "task_to_user_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "user"(id) ON UPDATE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);
            
      CREATE SEQUENCE comment_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."comment" (
          "id" integer DEFAULT nextval('comment_id_seq') NOT NULL,
          "task_id" integer,
          "text" character varying(255),
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "comment_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "comment_task_id_fkey" FOREIGN KEY (task_id) REFERENCES task(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);
      
      CREATE SEQUENCE tick_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."tick" (
          "id" integer DEFAULT nextval('tick_id_seq') NOT NULL,
          "task_id" integer,
          "text" character varying(255),
          "status" boolean DEFAULT true,
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "tick_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "tick_task_id_fkey" FOREIGN KEY (task_id) REFERENCES task(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);
      
      CREATE SEQUENCE hashtag_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."hashtag" (
          "id" integer DEFAULT nextval('hashtag_id_seq') NOT NULL,
          "task_id" integer,
          "hashtag" character varying(255),
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "hashtag_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "hashtag_task_id_fkey" FOREIGN KEY (task_id) REFERENCES task(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE
      ) WITH (oids = false);
      
      CREATE SEQUENCE file_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;
      CREATE TABLE "public"."file" (
          "id" integer DEFAULT nextval('file_id_seq') NOT NULL,
          "link" character varying(255),
          "parent_type" character varying(255),
          "parent_id" integer,
          "file_type" character varying(255),
          "add_time" timestamptz NOT NULL,
          "update_time" timestamptz NOT NULL,
          "delete_time" timestamptz,
          CONSTRAINT "file_pkey" PRIMARY KEY ("id")
      ) WITH (oids = false); 
  `);
  },

  async down(queryInterface, Sequelize) {},
};
