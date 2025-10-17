export type PromptVars = Record<string, string | number | boolean | null | undefined>;

/**
 * Prompts: 从本地 Markdown 模板加载 prompt，并进行 {{var}} 变量替换。
 * 约定：模板文件放在同目录下的 ./md/ 子目录中，支持多级子目录。
 * 匹配规则：传入 name，优先按文件名（不含扩展名）匹配；亦支持子路径（如 "wordbook/xxx"）。
 */
export default class Prompts {
  /**
   * 获取模板原文并进行变量替换
   * @param name 模板名称（如 "wordbook-generate" 或 "wordbook/generate"）
   * @param vars 变量字典，将替换 {{key}} 占位
   */
  static async get(name: string, vars?: PromptVars): Promise<string> {
    const files = (import.meta as any).glob('./md/**/*.md', { as: 'raw' });
    const normalized = String(name).trim().replace(/\.md$/i, '');
    let loader: (() => Promise<string>) | null = null;

    // 1) 先按完整子路径匹配（包含斜杠）
    for (const p of Object.keys(files)) {
      const baseNoExt = p.replace(/^.*\/md\//, '').replace(/\.md$/i, '');
      if (baseNoExt.toLowerCase() === normalized.toLowerCase()) {
        loader = files[p] as any;
        break;
      }
    }
    // 2) 再按纯文件名匹配（忽略子目录）
    if (!loader) {
      for (const p of Object.keys(files)) {
        const filenameNoExt = p.split('/').pop()!.replace(/\.md$/i, '');
        if (filenameNoExt.toLowerCase() === normalized.toLowerCase()) {
          loader = files[p] as any;
          break;
        }
      }
    }

    if (!loader) {
      throw new Error(`Prompt markdown not found: ${name}`);
    }

    const raw = (await loader()) || '';
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error(`Prompt markdown is empty: ${name}`);
    }

    // 简单占位替换：{{key}} -> String(value)
    const replaced = Prompts.interpolate(trimmed, vars || {});
    return replaced;
  }

  /**
   * 简单变量插值：{{key}} 替换；支持基本类型；undefined/null 置为空串。
   */
  static interpolate(text: string, vars: PromptVars): string {
    return text.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_m, key) => {
      const path = String(key);
      const value = Prompts.resolve(vars, path);
      if (value === null || typeof value === 'undefined') return '';
      return String(value);
    });
  }

  /**
   * 支持 a.b.c 形式的路径解析
   */
  static resolve(vars: PromptVars, path: string): any {
    const segs = path.split('.');
    let cur: any = vars;
    for (const s of segs) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = (cur as any)[s];
    }
    return cur;
  }
}