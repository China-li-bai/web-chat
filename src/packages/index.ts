import { DatabaseAdapter } from "./wa-sqlite-adapter/adapter";
import { BasicDatabase } from "./wa-sqlite-adapter/database";

export const makeSqlite = async (dbName: string): Promise<DatabaseAdapter> => {
  const db = await BasicDatabase.init(dbName);
  const adapter = new DatabaseAdapter(db);
  return adapter
}