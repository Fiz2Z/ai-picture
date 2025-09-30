// 运行时配置文件
// 这个文件会在容器启动时被替换为实际的环境变量值
window.APP_CONFIG = {
  VITE_IMAGE_API_URL: '${VITE_IMAGE_API_URL}',
  VITE_IMAGE_API_KEY: '${VITE_IMAGE_API_KEY}'
};
