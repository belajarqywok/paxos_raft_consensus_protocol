import { Module, DynamicModule, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RaftModule } from './raft/raft.module';
import { PaxosModule } from './paxos/paxos.module';
import { dataSourceOptions } from './data-source';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';
import { LibraryModule } from './library/library.module';
import { ClusterModule } from './cluster/cluster.module';

/**
 * AppModule dengan mode dinamis.
 *
 * Variabel lingkungan APP_MODE menentukan modul apa yang dimuat:
 *  - "raft"  → hanya RaftModule  (port 3001-3003)
 *  - "paxos" → hanya PaxosModule (port 4001-4003)
 *  - "lib"   → TypeOrm + Auth + Users + Rbac + Library (port 5000)
 *  - "all"   → semua modul aktif sekaligus
 */
@Module({})
export class AppModule {
  static register(): DynamicModule {
    const mode = process.env.APP_MODE || 'all';

    // Beri tipe eksplisit agar TypeScript tidak inferring sebagai 'never'
    const imports: any[] = [];
    const controllers: Type<any>[] = [];
    const providers: Type<any>[] = [];

    if (mode === 'raft' || mode === 'all') {
      // Raft Cluster: election & heartbeat
      imports.push(RaftModule);
    }

    if (mode === 'paxos' || mode === 'all') {
      // Paxos Cluster: prepare & accept phases
      imports.push(PaxosModule);
    }

    if (mode === 'lib' || mode === 'all') {
      // Library App: TypeORM + Auth (JWT) + RBAC + CRUD Buku
      // ConfigModule harus dimuat duluan agar .env terbaca sebelum TypeORM & JWT init
      imports.push(
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        TypeOrmModule.forRoot(dataSourceOptions),
        AuthModule,
        UsersModule,
        RbacModule,
        LibraryModule,
      );
    }

    if (mode === 'dash' || mode === 'all') {
      // Cluster Dashboard & Proxy (Port 3004)
      imports.push(ClusterModule);
    }

    // AppController & AppService hanya diperlukan saat mode 'all'
    if (mode === 'all') {
      controllers.push(AppController);
      providers.push(AppService);
    }

    return {
      module: AppModule,
      imports,
      controllers,
      providers,
    };
  }
}
