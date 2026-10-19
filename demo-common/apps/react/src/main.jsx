import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerAll } from '@worm-vue3-print/common'
import App from './App'
import './styles/demo-ui.css'
import './styles/topbar-overflow.css'
import { initTopbarOverflow } from './topbar-overflow.js'

// 一次性注册 <print-designer>：组件本体零框架依赖，样式在 Shadow DOM 内，
// 宿主侧的 demo 版式样式统一来自 demo-ui.css（由 sync-demo-styles.mjs 从 demo 抽取）
registerAll()

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
)

// 顶栏收纳：等首帧布局完成再取自然宽（StrictMode 双挂载不重复初始化：容器只有一个）
requestAnimationFrame(() => requestAnimationFrame(() => initTopbarOverflow()))
