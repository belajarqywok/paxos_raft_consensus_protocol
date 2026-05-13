import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778644182962 implements MigrationInterface {
    name = 'InitialSchema1778644182962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lib_permissions" ("id" SERIAL NOT NULL, "action" character varying NOT NULL, CONSTRAINT "UQ_53c0d54ef951b04be4d7e8be4fa" UNIQUE ("action"), CONSTRAINT "PK_8239802a3c2f2e31445443a7c45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lib_roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_95d93940eb5d25ea9b51341e74e" UNIQUE ("name"), CONSTRAINT "PK_314b212167c542a292434a63bc7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lib_users" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "passwordHash" character varying NOT NULL, "roleId" integer, CONSTRAINT "UQ_56bc2e22d3139b1bc794ab17cb5" UNIQUE ("username"), CONSTRAINT "PK_d8b411f69bc77331f49a27aab31" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lib_books" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "author" character varying NOT NULL, "publishedYear" integer NOT NULL, CONSTRAINT "PK_8da84d14611dddf6ccfdb43a8ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lib_role_permissions" ("libRolesId" integer NOT NULL, "libPermissionsId" integer NOT NULL, CONSTRAINT "PK_f17b1bac5ca3410eb8bf8b12637" PRIMARY KEY ("libRolesId", "libPermissionsId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0432c112b0d0700cf0d753e814" ON "lib_role_permissions" ("libRolesId") `);
        await queryRunner.query(`CREATE INDEX "IDX_36eba4416f10f4d6240312add4" ON "lib_role_permissions" ("libPermissionsId") `);
        await queryRunner.query(`ALTER TABLE "lib_users" ADD CONSTRAINT "FK_5b615dd0c86d80dd195f521d88d" FOREIGN KEY ("roleId") REFERENCES "lib_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lib_role_permissions" ADD CONSTRAINT "FK_0432c112b0d0700cf0d753e8149" FOREIGN KEY ("libRolesId") REFERENCES "lib_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lib_role_permissions" ADD CONSTRAINT "FK_36eba4416f10f4d6240312add4c" FOREIGN KEY ("libPermissionsId") REFERENCES "lib_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lib_role_permissions" DROP CONSTRAINT "FK_36eba4416f10f4d6240312add4c"`);
        await queryRunner.query(`ALTER TABLE "lib_role_permissions" DROP CONSTRAINT "FK_0432c112b0d0700cf0d753e8149"`);
        await queryRunner.query(`ALTER TABLE "lib_users" DROP CONSTRAINT "FK_5b615dd0c86d80dd195f521d88d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_36eba4416f10f4d6240312add4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0432c112b0d0700cf0d753e814"`);
        await queryRunner.query(`DROP TABLE "lib_role_permissions"`);
        await queryRunner.query(`DROP TABLE "lib_books"`);
        await queryRunner.query(`DROP TABLE "lib_users"`);
        await queryRunner.query(`DROP TABLE "lib_roles"`);
        await queryRunner.query(`DROP TABLE "lib_permissions"`);
    }

}
