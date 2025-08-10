import { DatabaseAdapter } from "./wa-sqlite-adapter/adapter";
import { ElectricDatabase } from "./wa-sqlite-adapter/database";

export const makeSqlite = async (dbName: string): Promise<DatabaseAdapter> => {
  const db = await ElectricDatabase.init(dbName);
  const adapter = new DatabaseAdapter(db);
  return adapter
}