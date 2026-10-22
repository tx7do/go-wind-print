/** 属性面板搜索注册表：分组 → 表单项 → 关键词 */
export interface PropertyItem {
  key: string
  keywords: string[]
  /** 字段说明文案：挂在标签后的帮助图标上（悬浮/点击显示），元素台与单元格台、canvas 与 common 共用同一份 */
  tip?: string
}

export interface PropertyGroupDef {
  group: string
  groupLabel: string
  items: PropertyItem[]
}

export const PROPERTY_REGISTRY: PropertyGroupDef[] = [
  {
    group: 'position-size',
    groupLabel: '位置与尺寸',
    items: [
      { key: 'ps-left', keywords: ['X', '横坐标', 'left', '位置'] },
      { key: 'ps-top', keywords: ['Y', '纵坐标', 'top', '位置'] },
      { key: 'ps-width', keywords: ['W', '宽度', 'width', '尺寸'] },
      { key: 'ps-height', keywords: ['H', '高度', 'height', '尺寸'] },
    ],
  },
  {
    group: 'appearance',
    groupLabel: '外观',
    items: [
      { key: 'ap-font-family', keywords: ['字体', '字体名', '字体族', 'fontfamily'] },
      { key: 'ap-font-size', keywords: ['字体大小', 'fontsize', '字号'] },
      { key: 'ap-font-weight', keywords: ['字体粗细', '粗体', 'bold'] },
      { key: 'ap-align', keywords: ['对齐', 'align'] },
      { key: 'ap-vertical-align', keywords: ['垂直对齐', 'verticalalign', '顶对齐', '底对齐'] },
      { key: 'ap-color', keywords: ['颜色', 'color'] },
      { key: 'ap-bg-color', keywords: ['背景色', 'background'] },
      { key: 'ap-line-height', keywords: ['行高', 'lineheight'] },
      { key: 'ap-letter-spacing', keywords: ['字间距', 'letterspacing'] },
      { key: 'ap-text-fit', keywords: ['溢出', '溢出显示', '截断', '自动缩小', '自适应行高', 'textfit', 'overflow'] },
      { key: 'ap-shrink-min', keywords: ['最小字号', '缩放下限', 'shrinkminfontsize'] },
      { key: 'ap-word-wrap', keywords: ['自动换行', '不换行', 'wordwrap'] },
      {
        key: 'ap-long-text-indent',
        keywords: ['首行缩进', '缩进', 'indent', 'longtextindent', '两字符', '段首'],
        tip: '长文本每段首行空出的宽度，单位「字符」：填 2 即缩进两个汉字宽（中文排版惯例），按 em 落纸——字号被「自动缩小」压小时缩进同步变窄。仅长文本元素生效，写在普通文本上不生效',
      },
      {
        key: 'ap-img-fit',
        keywords: ['缩放模式', '拉伸', '等比', 'fit', 'contain', 'cover', '填充', '裁剪', '剪裁', '锚点'],
        tip: '图片在元素框内的缩放方式：包含＝完整显示、可能留白；剪裁＝铺满框并按「裁剪锚点」取一块；拉伸＝填满框会变形；原始尺寸与缩小不放大。画布与三条出纸链路同一口径（缺省包含）',
      },
      {
        key: 'ap-img-object-position',
        keywords: ['裁剪锚点', '剪裁锚点', '锚点', 'objectposition', 'object-position', '对齐点', '上移', '头顶'],
        tip: '取位（仅「剪裁」档有这一行）：剪裁把图等比铺满元素框，多出来的那一条边按这里选的位置取舍。先选位置档（贴边／居中／贴另一头），再按百分比微调，0 贴左／贴顶，100 挪到另一头，水平与垂直各自独立；缺省取正中间（保住证件照头顶就选顶部）。其余缩放模式图比框小或刚好铺满，没有可裁的边，所以不出本行',
      },
      {
        key: 'ap-img-fit-scale',
        keywords: ['放大比例', '剪裁放大', '放大倍数', '取景', '裁切范围', 'fitscale', 'zoom'],
        tip: '剪裁放大：等比铺满之后把画面再推大这么多，两轴才真的各多出一条边可裁——图与框同比例时不放大就什么都裁不掉。100＝不放大（缺省），上限 400；超出框的部分由元素框裁掉。锚点选中的那一点既是取位的钉住点、也是放大的中心，两者共用同一个值。仅「剪裁」档生效，其余缩放模式不出本行',
      },
    ],
  },
  {
    group: 'code',
    groupLabel: '条码设置',
    items: [
      { key: 'cd-type', keywords: ['码制', '条码类型', '条形码类型', 'barcodetype', 'code128', 'ean13', 'code39', 'itf14'] },
      { key: 'cd-dpi', keywords: ['打印机分辨率', 'dpi', '打印点', '点阵对齐', '203', '300'] },
      { key: 'cd-bar-width', keywords: ['条宽', '条粗细', 'barwidth', '模块宽'] },
      {
        key: 'cd-bar-quiet-zone',
        keywords: ['条码静区', '条码白边', '条形码留白', '条码空白边', 'barquietzone'],
        tip: '条形码左右两端的空白格数（1 格 = 1 条宽）：缺省 10，正是一维码码制要求的下限；数值越小白边越窄、同样的框内条越粗（可放大）。填 0 即不留白边，但静区参与「条→空→条」跳变，紧邻文字或表格线时可能扫不出，需实打验证',
      },
      {
        key: 'cd-bar-height',
        keywords: ['条高', '条码高度', '条区高度', '条码多高', 'barheight'],
        tip: '黑白条本体的目标高度（mm，不含下方文字）：折算粒度就是每模块物理宽，所以只能精确到它的整数倍。条宽优先——可用框高装不下时期望条高让位，绝不把条宽挤窄（热敏出纸清晰度靠条宽）。与「最大高度」分工不同：那条限的是整图（含文字）的上限',
      },
      { key: 'cd-show-text', keywords: ['显示文本', '条码文本', '显示数字'] },
      { key: 'cd-font-size', keywords: ['条码字号', '文本字号'] },
      { key: 'cd-ec-level', keywords: ['纠错级别', '容错', 'qrcodelevel'] },
      {
        key: 'cd-quiet-zone',
        keywords: ['静区', '静区宽度', '白边', '空白边', '留白', '铺满', 'quietzone'],
        tip: '二维码四周留出的空白格数：0 即不留白边、码面等比铺满元素框（此时靠框外的白纸充当静区）；数值越大白边越宽、码面在框内越小（缺省 0，需 ISO/IEC 18004 推荐静区时填 4）',
      },
      { key: 'cd-fit', keywords: ['缩放模式', '拉伸', '等比', 'fit', 'contain', 'cover'] },
      { key: 'cd-max-width', keywords: ['最大宽度', '最大宽', 'maxwidth'] },
      { key: 'cd-max-height', keywords: ['最大高度', '最大高', 'maxheight'] },
    ],
  },
  {
    group: 'content',
    groupLabel: '内容',
    items: [
      { key: 'ct-title', keywords: ['内容', '文本', 'title'] },
      { key: 'ct-formatter', keywords: ['格式化', '表达式', 'formatter'] },
      { key: 'ct-table-mode', keywords: ['数据模式', '静态布局', '动态数据'] },
      { key: 'ct-table-source', keywords: ['数据源', '列表字段'] },
      { key: 'ct-table-font', keywords: ['默认字号', '默认颜色', '默认内边距'] },
      { key: 'ct-table-cols', keywords: ['列宽', '表格列'] },
    ],
  },
  {
    group: 'border-bg',
    groupLabel: '边框与背景',
    items: [
      { key: 'bb-border-width', keywords: ['边框宽度', 'border'] },
      { key: 'bb-border-color', keywords: ['边框颜色'] },
      { key: 'bb-bg-color', keywords: ['背景色', 'background'] },
    ],
  },
  {
    group: 'binding',
    groupLabel: '字段绑定',
    items: [
      { key: 'bd-formatter', keywords: ['格式化', '表达式', 'formatter', 'fx', '字段', '绑定', 'field'] },
      { key: 'bd-content', keywords: ['内容', '表达式', '文本', '变量'] },
    ],
  },
  {
    group: 'pagination',
    groupLabel: '分页',
    items: [
      { key: 'pg-enabled', keywords: ['分页', 'pagination', '启用分页'] },
      { key: 'pg-pageable', keywords: ['参与分页', 'pageable'] },
      { key: 'pg-keep-with-next', keywords: ['同页', 'keepWithNext'] },
    ],
  },
  {
    group: 'advanced',
    groupLabel: '高级',
    items: [
      { key: 'ad-locked', keywords: ['锁定', 'lock'] },
      { key: 'ad-fixed', keywords: ['每页重复', 'repeat'] },
      { key: 'ad-z-index', keywords: ['层级', 'zindex'] },
      { key: 'ad-delete', keywords: ['删除'] },
    ],
  },
]

/** 正向包含匹配：任一关键词包含搜索词即命中；空搜索恒命中 */
/** 按表单项 key 取说明文案（帮助图标 tip 的内容）；未登记说明时返回空串 */
export function propertyTip(key: string): string {
  for (const group of PROPERTY_REGISTRY) {
    const hit = group.items.find(item => item.key === key)
    if (hit) return hit.tip ?? ''
  }
  return ''
}

export function matchKeywords(search: string, keywords: string[]): boolean {
  const s = search.trim().toLowerCase()
  if (!s) {
    return true
  }
  return keywords.some(k => k.toLowerCase().includes(s))
}

/** 计算命中的分组与表单项 key 集合 */
export function searchProperties(search: string): { groups: string[]; itemKeys: Set<string> } {
  const groups: string[] = []
  const itemKeys = new Set<string>()
  for (const g of PROPERTY_REGISTRY) {
    const matched = g.items.filter(item => matchKeywords(search, [...item.keywords, g.groupLabel]))
    if (matched.length > 0) {
      groups.push(g.group)
      for (const item of matched) {
        itemKeys.add(item.key)
      }
    }
  }
  return { groups, itemKeys }
}
