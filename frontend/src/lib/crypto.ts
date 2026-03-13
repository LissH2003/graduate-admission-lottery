/**
 * 密码加密工具
 * 用于前端预加密密码，避免明文暴露在开发者工具中
 * 
 * 使用流程：
 * 1. 用户输入明文密码
 * 2. 前端使用 hashPassword() 计算 SHA256(username:password)
 * 3. 发送哈希值到后端
 * 4. 后端用 bcrypt 对哈希值再次加密存储/验证
 */

/**
 * 计算字符串的 SHA256 哈希
 * @param message 输入字符串
 * @returns 64位十六进制哈希字符串
 */
export async function sha256(message: string): Promise<string> {
  // 将字符串编码为 UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // 使用 Web Crypto API 计算 SHA256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // 将 ArrayBuffer 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * 为密码添加盐值并哈希
 * 格式: SHA256(username:password)
 * 使用用户名作为盐值，确保相同密码不同用户哈希值不同
 * 
 * @param password 明文密码
 * @param username 用户名（作为盐值）
 * @returns 64位十六进制哈希字符串
 */
export async function hashPassword(password: string, username: string): Promise<string> {
  // 规范化用户名：转小写、去首尾空格
  const normalizedUsername = username.toLowerCase().trim();
  const saltedInput = `${normalizedUsername}:${password}`;
  return await sha256(saltedInput);
}

/**
 * 生成随机盐值（用于需要额外安全性的场景）
 * @param length 盐值长度（字节数）
 * @returns 十六进制字符串
 */
export function generateSalt(length: number = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 调试辅助：计算某个用户名密码组合的哈希值
 * 用于生成种子数据中的预计算哈希
 */
export async function debugHash(username: string, password: string): Promise<void> {
  const hash = await hashPassword(password, username);
  // eslint-disable-next-line no-console
  console.log(`Username: ${username}`);
  // eslint-disable-next-line no-console
  console.log(`Password: ${password}`);
  // eslint-disable-next-line no-console
  console.log(`SHA256("${username.toLowerCase().trim()}:${password}"):`);
  // eslint-disable-next-line no-console
  console.log(hash);
}
