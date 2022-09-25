import * as swagger from '@nestjs/swagger';

export class fileDTO {
  @swagger.ApiProperty({
    description: 'Тип сущности-родителя',
    type: 'string',
    enum: ['user', 'project', 'project_to_user', 'task', 'comment'],
    example: 'user',
  })
  parentType?: string;
  @swagger.ApiProperty({ description: 'ID сущности-родителя', type: 'number' })
  parentId?: number;
  @swagger.ApiProperty({ description: 'Тип файла', example: 'icon', type: 'string' })
  fileType?: string;
  deleteTime?: Date;
}

export class fileCreateDTO extends fileDTO {
  @swagger.ApiProperty({ description: 'Содержимое файла в base64', example: 'iVBORw0KGgoAAAANSUh...' })
  fileContent?: string;
  @swagger.ApiProperty({ description: 'Internet Media Type (MIME-type)', example: 'image/jpeg' })
  fileMimetype?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя файла', type: 'string', example: 'picture.jpg' })
  fileName?: string;
  @swagger.ApiPropertyOptional({ description: 'Расширение файла', type: 'string', example: 'jpg' })
  fileExtension?: string;
  fileSize?: string;
  link?: string;
}

export class fileGetMetaAnswerDTO {
  @swagger.ApiProperty({ description: 'Имя файла', example: 'picture.jpg' })
  fileName?: string;
  @swagger.ApiProperty({ description: 'Internet Media Type (MIME-type)', example: 'image/jpeg' })
  fileMimetype?: string;
  @swagger.ApiProperty({ description: 'Размер файла (в байтах)', example: '9672' })
  fileSize?: string;
  @swagger.ApiProperty({ description: 'Ссылка на файл', example: '/file/get/35' })
  fileUrl?: string;
}

export class fileListItemDTO {
  @swagger.ApiProperty({ description: 'ID файла' })
  fileId: number;
  @swagger.ApiProperty({ description: 'Тип файла', type: 'string', example: 'icon' })
  fileType: string;
}

class fileUploadQueryFileDTO {
  @swagger.ApiProperty({ description: 'Содержимое файла в base64', example: 'iVBORw0KGgoAAAANSUh...' })
  fileContent?: string;
  @swagger.ApiProperty({ description: 'Internet Media Type (MIME-type)', example: 'image/jpeg' })
  fileMimetype?: string;
  @swagger.ApiPropertyOptional({ description: 'Имя файла', type: 'string', example: 'picture.jpg' })
  fileName?: string;
  @swagger.ApiPropertyOptional({ description: 'Расширение файла', type: 'string', example: 'jpg' })
  fileExtension?: string;
  fileSize?: string;
  link?: string;
}

export class fileUploadQueryDTO {
  @swagger.ApiProperty({ type: fileDTO })
  fileData: fileDTO;
  @swagger.ApiProperty({ type: fileUploadQueryFileDTO })
  file: fileUploadQueryFileDTO;
}
export class fileUploadWithFormdataQueryDTO {
  @swagger.ApiProperty({ type: fileDTO })
  fileData: fileDTO;
  @swagger.ApiProperty({ type: 'string', format: 'binary' })
  file: fileCreateDTO;
}

export class fileDeleteQueryDTO {
  @swagger.ApiProperty({ description: 'ID файла' })
  fileId: number;
}
