import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('lib_books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column()
  publishedYear: number;
}
