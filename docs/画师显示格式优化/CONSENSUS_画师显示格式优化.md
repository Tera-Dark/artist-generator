# 画师显示格式优化共识文档

## 明确的需求描述

### 核心需求
1. **数据结构升级**: 从简单字符串数组升级到包含详细信息的对象结构
2. **显示格式优化**: 采用 "主名称 - 别名1,别名2,别名3 - 作品数量" 的格式
3. **搜索功能增强**: 支持主名称和所有别名的模糊匹配搜索
4. **数据兼容性**: 保持现有生成逻辑和UI交互的兼容性

### 验收标准
- [x] 画师列表显示新格式：`dairi - dairi155,dairi_(sogebugonbuto),はるか - 17662`
- [x] 搜索 "dairi155" 能找到 "dairi" 画师
- [x] 搜索结果按作品数量降序排列
- [x] 别名过多时显示前4个 + "...等N个别名"
- [x] 生成结果使用主名称确保一致性
- [x] 保持现有分页和UI交互体验

## 技术实现方案

### 数据结构定义
```typescript
interface Artist {
  name: string           // 主名称
  other_names: string[]  // 别名数组
  post_count: number     // 作品数量
}

interface ArtistData {
  artists: Artist[]      // 画师数组
}
```

### 显示格式规范
- **完整格式**: `{name} - {other_names[0:4].join(',')} - {post_count}`
- **别名截断**: 超过4个别名显示为 `name1,name2,name3,name4...等{total-4}个别名`
- **排序规则**: 搜索结果按 `post_count` 降序排列

### 搜索逻辑规范
```typescript
// 搜索匹配逻辑
const matchesSearch = (artist: Artist, query: string) => {
  const lowerQuery = query.toLowerCase()
  // 主名称匹配
  if (artist.name.toLowerCase().includes(lowerQuery)) return true
  // 别名匹配
  return artist.other_names.some(name => 
    name.toLowerCase().includes(lowerQuery)
  )
}
```

## 技术约束和集成方案

### 现有系统约束
- 保持Vue 3 + TypeScript + Pinia架构
- 保持现有组件接口兼容性
- 保持Tailwind CSS样式系统
- 数据文件仍使用静态JSON加载

### 集成方案
1. **类型系统**: 扩展 `src/types/index.ts` 添加新的Artist接口
2. **数据层**: 更新 `src/stores/generator.ts` 的数据处理逻辑
3. **UI层**: 修改 `src/components/SimpleTest.vue` 的显示和搜索逻辑
4. **数据迁移**: 重命名数据文件并更新加载路径

## 任务边界限制

### 包含范围
- TypeScript类型定义更新
- Pinia store数据处理逻辑适配
- Vue组件显示格式和搜索逻辑更新
- 数据文件路径和格式迁移
- 功能测试和验证

### 排除范围
- 数据文件的生成和预处理
- 后端API开发
- 用户偏好和本地存储
- 新功能特性开发
- 性能优化和缓存策略

## 验收标准

### 功能验收
1. **显示格式**: 画师列表显示符合 "name - other_names - post_count" 格式
2. **搜索功能**: 支持主名称和别名的模糊搜索
3. **排序功能**: 搜索结果按作品数量降序排列
4. **生成兼容**: 生成的画师组合使用主名称
5. **UI兼容**: 保持现有分页、模态框等交互体验

### 技术验收
1. **类型安全**: TypeScript编译无错误
2. **数据完整**: 所有画师数据正确加载和显示
3. **搜索性能**: 搜索响应时间 < 500ms
4. **兼容性**: 现有预设和生成逻辑正常工作
5. **代码质量**: 符合现有代码规范和风格

### 质量标准
- 代码符合ESLint规范
- 组件保持响应式设计
- 错误处理和边界情况覆盖
- 用户体验流畅无中断
