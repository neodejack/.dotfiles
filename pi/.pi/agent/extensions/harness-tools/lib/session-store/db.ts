import { join } from "node:path";
import { getXDGPaths, openDatabase } from "@aliou/sesame";

type Database = NonNullable<ReturnType<typeof openDatabase>>;

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    const dataHome = process.env.SESAME_DATA_DIR || getXDGPaths().data;
    db = openDatabase(join(dataHome, "index.sqlite"));
  }
  return db;
}

export function dispose(): void {
  db?.close();
  db = null;
}

export function resetConnection(): void {
  dispose();
}
