import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Permission } from './permission.entity';

@Entity('lib_roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // misal: 'admin', 'member'

  @ManyToMany(() => Permission, { cascade: true, eager: true })
  @JoinTable({ name: 'lib_role_permissions' })
  permissions: Permission[];
}
