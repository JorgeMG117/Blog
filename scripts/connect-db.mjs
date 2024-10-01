import "dotenv/config.js";
import postgres from "postgres";
import { promises as fs } from 'fs';

// Establish the connection using the postgres package
const sql = postgres(process.env.DATABASE_URL, {
  transform: { undefined: null }, // Converts undefined to null for SQL queries
});

export default sql;

(async () => {
  try {
    // Read the SQL file if necessary
    const sqlFilePath = './database/init.sql';
    const sqlFile = await fs.readFile(sqlFilePath, 'utf8');

    // Execute the contents of the SQL file
    const result = await sql.unsafe(sqlFile);
    console.log("SQL file executed successfully:", result);

    // Use environment variables to update role passwords securely
    // const adminPassword = process.env.ADMIN_PASSWORD;
    // const appPassword = process.env.APP_PASSWORD;

    // // Alter the roles with passwords from environment variables
    // await sql`ALTER ROLE personal_site_admin WITH PASSWORD ${adminPassword}`;
    // console.log("Admin role password updated.");

    // await sql`ALTER ROLE personal_site_app WITH PASSWORD ${appPassword}`;
    // console.log("App role password updated.");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    // Closing the connection
    await sql.end();
  }
})();
