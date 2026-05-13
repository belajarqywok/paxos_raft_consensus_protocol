import { Client } from 'pg';

async function createDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres', // connect to default database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server.');

    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'libraries'");
    if (res.rowCount === 0) {
      console.log('Database "libraries" does not exist. Creating...');
      await client.query('CREATE DATABASE "libraries"');
      console.log('Database "libraries" created successfully.');
    } else {
      console.log('Database "libraries" already exists.');
    }
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await client.end();
  }
}

createDatabase();
