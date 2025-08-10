import type{ Database } from './database'
  

import { SerialDatabaseAdapter as GenericDatabaseAdapter } from '../generic'
import type {Row,Statement} from "../types"



export interface RunResult {
  rowsAffected: number
}
export class DatabaseAdapter extends GenericDatabaseAdapter {
  readonly db: Database

  constructor(db: Database) {
    super()
    this.db = db
  }

  private exec(statement: Statement): Promise<Row[]> {
    return this.db.exec(statement)
  }

  private getRowsModified() {
    return this.db.getRowsModified()
  }

  async _run(statement: Statement): Promise<RunResult> {
    await this.exec(statement)
    return {
      rowsAffected: this.getRowsModified(),
    }
  }

  _query(statement: Statement): Promise<Row[]> {
    return this.exec(statement)
  }
}
