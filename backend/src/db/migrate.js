import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireDatabase } from "./db.js";

const currentFile = fileURLToPath(import.meta.url);
const dbDirectory = path.dirname(currentFile);

const schemaFiles = ["schema.sql", "social-schema.sql", "migrate.sql", "global-payout-schema.sql"];

async function readSchemas() {
  return Promise.all(
    schemaFiles.map(async (fileName) => {
      const filePath = path.join(dbDirectory, fileName);
      return fs.readFile(filePath, "utf8");
    })
  );
}

async function migrate() {
  const pool = requireDatabase();
  const schemas = await readSchemas();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const schema of schemas) {
      await client.query(schema);
    }
    await client.query("COMMIT");
    console.log("Tinaab database migration completed.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Tinaab database migration failed:", error.message);
  process.exitCode = 1;
});
