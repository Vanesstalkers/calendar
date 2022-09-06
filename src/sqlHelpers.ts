export function json(sql: string) {
  return `
        SELECT    row_to_json(ROW)
        FROM      ( ${sql} ) AS ROW
    `;
}

export function selectIcon(table: string, tableSym: string) {
  return `--sql
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
  config: { addUserData?: boolean; addProjectData?: boolean; skipForeignPersonalProject?: boolean },
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
  const where = ['p2u."deleteTime" IS NULL'];

  if (config.addUserData) {
    join.push('LEFT JOIN "user" AS u ON u.id = p2u."userId" AND u."deleteTime" IS NULL');
    select.push('u."name" AS "baseUserName"');
    select.push(`(${this.selectIcon('user', 'u')}) AS "baseUserIconFileId"`);
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

  return `--sql
      SELECT    row_to_json(ROW)
      FROM      (
                  SELECT    ${select.join(',')}  
                  FROM      "project_to_user" AS p2u ${join.join(' ')}
                  WHERE     ${where.join(' AND ')}
                ) AS ROW
    `;
}
