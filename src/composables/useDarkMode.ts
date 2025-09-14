import { ref, onMounted, watch } from 'vue';

export const useDarkMode = () => {
  const isDark = ref(false);

  // 初始化主题
  const initTheme = () => {
    // 从localStorage读取保存的主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      isDark.value = savedTheme === 'dark';
    } else {
      // 如果没有保存的设置，使用系统偏好
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme();
  };

  // 应用主题
  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 切换主题
  const toggleTheme = () => {
    isDark.value = !isDark.value;
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
    applyTheme();
  };

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    // 只有在用户没有手动设置主题时才跟随系统
    if (!localStorage.getItem('theme')) {
      isDark.value = e.matches;
      applyTheme();
    }
  };

  onMounted(() => {
    initTheme();
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  });

  // 清理监听器
  const cleanup = () => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
  };

  return {
    isDark,
    toggleTheme,
    cleanup
  };
};
