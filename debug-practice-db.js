/**
 * 使用项目的wa-sqlite查询practice数据库
 * 检查contentZh字段的实际存储情况
 */

/**
 * 使用项目的wa-sqlite查询practice数据库
 * 检查contentZh字段的实际存储情况
 */

// 在浏览器环境中运行，通过开发服务器访问
console.log('请在浏览器控制台中运行此脚本');

// 导出函数供浏览器使用
window.debugPracticeDatabase = async function() {
  // 动态导入数据库模块
  const { getDB } = await import('./src/services/db.ts');
  
  console.log('🔍 开始查询Practice数据库...');
  
  try {
    const db = await getDB();
    console.log('✅ 数据库连接成功');
    
    // 查询所有表
    console.log('\n📋 查询所有表:');
    const tables = await db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table'",
      args: []
    });
    console.log('表列表:', tables.map(t => t.name));
    
    // 查询practice_sessions表
    console.log('\n📊 查询practice_sessions表:');
    const sessions = await db.exec({
      sql: "SELECT * FROM practice_sessions ORDER BY id DESC LIMIT 5",
      args: []
    });
    console.log('最近5个会话:', sessions);
    
    // 查询practice_messages表
    console.log('\n💬 查询practice_messages表:');
    const messages = await db.exec({
      sql: "SELECT id, sessionId, role, content, meta FROM practice_messages ORDER BY id DESC LIMIT 10",
      args: []
    });
    
    console.log('最近10条消息:');
    messages.forEach((msg, index) => {
      console.log(`\n--- 消息 ${index + 1} ---`);
      console.log('ID:', msg.id);
      console.log('SessionID:', msg.sessionId);
      console.log('Role:', msg.role);
      console.log('Content:', msg.content?.substring(0, 100) + '...');
      
      // 解析meta字段
      if (msg.meta) {
        try {
          const meta = JSON.parse(msg.meta);
          console.log('Meta字段:');
          console.log('  contentZh:', meta.contentZh || '❌ undefined/null');
          console.log('  translationZh:', meta.translationZh || '❌ undefined/null');
          console.log('  其他字段:', Object.keys(meta).filter(k => k !== 'contentZh' && k !== 'translationZh'));
        } catch (e) {
          console.log('Meta解析失败:', msg.meta);
        }
      } else {
        console.log('Meta字段: ❌ 空');
      }
    });
    
    // 统计contentZh字段情况
    console.log('\n📈 统计contentZh字段情况:');
    const stats = await db.exec({
      sql: `
        SELECT 
          COUNT(*) as total_messages,
          SUM(CASE WHEN meta IS NOT NULL AND JSON_EXTRACT(meta, '$.contentZh') IS NOT NULL THEN 1 ELSE 0 END) as has_contentZh,
          SUM(CASE WHEN meta IS NOT NULL AND JSON_EXTRACT(meta, '$.translationZh') IS NOT NULL THEN 1 ELSE 0 END) as has_translationZh
        FROM practice_messages
      `,
      args: []
    });
    console.log('统计结果:', stats[0]);
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
};