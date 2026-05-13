import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { DataSource } from 'typeorm';
import { Role } from '../rbac/role.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true; // Tidak ada permission yang disyaratkan
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.role) {
      throw new ForbiddenException('Akses ditolak. Role tidak ditemukan pada token.');
    }

    // Ambil detail role beserta permissions dari database
    const roleEntity = await this.dataSource.manager.findOne(Role, {
      where: { id: user.role.id },
      relations: ['permissions']
    });

    if (!roleEntity) {
      throw new ForbiddenException('Akses ditolak. Role tidak valid.');
    }

    // Cek apakah setidaknya satu permission dari role cocok dengan yang disyaratkan
    const hasPermission = () => roleEntity.permissions.some((p) => requiredPermissions.includes(p.action));

    if (hasPermission()) {
      return true;
    }

    throw new ForbiddenException('Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.');
  }
}
