// 跨端产物比对（本地/发布前人工执行）：
//   node services/print-render/src/cross-end.parity.mjs <服务端 PDF> <客户端 PDF>
// 判定范围：页数与 MediaBox（档位一只保证逻辑同源；文字/条码的位图差异属已知字体残留差异）。
// 客户端产物需真机打印一次并开启「保留生成的 PDF」，故本脚本不接入 CI 自动执行。
import { readFileSync } from 'node:fs'

/** Chromium 产物中页面对象以明文出现，可直接抓 MediaBox */
export function readMediaBoxes(file) {
  let text
  try {
    text = readFileSync(file, 'latin1')
  } catch (e) {
    throw new Error(`读不到 ${file}：${e.message}`)
  }
  return [...text.matchAll(/MediaBox\s*\[([^\]]+)\]/g)].map(match => match[1].trim())
}

/** 比对用 A4 模板：与 print-render 集成测试保持同一份数据形态 */
export const A4_TEMPLATE = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  header: { height: 0, elements: [] },
  footer: { height: 0, elements: [] },
  elements: [
    { id: 't', type: 'text', options: { left: 0, top: 0, width: 120, height: 8, formatter: '跨端一致性' } },
  ],
}

if (process.argv[1]?.endsWith('cross-end.parity.mjs')) {
  // 注意：argv[0]=node、argv[1]=本脚本 —— 跳过两个，否则会把脚本自己当成服务端 PDF（2026-10-26 实测踩到）
  const [, , serverPdf, clientPdf] = process.argv
  if (!serverPdf || !clientPdf) {
    console.error('用法：node cross-end.parity.mjs <服务端 PDF> <客户端 PDF>')
    process.exit(2)
  }
  let server, client
  try {
    server = readMediaBoxes(serverPdf)
    client = readMediaBoxes(clientPdf)
  } catch (e) {
    console.error(String(e.message ?? e))
    process.exit(2)
  }
  if (!server.length || !client.length) {
    console.error(`解析不到 MediaBox：服务端=${server.length} 客户端=${client.length}（文件是否存在？是否是 PDF？）`)
    process.exit(2)
  }
  console.log('服务端 MediaBox:', server.join(' | ') || '（未解析到）')
  console.log('客户端 MediaBox:', client.join(' | ') || '（未解析到）')
  const same = server.length === client.length && server.join('|') === client.join('|')
  console.log(same ? '页数与纸尺寸一致' : '页数或纸尺寸不一致，需要人工核对')
  process.exit(same ? 0 : 1)
}
