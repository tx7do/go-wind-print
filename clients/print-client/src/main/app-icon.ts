// 品牌图标：与安装包共用同一份源图 `build/icon.png`（1024 圆角 RGBA，electron-builder 由它派生 ico / icns），
// 这样任务栏、窗口与快捷方式看到的是同一个图形。路径按 `out/main` → `../../build` 解析，
// 开发态与打进 asar 后都成立（`electron-builder.yml` 的 `files` 已包含 `build/icon.png`）。
import { nativeImage } from 'electron'
import { join } from 'node:path'

export const BRAND_ICON_PATH = join(__dirname, '..', '..', 'build', 'icon.png')

/** 品牌图；源图缺失时返回空图，Electron 自行回落默认图标，不影响启动 */
export function brandIcon(size: number): Electron.NativeImage {
  const image = nativeImage.createFromPath(BRAND_ICON_PATH)
  return image.isEmpty() ? image : image.resize({ width: size, height: size })
}
