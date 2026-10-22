# 模板 JSON 字段规范（worm-vue3-print）

适用：手写或脚本生成的、供「打印模板设计器」顶栏「导入模板」载入的 JSON。
单位统一为 **mm**（`unit: "mm"`），字号为 **pt**。坐标原点在**内容区左上角**（不含页边距）。

## 1. 设计器导入的结构门槛

导入时只做轻量结构校验，通过即载入：

- 单页：同时含 `paperSize`（字符串）、`margins`（对象）、`elements`（数组）
- 多页：`{ "pages": [ 单页模板, ... ] }`，每页都要满足上面三要素

缺少任一项会被拒绝；其余字段缺失则由设计器补默认。

## 2. 顶层结构（TemplateData）

```jsonc
{
  "unit": "mm",                    // 固定写 mm
  "paperSize": "A4",               // 见纸张表
  "orientation": "portrait",       // portrait | landscape（landscape 直接交换纸张宽高）
  "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 },
  "header":  { "height": 0, "elements": [] },   // 页眉（每页重复）
  "footer":  { "height": 0, "elements": [] },   // 页脚（每页重复）
  "elements": [ /* 内容区主体元素 */ ],
  "name": "采购收货单",             // 可选，多页模板的页签名
  "customWidth": 210,              // 仅 paperSize=CUSTOM 必填；连续纸时为纸宽
  "customHeight": 297,             // 仅 CUSTOM；连续纸时仅作设计画布高度
  "watermark": {},                 // 可选
  "tiling": { /* 拼版配置，见 §6 */ }
}
```

连续纸 / 小票纸（`CONTINUOUS`、`THERMAL_*`）的 `height` 只是设计画布高度，**出纸高度按内容推导**。

## 3. 纸张预设（mm）

| paperSize | 宽×高 | 说明 |
|---|---|---|
| `A4` | 210×297 | |
| `A3` | 297×420 | |
| `A5` | 148×210 | 单据常用 |
| `Letter` / `Legal` | 216×279 / 216×356 | |
| `DOT_FULL` / `DOT_HALF` / `DOT_THIRD` | 241×279.4 / 241×139.7 / 241×93.1 | 针式打印纸等分 |
| `LABEL_80X60` / `LABEL_60X40` / `LABEL_40X30` | 80×60 / 60×40 / 40×30 | 标签纸；选标签纸时设计器默认把页边距与页眉页脚归零 |
| `THERMAL_57` / `THERMAL_80` / `THERMAL_110` | 57×297 / 80×297 / 110×297 | 热敏小票（连续纸） |
| `CUSTOM` | customWidth × customHeight | |
| `CONTINUOUS` | 80×297 | 连续纸（默认 80mm） |

## 4. 元素通用结构

```jsonc
{
  "id": "el1",                 // 同页内唯一即可
  "type": "text",              // 见类型表
  "options": { "left": 0, "top": 0, "width": 56, "height": 6, /* 类型专属 */ },
  "printElementType": { "type": "text", "title": "文本" }   // title 用于属性面板显示
}
```

元素类型：`text`（文本）、`longText`（长文）、`image`（图片）、`table`（表格）、
`hline`（横线）、`vline`（竖线）、`rect`（矩形）、`oval`（椭圆）、
`barcode`（条形码）、`qrcode`（二维码）、`html`、`pageNumber`（页码）。
对应 title：文本 / 长文 / 图片 / 表格 / 横线 / 竖线 / 矩形 / 椭圆 / 条形码 / 二维码 / HTML / 页码。

### 常用 options（通用）

| 字段 | 说明 |
|---|---|
| `left` `top` `width` `height` | 几何（mm，相对内容区） |
| `formatter` | 内容表达式，如 `'单价 ¥{MONEY(product.price)}'` |
| `fontSize` | 字号 pt |
| `fontWeight` | `bold` / `normal` |
| `fontFamily` / `color` / `backgroundColor` | 字体、前景、背景；`fontFamily` **缺省 `SimHei`（黑体）**，详见下「字体档位」 |
| `textAlign` | `left` / `center` / `right` / `justify` |

| `verticalAlign` | `top` / `middle` / `bottom` |
| `textDecoration` | `underline` / `line-through` |
| `wordWrap` / `textFit` | 换行；溢出形式 `clip` / `shrink` |
| `borderWidth` `borderStyle` `borderColor` | 边框（宽度 pt） |
| `zIndex` `locked` `visible` | 层级 / 锁定 / 可见 |

#### 字体档位（免字体文件 vs 模板字体）

`fontFamily` 写的是 **CSS 族名**，分两类：

- **本机系统字体**（免字体文件，设计器下拉已列出）：`SimHei` 黑体 / `Heiti SC` 黑体-简 /
  `Hiragino Sans GB` 冬青黑体 / `Noto Sans CJK SC` 思源黑体 / `Microsoft YaHei` 微软雅黑 /
  `PingFang SC` 苹方 / `SimSun` 宋体 / `KaiTi` 楷体 / `FangSong` 仿宋。
  单点清单在 core 的 `print/fonts.ts`（`SYSTEM_FONT_OPTIONS`），改档位只改那一处。
- **模板声明字体**（宿主 `fonts` prop + `@font-face`）：只有这类才随模板分发、三端字面一致。

系统字体**三端解析不同**：画布、浏览器直印、桌面客户端用「用户机」装了什么，服务端 PDF 用渲染容器
装了什么（镜像内中文只有 `fonts-noto-cjk`）。族名在本机缺失时按兜底栈逐级回落（`toFontFamilyStack`），
不会出豆腐块，但字宽随之变化，可能引起换行与分页差异——跨端字面要求严格就走模板声明字体。

热敏（203dpi＝8 点/mm）建议黑体系（`SimHei` / `Heiti SC` / `Noto Sans CJK SC`）；宋体、楷体、仿宋是
衬线或细笔画，出纸易断笔发虚。**字重保持缺省 `normal`**：写 `bold` 而模板没挂对应字重的字体文件时，
Chromium 会合成粗体，度量漂移会静默改分页。

### 类型专属

| 类型 | 字段 |
|---|---|
| `barcode` | `barcodeType`（`code128`/`ean13`/`code39`/`itf14`，默认 code128）、`barWidth`（模块倍率 2~8，每模块首选宽 = 倍率/2 × 0.25mm）、`barQuietZone`（条码左右静区白边，单位「模块」，0~20，**缺省 10**＝一维码码制要求下限；越小白边越窄、同框内条越粗）、`barHeight`（条区高度 mm，**不含下方文字**；缺省按 30 模块，粒度＝每模块宽，框高不足时条高让位）、`printerDpi`（203/300/600，给出则吸附整数打印点，热敏强烈建议给）、`hideTitle` |
| `qrcode` | `qrCodeLevel`（`L`/`M`/`Q`/`H`）、`qrQuietZone`（静区白边，单位「模块」，0~8，缺省 0＝不留白边、码面等比铺满元素框）、`fit`（缺省 `contain`）、`maxWidth`/`maxHeight` |
| `image` | `src`、`fit`（`contain`/`cover`/`fill`/`none`/`scale-down`，缺省 `contain`；属性台里 `cover` 显示为「剪裁（等比铺满后裁边）」）、`objectPosition`（裁剪锚点，**建议写 `<x>% <y>%`**，如 `50% 0%` 取图顶端；缺省不输出＝`50% 50%` 居中）、`fitScale`（剪裁放大比例，100~400 的百分数，**仅 `fit: 'cover'` 消费**：铺满后把画面再推大这么多才有可裁的边，`transform-origin` 取的就是同一条 `objectPosition`；100 与缺省同形、不要写出来）、`maxWidth`/`maxHeight` |
| `longText` | `longTextIndent`（首行缩进，单位 **em**＝「N 个字符宽」，随字号走；仅 `longText` 消费，写在 `text` 上不生效） |
| `hline`/`vline` | `borderWidth` + `borderColor`（元素高度常取 0.2） |

**排版口径**：`textAlign` 支持 `justify`（两端对齐 = 撑满行宽，含末行；渲染端会同时输出 `text-align-last:justify`，因为 CSS 的 `justify` 不拉伸段落末行，单行文本否则毫无变化）。与 `verticalAlign` 同时给出时，渲染端把 flex 主轴改成纵向让行盒取满宽，右缘才真正齐平——三端（画布/浏览器打印/PDF/客户端）同策。
证件照这类「竖版自拍按居中裁剪会切头顶」的场景，给 `fit: 'cover'` 再配 `objectPosition: '50% 0%'` 取画面顶端（`'center 20%'` 等价于 `'50% 20%'`，两种写法都吃）；
`objectPosition` 含 `;`、引号、`url()` 等字符时整条丢弃（防往 style 里追加声明），只在确实发生裁切时可见。

**余量按缩放模式逐轴算，两轴都可以写**：`cover` 是等比铺满，贴满框的那一轴没有溢出，它的百分比填 0 还是 100 出纸相同——竖图放 35×45mm 框只有垂直能动（上下共 7.5mm），横图进同框只有水平能动；而 `contain`／`none`／`scale-down` 在图比框小时挪的是框内空位，两轴都可能有余量（如 60×60px 的图进 35×45mm 框，水平 19.13mm、垂直 29.13mm 都能挪）；`fill` 把图钉成框，两轴都挪不动。
所以生成模板时把有余量的轴写成非 50 的值、贴满的那一轴留 50；属性台水平／垂直两框常驻，档位只列能动的轴，挪不动的轴会直说「这一轴已贴满」。
**图片单元格的锚点只在 `fit: cover` 时生效**：cover 会把图片外框钉在可用框高（所跨行高之和扣内边距与塌陷边框）、`<img>` 补 `width/height:100%`，与独立图片元素同构地裁得动；代价是含图单元格的出纸行高不再被图片撑高，所以写 cover 前先把行高给够，别把画面裁没。缺省／`contain`／`fill` 等档保持原状：外框 `height:100%`、img 不撑满，行高仍由内容决定，锚点无视觉后果。要控制图片大小仍可用单元格 `maxWidth`/`maxHeight`（钉盒后它仍是上限）。
判据：`npm test -w @worm-vue3-print/core -- src/render/__tests__/crop-anchor.test.ts`（声明级，含 cover 钉盒与其余档不变的对照）；真浏览器几何与像素取证见 `services/print-render/src/cell-crop.integration.test.ts`。`scripts/validate_template.py` 不校验 `fit` 枚举，写错档位不报错、由浏览器忽略（要精确出纸就照上表取值）。

**条码尺寸口径**：每模块首选宽 = `barWidth/2 × 0.25mm`（`barWidth` 可填 2~8）；给了 `printerDpi` 就吸附到整数打印点
（dpi 优先），可用框放不下则整体等比缩小，绝不溢出。热敏出纸「条宽忽宽忽窄」的根因就是没给 dpi。
**条形码只缩不放**：拉满元素框会得到非整数条宽，故没有 `fit` 缩放模式——大框里条码停在首选尺寸属正常，别指望它自己撑满。

**要把条码做大（元素与单元格同一套旋钮，按增益排序）**：
1. `barWidth` 抬到 4/6/8（每模块 0.5/0.75/1.0mm）——上限翻倍是 8；
2. `barQuietZone` 收窄（缺省 10 → 例如 4 或 0）：左右各 10 模块的白边直接换成条宽，8 位数字 CODE128C 图形 99 模块里有 20 模块是白边，填 0 最多可让条粗 ~25%（码值越长占比越小，12 位约 12%）；
3. 关掉文本（元素 `hideTitle: true` / 单元格 `showBarcodeText: false`）：文本区占 12 模块（总高 44 → 32），当**高度**是受限轴时条宽可 +37%；
4. 加列宽/行高、把单元格 `padding` 调小（内容宽 = 列宽 − 2×padding − 塌陷边框）。
5. **只要条码变高、不想动条宽**：`barHeight`（mm，**条区本体高度，不含下方文字**）。口径是「条宽优先」——它按每模块物理宽折算成条区模块数，所以只能落到该粒度的整数倍（`barWidth=4` 即 0.5mm 步进）；可用框高装不下时**由条高让位，条宽一分不损**（8 位数字 + 默认条宽在 14.1mm 框内填 20mm，实际得到整图 14mm）。未填按 30 模块，存量模板逐毫米不变。
判据：受限轴看 `min(可用宽/总模块, 可用高/总模块)`，总模块 = 码值模块 + 2×`barQuietZone`，总高模块 = 条区（缺省 30，给了 `barHeight` 则按 `barHeight ÷ 每模块宽` 折算）+（有文本再 +`barFontSize`/缺省 10 + 2）。
**边界豁免**：`barQuietZone: 0` 压掉的白边参与「条→空→条」跳变，紧邻文字或表格线时可能扫不出（一维码静区是码制硬要求，不像二维码能靠框外白纸兜底），必须实打验证；缺省 10 不要改。

**二维码铺满口径**：图形走 `<img>`，写 `width/height:100%` 再配 `object-fit`（缺省 `contain`），码面等比贴住元素框短边；
框内那圈白边就是 `qrQuietZone`（单位「模块」，与元素框大小无关，**缺省 0**）。21 模块的码：`0`→码面占框 100%、`2`→84%、`4`→72%。
需要 ISO/IEC 18004 推荐的静区时显式写 `qrQuietZone: 4`——0 档靠元素框外的白纸充当静区，密集排版（紧邻文字或表格线）可能扫不出。


## 5. 表格模型

```jsonc
{
  "type": "table",
  "options": {
    "left": 0, "top": 23, "width": 128, "height": 30,
    "tableColWidths": [40, 20, 20, 20, 14, 14],   // 列宽 mm，和 == width
    "tableDefaultFontSize": 8,
    "tableDefaultFontFamily": "SimHei",             // 单元格未设 family 时的基线（新建表格自带）
    "tableDefaultPadding": 1,
    "dataSource": "goods",                        // 明细行迭代的数组路径
    "tableRows": [
      { "id": "r1", "type": "header",   "height": 8, "repeatOnPage": true, "cells": [...] },
      { "id": "r2", "type": "data",     "height": 8, "cells": [...] },
      { "id": "r3", "type": "subtotal", "height": 7, "cells": [...] },
      { "id": "r4", "type": "summary",  "height": 7, "cells": [...] }
    ]
  }
}
```

- 行类型：`header`（表头，可 `repeatOnPage` 每页重复）、`data`（明细，按 `dataSource` 迭代）、
  `subtotal`（**本页**小计，`SUM` 只聚合当前页）、`summary`（总计，聚合全部）
- **每行 `cells` 长度恒等于列数**：`colspan`/`rowspan` 覆盖的格必须补 `{ "id": "...", "merged": true }` 占位格
- 列宽和应等于 `width`、行高和应等于 `height`（设计器加载会按实际渲染尺寸回写，但手写时应自洽）
- 单元格常用字段：`formatter`、`cellType`（`text`/`barcode`/`qrcode`/`image`）、`align`（`left`/`center`/`right`/`justify`，`justify` = 撑满列宽含末行，渲染端成对输出 `text-align:justify;text-align-last:justify`）、`valign`、
  `fontSize`、`fontWeight`、`color`、`backgroundColor`、`padding`、`borders`（`{top,right,bottom,left}`，
  每边 `{width(pt), style, color}`）、`colspan`、`rowspan`
- 单元格条码另支持 `barcodeType` / `barWidth`（2~8） / `barQuietZone`（静区白边 0~20，缺省 10） / `barHeight`（条区高度 mm，不含文字，缺省按 30 模块） / `printerDpi` / `showBarcodeText` / `barFontSize`

> 单据抬头常用「纯 header 行的表格」做栅格排版——这不是异常，不必为它配 `dataSource`。

## 6. 拼版（一张纸上排多枚标签）

```jsonc
"tiling": {
  "enabled": true,
  "sheetPaperSize": "A4",           // 目标纸（张），不能是连续纸
  "sheetOrientation": "portrait",   // 只影响目标纸，不影响标签朝向
  "sheetMargin": { "top": 10, "right": 10, "bottom": 10, "left": 10 },  // 目标纸留白
  "gapX": 2, "gapY": 2,             // 相邻格间距 mm
  "columns": 2                      // 列数（必填）；行数由纸面自动推导
}
```

几何约束：
- `columns` 必须是 ≥1 的整数，且 `columns × 标签宽 + (columns−1) × gapX ≤ 目标纸宽 − 左右留白`
- 标签高 ≤ 目标纸高 − 上下留白，否则每张 0 行
- **连续纸/小票纸不支持拼版**；模板自己的 `margins` 是「标签内部边距」，与目标纸留白是两回事
- 拼版要求每份标签**恰好 1 页**——标签内容溢出会直接拒绝出纸

## 7. 表达式

- 字段：`{order.no}`、`{goods.0.name}`；data 行内直接写 `{name}`（相对当前行）
- 函数：`MONEY`（千分位两位小数）、`FORMAT`、`UPPER`（金额大写）、`DATE(v,'YYYY-MM-DD')`、
  `IF(cond,a,b)`、`IFEMPTY(v,def)`、`CONCAT`、`SUBSTR`、`LEN`、`NOW`、`PAD`、`REPLACE`、`JSON`
- 四则：`ADD(a,b,…)`、`SUB(a,b,…)`、`MUL(a,b,…)`、`DIV(a,b)`；也可直接写运算符 `{qty * price}`
- 修约：`ROUND(n,d)` 四舍五入、`ROUNDUP/CEIL` 进一、`ROUNDDOWN/FLOOR` 去尾、`ROUNDBANK` 四舍六入五成双；
  `d` 缺省 2，负数修约到整十/整百（`-2` → 百位）
- 聚合（表格汇总行）：`SUM(field)`、`AVG`、`COUNT`、`MIN`、`MAX`
- 系统变量：`{pageIndex}`、`{totalPages}`、`{printDate}`、`{printTime}`
- 文本与表达式可混排：`'金额大写：{UPPER(order.total)} 元'`

## 8. 打印数据（与模板配套）

模板 JSON **不含数据**；字段绑定 `{order.no}` 的值来自宿主注入的 printData 对象，例如：

```jsonc
{ "order": { "no": "CG20260920001" }, "goods": [ { "name": "..." } ] }
```

生成模板时同步给出一份同名 `.data.json`，便于宿主联调预览。
