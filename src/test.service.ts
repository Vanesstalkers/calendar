/* import {
  Injectable,
  HttpException,
  HttpStatus,
  UseFilters,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { Cat } from './interfaces/cat.interface';
import { Cat as CatEntity } from './cat.entity';
import { CatsRepository } from './cats.repository';
import { AppModule } from './app.module';

// import { HttpExceptionFilter } from './http-exception.filter';

@Injectable()
// @UseFilters(new HttpExceptionFilter())
export class CatsService {
  // constructor(private dataSource: DataSource) {}
  constructor(
    @InjectRepository(CatEntity)
    // private readonly catsRepository: Repository<CatEntity>,
    private readonly catsRepository: CatsRepository,
    private dataSource: DataSource
  ) {}

  // @UseFilters(new HttpExceptionFilter())
  async create(cat: Cat) {
    const catItem = new CatEntity();
    catItem.name = cat.name;
    catItem.age = cat.age;
    catItem.breed = cat.breed;

    // await this.dataSource.transaction(async (manager) => {
    //   await manager.save(cat);
    // });
    return this.catsRepository.save(catItem);
  }

  async getAll(): Promise<Cat[]> {
    // const cats = await this.dataSource
    //   .createQueryRunner()
    //   .query(`SELECT * FROM cat WHERE data->'test' = $1`, [true]);
    // const queryRunner = this.dataSource.createQueryRunner();
    // await queryRunner.connect();
    // const cats = await queryRunner.query("SELECT * FROM cat");
    // await queryRunner.release();
    // const cats = await this.dataSource
    //   //.createQueryBuilder(CatEntity, 'cat')
    //   .createQueryBuilder(CatEntity, 'cat')
    //   // .select('cat')
    //   .select('cat.id')
    //   .addSelect('cat.name')
    //   // .from(CatEntity, "cat")
    //   .where('cat.id > :id', { id: 0 })
    //   .andWhere("data->'test' = :test", {test: true})
    //   // .getMany();
    //   .getRawMany();

    // const cats = await this.catsRepository.find();

    const cats = this.catsRepository.find({select: {
        name: true, age: true, data: {},
    }});

    return cats;
  }
  async update(query: {id: number}): Promise<void> {
    // const cat = await this.catsRepository.findOneBy({ id: 2 });
    // await this.catsRepository.update({id: 2}, {data: {...cat.data, time: Date.now()}});
    // await this.catsRepository.update({id: 2}, {data: {test: 777}});
    // console.log({query});
    // await this.catsRepository.updateJSON(query);

    const cats = await this.dataSource
      // .createQueryBuilder(CatEntity, 'cat')
      .createQueryBuilder()
      .update('cat')
      .set({
        age: 2,
        data() {
          //return `JSON_SET(\`data\`, '{time}', cast('${jsonStr}' AS jsonb))`;
          return `jsonb_set("data", '{time}', '${Date.now()}')`;
        },
      })
      .where('cat.id = :id', { id: query.id })
      .execute();
  }
}
 */