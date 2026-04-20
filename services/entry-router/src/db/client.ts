import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://venueflow:venueflow_dev@localhost:5432/venueflow',
  max: 10,
});

export default pool;
