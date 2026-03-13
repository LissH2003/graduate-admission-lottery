// 学院工具函数 - 获取当前选中的学院

export function setCurrentAcademy(academy: { id: string; name: string }) {
  localStorage.setItem('current_academy', JSON.stringify(academy));
}

/**
 * 获取当前学院ID（不抛异常，未设置时返回null）
 */
export function getCurrentAcademyId(): string | null {
  const academy = localStorage.getItem('current_academy');
  if (!academy) {
    const user = localStorage.getItem('current_user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        // 如果 user 中有 academy_id，先设置到 current_academy 再返回
        if (parsed.academy_id && parsed.academy_name) {
          setCurrentAcademy({
            id: parsed.academy_id,
            name: parsed.academy_name
          });
          return parsed.academy_id;
        }
      } catch (e) {
        console.error('解析 user 失败:', e);
      }
    }
    return null;
  }
  try {
    return JSON.parse(academy).id;
  } catch (e) {
    console.error('解析 academy 失败:', e);
    return null;
  }
}

/**
 * 获取当前学院ID（强制模式，未设置时抛异常）
 */
export function getCurrentAcademyIdOrThrow(): string {
  const id = getCurrentAcademyId();
  if (!id) {
    throw new Error('未选择学院');
  }
  return id;
}

export function getCurrentAcademy(): { id: string; name: string } | null {
  const academy = localStorage.getItem('current_academy');
  if (!academy) {
    const user = localStorage.getItem('current_user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed.academy_id && parsed.academy_name) {
          // 自动设置到 current_academy，避免下次重复读取
          const academyInfo = { id: parsed.academy_id, name: parsed.academy_name };
          setCurrentAcademy(academyInfo);
          return academyInfo;
        }
      } catch (e) {
        console.error('解析 user 失败:', e);
      }
    }
    return null;
  }
  try {
    return JSON.parse(academy);
  } catch (e) {
    console.error('解析 academy 失败:', e);
    return null;
  }
}

export function clearCurrentAcademy() {
  localStorage.removeItem('current_academy');
}
