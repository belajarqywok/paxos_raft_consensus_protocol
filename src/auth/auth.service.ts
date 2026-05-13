import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Role } from '../rbac/role.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(userDto: any) {
    const { username, password, roleName = 'member' } = userDto;

    // Membuat QueryRunner untuk mengelola Transaksi
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction(); // Mulai ACID Transaction

    try {
      // 1. Cari role
      let role = await queryRunner.manager.findOne(Role, { where: { name: roleName } });
      if (!role) {
        throw new BadRequestException(`Role ${roleName} tidak ditemukan. Harus disisipkan oleh seeder.`);
      }

      // 2. Hash password
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(password, salt);

      // 3. Buat user
      const user = new User();
      user.username = username;
      user.passwordHash = passwordHash;
      user.role = role;

      // Menyimpan user
      await queryRunner.manager.save(user);

      // (Simulasi) Operasi ke tabel lain di dalam transaksi yang sama
      // misal: await queryRunner.manager.save(ActivityLog, { ... });

      await queryRunner.commitTransaction(); // Commit Transaksi jika semua sukses
      return { message: 'Registrasi berhasil', userId: user.id };
    } catch (err) {
      await queryRunner.rollbackTransaction(); // Rollback jika ada error
      throw new BadRequestException(`Gagal melakukan registrasi: ${err.message}`);
    } finally {
      await queryRunner.release(); // Selalu release query runner (kembali ke connection pool)
    }
  }

  async login(userDto: any) {
    const { username, password } = userDto;

    const user = await this.dataSource.manager.findOne(User, {
      where: { username },
      relations: ['role'], // Role otomatis termuat karena kita set eager: true di User entity, tapi kita perjelas di sini
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const payload = { username: user.username, sub: user.id, role: user.role };
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    throw new UnauthorizedException('Username atau password salah');
  }
}
