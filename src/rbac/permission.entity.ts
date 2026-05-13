import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('lib_permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  action: string; // misal: 'create_book', 'read_book'
}
