export const query = {
  getIcon(table, tableSym) {
    return `--sql
      SELECT    "id"
      FROM      "file"
      WHERE     "deleteTime" IS NULL AND      
                "parentId" = ${tableSym}.id AND      
                "parentType" = '${table}' AND      
                "fileType" = 'icon'
      ORDER BY  "addTime" DESC
      LIMIT    
                1
    `;
  },
};
