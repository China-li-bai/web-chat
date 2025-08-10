import { SqlValue, DbNamespace } from '../types'
import { QualifiedTablename } from '../util/tablename'

const _ensureQualified = (
  candidate: string,
  defaultNamespace: DbNamespace = 'main'
): string => {
  if (candidate.includes('.')) {
    return candidate
  }

  return `${defaultNamespace}.${candidate}`
}

export const parseTableNames = (
  sqlQuery: string,
  defaultNamespace: DbNamespace = 'main'
): QualifiedTablename[] => {
  // NOTE(msfstef): using an SQLite parser to create an AST and
  // walk down it to find tablenames is a cleaner solution, but
  // there are no up-to-date parsers I could find that would not
  // block modern queries (e.g. windowed queries).
  // For the sake of parsing table names, this seems to do the
  // trick, and with enough test coverage it should be fine
  const tableNameExp = /(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_$.]*)/gi
  const tableMatches = []
  let match
  while ((match = tableNameExp.exec(sqlQuery)) !== null) {
    tableMatches.push(match[1])
  }

  const results: QualifiedTablename[] = []
  Array.from(tableMatches)
    .map((tn) => _ensureQualified(tn, defaultNamespace))
    .sort()
    .forEach((value: string) => {
      const [namespace, tablename] = value.split('.')
      results.push(new QualifiedTablename(namespace, tablename))
    })

  return results
}

export type Row = { [key: string]: SqlValue }
export type Statement = { sql: string; args?: SqlValue[] }
// A `DatabaseAdapter` adapts a database client to provide the
// normalised interface defined here.
export interface DatabaseAdapter {
  // Runs the provided sql statement
  run(statement: Statement): Promise<RunResult>

  // Runs the provided sql as a transaction
  runInTransaction(...statements: Statement[]): Promise<RunResult>

  // Query the database.
  query(statement: Statement): Promise<Row[]>

  /**
   * Runs the provided __non-async__ function inside a transaction.
   *
   * The function may not use async/await otherwise the transaction may commit before
   * the queries are actually executed. This is a limitation of some adapters, that the
   * function passed to the transaction runs "synchronously" through callbacks without
   * releasing the event loop.
   */
  transaction<T>(
    f: (tx: Transaction, setResult: (res: T) => void) => void
  ): Promise<T>

  // Get the tables potentially used by the query (so that we
  // can re-query if the data in them changes).
  tableNames(statement: Statement): QualifiedTablename[]
}

export class TableNameImpl {
  tableNames({ sql }: Statement): QualifiedTablename[] {
    return parseTableNames(sql)
  }
}

export interface Transaction {
  run(
    statement: Statement,
    successCallback?: (tx: Transaction, result: RunResult) => void,
    errorCallback?: (error: any) => void
  ): void

  query(
    statement: Statement,
    successCallback: (tx: Transaction, res: Row[]) => void,
    errorCallback?: (error: any) => void
  ): void
}

export interface RunResult {
  rowsAffected: number
}
