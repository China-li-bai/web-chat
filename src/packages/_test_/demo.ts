import { createSqliteDatabaseAdapter } from "..";
import type { DatabaseAdapter } from "../wa-sqlite-adapter/databaseAdapter";

export const stringifyFormat = (
  data: Array<Record<string, any>> | Record<string, any> | undefined
) => {
  if (!data) return '';
  return JSON.stringify(data);
};

const list = Array.from([] as Array<any>);

export const createDemoTable = async (adapter: DatabaseAdapter) => {
  // 创建主单词表
  const wordSQL = `CREATE TABLE IF NOT EXISTS words (
    wordId TEXT PRIMARY KEY,
    headWord TEXT,
    wordHead TEXT,
    usphone TEXT,
    ukphone TEXT,
    ukspeech TEXT,
    usspeech TEXT,
    trans TEXT,
    )`;
  await adapter.run({ sql: wordSQL });
  // 翻译 表
  const transSQL = `CREATE TABLE IF NOT EXISTS trans (
    tranId INTEGER PRIMARY KEY AUTOINCREMENT,
    wordId TEXT UNIQUE,
    desc TEXT,
    trans TEXT,
    FOREIGN KEY(wordId) REFERENCES words(wordId)
    )`;
  await adapter.run({ sql: transSQL });

  //  例句 Sentences 表
  const sentenceSQL = `CREATE TABLE IF NOT EXISTS sentence (
       sentenceId INTEGER PRIMARY KEY AUTOINCREMENT,
       wordId TEXT UNIQUE,
       desc TEXT,
       sentences TEXT,
       FOREIGN KEY(wordId) REFERENCES words(wordId)
       )`;
  await adapter.run({ sql: sentenceSQL });

  // 同义词 Synonyms 表
  const synoSQL = `CREATE TABLE IF NOT EXISTS syno (
          synoId INTEGER PRIMARY KEY AUTOINCREMENT,
          wordId TEXT UNIQUE,
          synos TEXT,
          desc TEXT,
          FOREIGN KEY(wordId) REFERENCES words(wordId)
          )`;
  await adapter.run({ sql: synoSQL });

  // 短语
  const phraseSQL = `
    CREATE TABLE IF NOT EXISTS phrase (
    phraseId INTEGER PRIMARY KEY AUTOINCREMENT,
    wordId TEXT UNIQUE,
    desc TEXT,
    phrases TEXT,
    FOREIGN KEY(wordId) REFERENCES words(wordId)
    )`;
  await adapter.run({ sql: phraseSQL });

  // 反义词
  const antosSQL = `
    CREATE TABLE IF NOT EXISTS antos (
    antosId INTEGER PRIMARY KEY AUTOINCREMENT,
    wordId TEXT UNIQUE,
    desc TEXT,
    anto TEXT,
    FOREIGN KEY(wordId) REFERENCES words(wordId)
    )`;
  await adapter.run({ sql: antosSQL });

  // 同根词
  const relWordSQL = `
    CREATE TABLE IF NOT EXISTS relWord(
    relWordId INTEGER PRIMARY KEY AUTOINCREMENT,
    wordId TEXT UNIQUE,
    rels TEXT,
    desc TEXT,
    FOREIGN KEY(wordId) REFERENCES words(wordId)
    )`;
  await adapter.run({ sql: relWordSQL });

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const word = item.content;
    const wordId = item.headWord;
    const { wordHead } = word.word;
    const content = word.word.content;
    const {
      usphone,
      ukphone,
      ukspeech,
      usspeech,
      sentence,
      syno,
      phrase,
      trans,
      relWord,
      antos,
    } = content;

    await adapter.run({
      sql: `INSERT OR IGNORE INTO Words (wordId, headWord, wordHead, usphone, ukphone, ukspeech, usspeech,trans)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        wordId,
        item.headWord,
        wordHead,
        usphone,
        ukphone,
        ukspeech,
        usspeech,
        stringifyFormat(trans),
      ],
    });
    if (trans) {
      await adapter.run({
        sql: `INSERT OR IGNORE INTO trans (wordId,desc,trans) VALUES (?,?,?)`,
        args: [wordId, '翻译', stringifyFormat(trans)],
      });
    }
    if (antos) {
      await adapter.run({
        sql: `INSERT OR IGNORE INTO antos (wordId,desc,anto) VALUES (?,?,?)`,
        args: [wordId, antos.desc, stringifyFormat(antos.anto)],
      });
    }
    if (sentence) {
      await adapter.run({
        sql: `INSERT OR IGNORE INTO sentence (wordId,desc,sentences) VALUES (?,?,?)`,
        args: [wordId, sentence.desc, stringifyFormat(sentence.sentences)],
      });
    }
    if (syno) {
      await adapter.run({
        sql: `INSERT OR IGNORE INTO syno (wordId,desc,synos) VALUES (?,?,?)`,
        args: [wordId, syno.desc, stringifyFormat(syno.synos)],
      });
    }
    if (phrase) {
      await adapter.run({
        sql: `INSERT OR IGNORE INTO phrase (wordId,desc,phrases) VALUES (?,?,?)`,
        args: [wordId, phrase.desc, stringifyFormat(phrase.phrases)],
      });
    }
    if (relWord) {
      await adapter.run({
        sql: `INSERT OR IGNORE INTO relWord (wordId,desc,rels) VALUES (?,?,?)`,
        args: [wordId, relWord.desc, stringifyFormat(relWord.rels)],
      });
    }
  }
};

// 這是一個初始化表格的例子
export const initializeDemoDatabase = async () => {
  const wordAdapter = await createSqliteDatabaseAdapter('wordAdapter.db');
  await createDemoTable(wordAdapter);
}
