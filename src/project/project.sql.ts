import { sql } from '../globalImport';

export const query = {
  getUserLink(data: { projectId?; userId? }, config: { addUserData?; addProjectData? }) {
    const join = [];
    const select = [
      'p2u."id" AS "projectToUserLinkId"',
      '"userId"',
      '"projectId"',
      '"role"',
      '"personal"',
      '"userName"',
      `(${sql.file.getIcon('project_to_user', 'p2u')}) AS "userIconFileId"`,
    ];
    if (config.addUserData) {
      join.push('LEFT JOIN "user" AS u ON u.id = p2u."userId" AND u."deleteTime" IS NULL');
      select.push('u."name" AS "baseUserName"');
      select.push(`(${sql.file.getIcon('user', 'u')}) AS "baseUserIconFileId"`);
    }
    if (config.addProjectData) {
      join.push('LEFT JOIN "project" as p ON p.id = p2u."projectId" AND u."deleteTime" IS NULL');
      select.push('p."title"');
      select.push(`(${sql.file.getIcon('project', 'p')}) AS "projectIconFileId"`);
    }
    const where = ['p2u."deleteTime" IS NULL'];
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
  },
};
