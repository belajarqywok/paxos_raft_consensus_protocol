import dataSource from '../src/data-source';
import { Role } from '../src/rbac/role.entity';
import { Permission } from '../src/rbac/permission.entity';

async function seed() {
  await dataSource.initialize();
  console.log('Database connected for seeding');

  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);

  // Daftar permission
  const permissions = ['read_book', 'create_book', 'update_book', 'delete_book'];
  const savedPerms: Permission[] = [];

  for (const p of permissions) {
    let perm = await permRepo.findOneBy({ action: p });
    if (!perm) {
      perm = permRepo.create({ action: p });
      await permRepo.save(perm);
    }
    savedPerms.push(perm);
  }
  console.log('Permissions seeded.');

  // Role Admin (All permissions)
  let adminRole = await roleRepo.findOneBy({ name: 'admin' });
  if (!adminRole) {
    adminRole = roleRepo.create({ name: 'admin', permissions: savedPerms });
    await roleRepo.save(adminRole);
    console.log('Admin role seeded.');
  }

  // Role Member (Read only)
  let memberRole = await roleRepo.findOneBy({ name: 'member' });
  if (!memberRole) {
    const readOnlyPerms = savedPerms.filter(p => p.action === 'read_book');
    memberRole = roleRepo.create({ name: 'member', permissions: readOnlyPerms });
    await roleRepo.save(memberRole);
    console.log('Member role seeded.');
  }

  await dataSource.destroy();
  console.log('Seeding completed.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
