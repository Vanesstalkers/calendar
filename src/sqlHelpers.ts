export function json(sql: string) {
  return `
        SELECT    row_to_json(ROW)
        FROM      ( ${sql} ) AS ROW
    `;
}

export function selectIcon(table: string, tableSym: string, [baseTable, baseTableSym] = []) {
  return baseTable
    ? `
      SELECT id FROM (
        ( SELECT    "id", 1 as "order"
          FROM      "file"
          WHERE     "deleteTime" IS NULL AND
                    "parentId" = ${tableSym}.id AND      
                    "parentType" = '${table}' AND  
                    "fileType" = 'icon'
          ORDER BY  "addTime" DESC
          LIMIT     1)
        UNION ALL
        ( SELECT    "id", 2 as "order"
          FROM      "file"
          WHERE     "deleteTime" IS NULL AND
                    "parentId" = ${baseTableSym}.id AND      
                    "parentType" = '${baseTable}' AND  
                    "fileType" = 'icon'
          ORDER BY  "addTime" DESC
          LIMIT     1)
      ) as f
      ORDER BY "order"
      LIMIT 1
    `
    : `--sql
      SELECT    "id"
      FROM      "file"
      WHERE     "deleteTime" IS NULL AND      
                "parentId" = ${tableSym}.id AND      
                "parentType" = '${table}' AND      
                "fileType" = 'icon'
      ORDER BY  "addTime" DESC
      LIMIT     1
    `;
}

export function selectProjectToUserLink(
  data: { projectId?: string; userId?: string },
  config: {
    addUserData?: boolean;
    addProjectData?: boolean;
    skipForeignPersonalProject?: boolean;
    jsonWrapper?: boolean;
    showLinkConfig?: boolean;
  },
) {
  const join = [];
  const select = [
    'p2u."id" AS "projectToUserLinkId"',
    '"userId"',
    '"projectId"',
    '"role"',
    '"position"',
    'p2u."personal"',
    '"userName"',
    `(${this.selectIcon('project_to_user', 'p2u')}) AS "userIconFileId"`,
  ];
  if(config.showLinkConfig) select.push('p2u."config"');
  const where = ['p2u."deleteTime" IS NULL'];

  if (config.addUserData) {
    join.push('LEFT JOIN "user" AS u ON u.id = p2u."userId" AND u."deleteTime" IS NULL');
    // select.push('u."name" AS "baseUserName"');
    // select.push(`(${this.selectIcon('user', 'u')}) AS "baseUserIconFileId"`);
    select.push('(CASE WHEN "userName" IS NOT NULL THEN "userName" ELSE u."name" END) as "userName"');
    select.push(`(${this.selectIcon('project_to_user', 'p2u', ['user', 'u'])}) AS "userIconFileId"`);
  }

  if (config.skipForeignPersonalProject) config.addProjectData = true;
  if (config.addProjectData) {
    join.push('LEFT JOIN "project" as p ON p.id = p2u."projectId" AND u."deleteTime" IS NULL');
    select.push('p."title"');
    select.push(`(${this.selectIcon('project', 'p')}) AS "projectIconFileId"`);

    //if (config.skipForeignPersonalProject) {
    where.push(`(p2u."role" = 'owner' OR p.personal IS DISTINCT FROM true)`);
    //}
  }

  if (data.projectId) where.push(`"projectId" = ${data.projectId}`);
  if (data.userId) where.push(`"userId" = ${data.userId}`);

  const sql = `--sql
    SELECT    ${select.join(',')}
    FROM      "project_to_user" AS p2u ${join.join(' ')}
    WHERE     ${where.join(' AND ')}
    ORDER BY  p2u."personal" DESC
  `;

  return config.jsonWrapper === false ? sql : this.json(sql);
}

export function foreignPersonalProjectList() {
  return `
          SELECT    p.id
          FROM      "task_to_user" AS t2u
                    LEFT JOIN "task" AS t ON t.id = t2u."taskId" AND t."deleteTime" IS NULL
                    LEFT JOIN "project" AS p ON p.id = t."projectId" AND p."deleteTime" IS NULL
                    LEFT JOIN "project_to_user" AS p2u 
                    ON p2u."projectId" = t."projectId" AND p2u."userId" = t2u."userId" AND p2u."deleteTime" IS NULL
          WHERE     t2u."userId" = :userId AND      
                    t2u."deleteTime" IS NULL AND
                    p.personal = true AND      
                    p2u."role" = 'member'
          GROUP BY  p.id
    `;
}
