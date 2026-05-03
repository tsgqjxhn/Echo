<template>
  <div class="character-edit-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="goBack">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="page-title">编辑角色</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <main class="form-body">
      <!-- 区域A：基础信息 -->
      <section class="section-block">
        <h3 class="section-title">基础信息</h3>

        <div class="avatar-row">
          <div class="avatar-wrapper" @click="showAvatarSheet">
            <img v-if="form.avatar" :src="form.avatar" alt="头像" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ form.name?.charAt(0) || '?' }}</div>
          </div>
          <div class="avatar-actions">
            <button type="button" class="avatar-btn" @click="showAvatarSheet">更换头像</button>
          </div>
        </div>

        <div class="field-item">
          <label class="field-label">角色名称 <span class="required">*</span></label>
          <input
            v-model="form.name"
            type="text"
            class="field-input"
            :class="{ invalid: validation.name && touched.name }"
            maxlength="50"
            placeholder="请输入角色名称"
            @blur="touched.name = true"
          />
          <span class="char-count" :class="{ error: validation.name }">{{ form.name.length }}/50</span>
          <span v-if="validation.name && touched.name" class="error-text">{{ validation.name }}</span>
        </div>

        <div class="field-block">
          <span class="field-label">分类</span>
          <select v-model="form.category" class="category-select">
            <option v-for="group in categoryGroups" :key="group.label" :value="group.label">{{ group.label }}</option>
          </select>
          <p class="field-hint">系统会自动匹配为 {{ resolvedModeLabel }} 模式。</p>
        </div>

        <div v-if="subCategories.length" class="field-block">
          <span class="field-label">子分类</span>
          <div class="chip-row">
            <button
              v-for="item in subCategories"
              :key="item"
              type="button"
              class="category-chip"
              :class="{ active: form.subCategory === item }"
              @click="form.subCategory = item"
            >{{ item }}</button>
          </div>
        </div>

        <div class="field-block">
          <span class="field-label">主题大类</span>
          <select v-model="form.themeGroup" class="category-select">
            <option value="">选择主题大类</option>
            <option v-for="tg in themeGroups" :key="tg.label" :value="tg.label">{{ tg.label }}</option>
          </select>
        </div>

        <div v-if="currentThemeLeaves.length" class="field-block">
          <span class="field-label">主题细类</span>
          <div class="chip-row">
            <button
              v-for="leaf in currentThemeLeaves"
              :key="leaf"
              type="button"
              class="category-chip theme-chip"
              :class="{ active: form.themeType === leaf }"
              @click="form.themeType = leaf"
            >{{ leaf }}</button>
          </div>
        </div>

        <!-- 自定义标签 -->
        <div class="field-block">
          <span class="field-label">自定义标签</span>
          <div class="custom-tags-row">
            <div class="tag-chip" v-for="(tag, idx) in form.customTags" :key="tag + idx">
              <span>{{ tag }}</span>
              <button type="button" class="tag-remove" @click="removeCustomTag(idx)">
                <svg viewBox="0 0 24 24" width="10" height="10"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
              </button>
            </div>
            <input
              v-if="form.customTags.length < 10"
              v-model="tagInput"
              type="text"
              class="tag-input"
              placeholder="输入标签，回车添加"
              maxlength="20"
              @keydown.enter.prevent="addCustomTag"
              @keydown.comma.prevent="addCustomTag"
            />
          </div>
          <p class="field-hint">{{ form.customTags.length }}/10 个标签，每个最多20字符</p>
        </div>

        <div class="field-item">
          <label class="field-label">背景</label>
          <textarea v-model="form.background" class="user-textarea" rows="3" maxlength="500" placeholder="角色背景故事，可选" />
          <span class="field-hint">{{ form.background.length }}/500</span>
        </div>
      </section>

      <!-- 区域B：提示词核心 -->
      <section class="section-block">
        <h3 class="section-title">提示词核心</h3>

        <div class="field-item">
          <label class="field-label">描述 <span class="required">*</span></label>
          <textarea
            v-model="form.description"
            class="user-textarea"
            :class="{ invalid: validation.description && touched.description }"
            rows="4"
            maxlength="1000"
            placeholder="角色描述，必填"
            @blur="touched.description = true"
          />
          <span class="char-count" :class="{ error: validation.description }">{{ form.description.length }}/1000</span>
          <span v-if="validation.description && touched.description" class="error-text">{{ validation.description }}</span>
        </div>

        <div class="field-item">
          <label class="field-label">开场白</label>
          <textarea v-model="form.greeting" class="user-textarea" rows="3" maxlength="500" placeholder="首次对话时展示的开场白，可选" />
          <span class="field-hint">{{ form.greeting.length }}/500</span>
        </div>

        <div class="field-item">
          <label class="field-label">整体设定（主提示词） <span class="required">*</span></label>
          <textarea
            v-model="form.settings"
            class="user-textarea settings-input"
            :class="{ invalid: validation.settings && touched.settings }"
            rows="8"
            maxlength="4000"
            placeholder="角色的整体设定、性格、行为方式、说话风格等核心提示词，必填"
            @blur="touched.settings = true"
          />
          <span class="char-count" :class="{ error: validation.settings }">{{ form.settings.length }}/4000</span>
          <span v-if="validation.settings && touched.settings" class="error-text">{{ validation.settings }}</span>
        </div>

        <div class="field-item">
          <label class="field-label">场景时间</label>
          <input v-model="form.sceneTime" type="text" class="field-input" maxlength="30" placeholder="例如：深夜十一点、黄昏时分" />
        </div>

        <div class="field-item">
          <label class="field-label">场景设定</label>
          <textarea v-model="form.scenario" class="user-textarea" rows="3" maxlength="500" placeholder="对话发生的时间、地点、背景等场景设定" />
        </div>
      </section>

      <!-- 区域C：结构化人设 -->
      <section class="section-block compact">
        <AdvancedToggle v-model="showPersona" label-off="展开结构化人设" label-on="收起结构化人设" />
        <div v-if="showPersona" class="section-body">
          <div class="field-item">
            <label class="field-label">身份锁（锚点）</label>
            <textarea v-model="form.persona.anchor" class="user-textarea" rows="2" placeholder="角色的核心身份锚点，用于锁定角色本质" />
          </div>
          <div class="field-item">
            <label class="field-label">性格特质</label>
            <textarea v-model="form.persona.traits" class="user-textarea" rows="2" placeholder="角色的性格特征列表，用逗号分隔" />
          </div>
          <div class="field-item">
            <label class="field-label">交流风格</label>
            <textarea v-model="form.persona.voice" class="user-textarea" rows="2" placeholder="角色的说话方式、语气、口头禅等" />
          </div>
        </div>
      </section>

      <!-- 区域D：Lorebook 知识库 -->
      <section class="section-block compact">
        <AdvancedToggle v-model="showLorebook" label-off="展开 Lorebook 知识库" label-on="收起 Lorebook 知识库" />
        <div v-if="showLorebook" class="section-body">
          <div class="field-item inline-field">
            <label class="field-label">扫描消息数</label>
            <input v-model.number="form.lorebook.scanRange" type="number" class="field-input number-input" min="1" max="9999" />
          </div>

          <div v-if="form.lorebook.entries.length === 0" class="empty-hint">点击添加词条</div>

          <div v-for="(entry, idx) in form.lorebook.entries" :key="entry.id" class="lore-entry-card">
            <div class="lore-entry-header">
              <span class="lore-entry-index">词条 {{ idx + 1 }}</span>
              <div class="lore-entry-actions">
                <button type="button" class="icon-btn" :disabled="idx === 0" @click="moveLoreEntry(idx, -1)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 15l-6-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="icon-btn" :disabled="idx === form.lorebook.entries.length - 1" @click="moveLoreEntry(idx, 1)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <label class="lore-toggle">
                  <input v-model="entry.enabled" type="checkbox" />
                  <span class="lore-toggle-slider" />
                </label>
                <button type="button" class="icon-btn danger" @click="removeLoreEntry(idx)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
            </div>

            <div class="field-item">
              <label class="field-label">关键词（逗号分隔）</label>
              <input v-model="entry.keywordInput" type="text" class="field-input" placeholder="例如：魔法, 法术, 咒语" @change="syncLoreKeywords(entry)" />
            </div>

            <div class="field-item">
              <label class="field-label">内容</label>
              <textarea v-model="entry.content" class="user-textarea" rows="3" placeholder="词条内容，匹配关键词时注入到对话中" />
            </div>

            <div class="lore-grid">
              <div class="field-item">
                <label class="field-label">插入位置</label>
                <select v-model.number="entry.position" class="field-select">
                  <option :value="0">对话前</option>
                  <option :value="1">对话后</option>
                  <option :value="2">EM 顶部</option>
                  <option :value="3">EM 底部</option>
                  <option :value="4">AN 顶部</option>
                  <option :value="5">AN 底部</option>
                  <option :value="6">深度位置</option>
                  <option :value="7">出口</option>
                </select>
              </div>
              <div class="field-item">
                <label class="field-label">深度</label>
                <input v-model.number="entry.depth" type="number" class="field-input" :disabled="entry.position !== 6" min="0" max="99" />
              </div>
              <div class="field-item">
                <label class="field-label">角色</label>
                <select v-model.number="entry.role" class="field-select">
                  <option :value="0">system</option>
                  <option :value="1">user</option>
                  <option :value="2">assistant</option>
                </select>
              </div>
              <div class="field-item">
                <label class="field-label">优先级</label>
                <input v-model.number="entry.order" type="number" class="field-input" min="0" max="999" />
              </div>
            </div>
          </div>

          <button type="button" class="avatar-btn add-entry-btn" @click="addLoreEntry">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
            添加词条
          </button>
        </div>
      </section>

      <!-- 区域E：世界书 -->
      <section class="section-block compact">
        <AdvancedToggle
          v-model="showWorldBooks"
          :label-off="`展开世界书 ${form.worldBooks.length ? '(' + form.worldBooks.length + ')' : ''}`"
          label-on="收起世界书"
        />
        <div v-if="showWorldBooks" class="section-body">
          <div class="world-book-actions-row" style="margin-bottom: 8px;">
            <button type="button" class="avatar-btn add-entry-btn" @click="addWorldBook">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
              添加世界书
            </button>
            <button type="button" class="avatar-btn add-entry-btn" @click="triggerImportWorldBook">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> 从文件导入
            </button>
          </div>
          <input ref="worldBookFileInput" type="file" class="hidden-file-input" accept=".json" @change="onWorldBookFileSelected" />
          <div v-if="form.worldBooks.length === 0" class="empty-hint">
            暂无世界书，点击添加
          </div>

          <div v-for="(wb, wIdx) in form.worldBooks" :key="wb.id" class="world-book-card">
            <div class="world-book-header" @click="wb._expanded = !wb._expanded">
              <div class="world-book-title-row">
                <span class="world-book-name">{{ wb.name || '未命名世界书' }}</span>
                <span class="world-book-meta">{{ wb.entries.length }} 词条</span>
              </div>
              <div class="world-book-actions">
                <svg class="expand-icon" :class="{ expanded: wb._expanded }" viewBox="0 0 24 24" width="14" height="14">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <button type="button" class="icon-btn danger" @click.stop="removeWorldBook(wIdx)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
            </div>

            <div v-if="wb._expanded" class="world-book-body">
              <div class="field-item">
                <label class="field-label">世界书名称</label>
                <input v-model="wb.name" type="text" class="field-input" placeholder="例如：东方修仙世界观" />
              </div>
              <div class="field-item inline-field">
                <label class="field-label">扫描消息数</label>
                <input v-model.number="wb.scanRange" type="number" class="field-input number-input" min="1" max="9999" />
              </div>

              <div v-if="wb.entries.length === 0" class="empty-hint">
                点击添加词条
              </div>

              <div v-for="(entry, eIdx) in wb.entries" :key="entry.id" class="lore-entry-card">
                <div class="lore-entry-header">
                  <span class="lore-entry-index">词条 {{ eIdx + 1 }}</span>
                  <div class="lore-entry-actions">
                    <button type="button" class="icon-btn" :disabled="eIdx === 0" @click="moveWorldBookEntry(wb, eIdx, -1)">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 15l-6-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button type="button" class="icon-btn" :disabled="eIdx === wb.entries.length - 1" @click="moveWorldBookEntry(wb, eIdx, 1)">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <label class="lore-toggle">
                      <input v-model="entry.enabled" type="checkbox" />
                      <span class="lore-toggle-slider" />
                    </label>
                    <button type="button" class="icon-btn danger" @click="removeWorldBookEntry(wb, eIdx)">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>

                <div class="field-item">
                  <label class="field-label">关键词（逗号分隔）</label>
                  <input v-model="entry.keywordInput" type="text" class="field-input" placeholder="例如：魔法, 法术, 咒语" @change="syncWorldBookKeywords(entry)" />
                </div>

                <div class="field-item">
                  <label class="field-label">内容</label>
                  <textarea v-model="entry.content" class="user-textarea" rows="3" placeholder="词条内容，匹配关键词时注入到对话中" />
                </div>

                <div class="lore-grid">
                  <div class="field-item">
                    <label class="field-label">插入位置</label>
                    <select v-model.number="entry.position" class="field-select">
                      <option :value="0">对话前</option>
                      <option :value="1">对话后</option>
                      <option :value="2">EM 顶部</option>
                      <option :value="3">EM 底部</option>
                      <option :value="4">AN 顶部</option>
                      <option :value="5">AN 底部</option>
                      <option :value="6">深度位置</option>
                      <option :value="7">出口</option>
                    </select>
                  </div>
                  <div class="field-item">
                    <label class="field-label">深度</label>
                    <input v-model.number="entry.depth" type="number" class="field-input" :disabled="entry.position !== 6" min="0" max="99" />
                  </div>
                  <div class="field-item">
                    <label class="field-label">角色</label>
                    <select v-model.number="entry.role" class="field-select">
                      <option :value="0">system</option>
                      <option :value="1">user</option>
                      <option :value="2">assistant</option>
                    </select>
                  </div>
                  <div class="field-item">
                    <label class="field-label">优先级</label>
                    <input v-model.number="entry.order" type="number" class="field-input" min="0" max="999" />
                  </div>
                </div>

                <div class="lore-grid two-col">
                  <div class="field-item">
                    <label class="field-label">触发概率（%）</label>
                    <input v-model.number="entry.probability" type="number" class="field-input" min="0" max="100" />
                  </div>
                  <div class="field-item">
                    <label class="field-label">注释</label>
                    <input v-model="entry.comment" type="text" class="field-input" placeholder="可选" />
                  </div>
                </div>
              </div>

              <button type="button" class="avatar-btn add-entry-btn" @click="addWorldBookEntry(wb)">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
                添加词条
              </button>
            </div>
          </div>

        </div>
      </section>

      <!-- 区域F：深度提示 -->
      <section class="section-block compact">
        <AdvancedToggle v-model="showDepthPrompt" label-off="展开深度提示" label-on="收起深度提示" />
        <div v-if="showDepthPrompt" class="section-body">
          <div class="lore-grid two-col">
            <div class="field-item inline-field">
              <label class="field-label">深度层级</label>
              <input v-model.number="form.depthPrompt.depth" type="number" class="field-input" min="0" max="99" />
            </div>
            <div class="field-item">
              <label class="field-label">角色定位</label>
              <select v-model="form.depthPrompt.role" class="field-select">
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
            </div>
          </div>
          <div class="field-item">
            <label class="field-label">深度提示内容</label>
            <textarea v-model="form.depthPrompt.prompt" class="user-textarea" rows="4" placeholder="输入深度提示内容，将被注入到指定深度的对话上下文中" />
          </div>
        </div>
      </section>

      <!-- 区域F：备选开场白 -->
      <section class="section-block compact">
        <AdvancedToggle v-model="showAltGreetings" label-off="展开备选开场白" label-on="收起备选开场白" />
        <div v-if="showAltGreetings" class="section-body">
          <div v-if="form.alternateGreetings.length === 0" class="empty-hint">点击添加开场白</div>
          <div v-for="(_, idx) in form.alternateGreetings" :key="idx" class="alt-greeting-row">
            <textarea v-model="form.alternateGreetings[idx]" class="user-textarea greeting-textarea" rows="2" placeholder="输入备选开场白内容" />
            <button type="button" class="icon-btn danger" @click="removeAltGreeting(idx)">
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <button v-if="form.alternateGreetings.length < 10" type="button" class="avatar-btn add-entry-btn" @click="addAltGreeting">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
            添加开场白
          </button>
        </div>
      </section>

      <!-- 区域G：媒体设定 -->
      <section class="section-block compact">
        <AdvancedToggle v-model="showMedia" label-off="展开媒体设定" label-on="收起媒体设定" />
        <div v-if="showMedia" class="section-body">
          <div class="field-item">
            <label class="field-label">角色聊天背景</label>
            <div class="media-upload-row">
              <button type="button" class="avatar-btn" @click="uploadMedia('chatBackground')">上传图片</button>
              <button v-if="form.media.chatBackground" type="button" class="avatar-btn remove-media-btn" @click="form.media.chatBackground = ''">移除</button>
            </div>
            <div v-if="form.media.chatBackground" class="media-preview"><img :src="form.media.chatBackground" alt="聊天背景" /></div>
          </div>

          <div class="field-item">
            <label class="field-label">整体聊天背景</label>
            <div class="media-upload-row">
              <button type="button" class="avatar-btn" @click="uploadMedia('globalBackground')">上传图片</button>
              <button v-if="form.media.globalBackground" type="button" class="avatar-btn remove-media-btn" @click="form.media.globalBackground = ''">移除</button>
            </div>
            <div v-if="form.media.globalBackground" class="media-preview"><img :src="form.media.globalBackground" alt="整体背景" /></div>
          </div>

          <div class="field-item">
            <label class="field-label">角色切换动图</label>
            <div class="media-upload-row">
              <button type="button" class="avatar-btn" @click="uploadMedia('switchAnimation')">上传动图</button>
              <button v-if="form.media.switchAnimation" type="button" class="avatar-btn remove-media-btn" @click="form.media.switchAnimation = ''">移除</button>
            </div>
            <div v-if="form.media.switchAnimation" class="media-preview"><img :src="form.media.switchAnimation" alt="切换动图" /></div>
          </div>

          <div class="field-item">
            <label class="field-label">角色情感表达动图</label>
            <button type="button" class="avatar-btn emotion-add-btn" @click="addEmotion">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
              添加情感
            </button>
            <div v-for="(ea, idx) in form.media.emotionAnimations" :key="idx" class="emotion-row">
              <input v-model="ea.emotion" type="text" class="field-input emotion-input" placeholder="请输入触发该动图的情感状态" />
              <div class="emotion-actions">
                <button type="button" class="avatar-btn" @click="uploadEmotionAnimation(idx)">上传动图</button>
                <button v-if="ea.animationUrl" type="button" class="avatar-btn remove-media-btn" @click="ea.animationUrl = ''">移除</button>
                <button type="button" class="avatar-btn remove-media-btn" @click="removeEmotion(idx)">
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
                </button>
              </div>
              <div v-if="ea.animationUrl" class="media-preview small"><img :src="ea.animationUrl" alt="情感动图" /></div>
            </div>
          </div>
        </div>
      </section>

      <!-- 区域H：游戏数据 -->
      <section v-if="form.gameData" class="section-block compact">
        <AdvancedToggle v-model="showGameData" label-off="展开游戏数据" label-on="收起游戏数据" />
        <div v-if="showGameData" class="section-body">
          <div class="field-item">
            <label class="field-label">游戏数据（只读预览）</label>
            <pre class="game-preview">{{ form.gameData.slice(0, 800) }}{{ form.gameData.length > 800 ? '…' : '' }}</pre>
          </div>
        </div>
      </section>
    </main>

    <div class="submit-bar">
      <div class="submit-row">
        <button type="button" class="outline-btn" @click="previewCharacter">
          预览对话
        </button>
        <button type="button" class="primary-btn full" :disabled="!canSubmit || saving || !isFormValid" @click="onSubmit">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { uni } from '@/utils/uni-polyfill'
import { generateUUID } from '@/utils/uuid'
import type { ICharacter, CharacterPersona, Lorebook, LorebookEntry, DepthPrompt, EmotionAnimation } from '@/types/character'
import type { WorldBook, WorldBookEntry } from '@/types/world-book'
import AdvancedToggle from '@/components/CharacterForm/AdvancedToggle.vue'
import {
  getCategoryGroups,
  getThemeGroups,
  getFirstSubCategory,
  inferCharacterMode,
} from '@/data/taxonomy'
import { generateCharacterAvatar } from '@/services/character-ai-generate'

interface LorebookEntryUI {
  id: string
  keywords: string[]
  keywordInput: string
  content: string
  order: number
  enabled: boolean
  characterName?: string
  position: number
  depth: number
  role: number
}

interface WorldBookEntryUI {
  id: string
  keywords: string[]
  keywordInput: string
  content: string
  order: number
  enabled: boolean
  position: number
  depth: number
  role: number
  probability: number
  comment: string
}

interface WorldBookUI {
  id: string
  name: string
  entries: WorldBookEntryUI[]
  scanRange: number
  _expanded: boolean
}

const route = useRoute()
const router = useRouter()
const characterStore = useCharacterStore()

const originalCharacter = ref<ICharacter | null>(null)
const saving = ref(false)

// 折叠面板状态
const showPersona = ref(false)
const showLorebook = ref(false)
const showWorldBooks = ref(false)
const showDepthPrompt = ref(false)
const showAltGreetings = ref(false)
const showMedia = ref(false)
const showGameData = ref(false)

const categoryGroups = getCategoryGroups()
const themeGroups = getThemeGroups()

const form = reactive({
  id: '',
  name: '',
  avatar: '',
  background: '',
  description: '',
  greeting: '',
  settings: '',
  sceneTime: '',
  category: '',
  subCategory: '',
  themeGroup: '',
  themeType: '',
  mode: undefined as ICharacter['mode'],
  scenario: '',
  persona: {
    anchor: '',
    traits: '',
    voice: '',
  },
  lorebook: {
    entries: [] as LorebookEntryUI[],
    scanRange: 100,
  },
  worldBooks: [] as WorldBookUI[],
  depthPrompt: {
    depth: 4,
    prompt: '',
    role: 'system' as 'system' | 'user' | 'assistant',
  },
  alternateGreetings: [] as string[],
  media: {
    chatBackground: '',
    globalBackground: '',
    switchAnimation: '',
    emotionAnimations: [] as EmotionAnimation[],
  },
  gameData: '',
  // 保留原始值
  personality: undefined as string | undefined,
  behavior: undefined as string | undefined,
  values: undefined as string | undefined,
  exampleDialogue: undefined as string | undefined,
  customTags: [] as string[],
})

const tagInput = ref('')
const worldBookFileInput = ref<HTMLInputElement | null>(null)

const subCategories = computed(() =>
  categoryGroups.find(g => g.label === form.category)?.items || []
)

const currentThemeLeaves = computed(() =>
  themeGroups.find(g => g.label === form.themeGroup)?.items || []
)

const resolvedMode = computed<ICharacter['mode']>(() =>
  inferCharacterMode({ category: form.category, subCategory: form.subCategory })
)

const resolvedModeLabel = computed(() => {
  switch (resolvedMode.value) {
    case 'challenge-dialogue': return '闯关式对话'
    case 'group-chat': return '群聊'
    case 'group-challenge': return '群聊闯关'
    case 'free-dialogue':
    default: return '自由对话'
  }
})

const canSubmit = computed(() =>
  Boolean(form.name.trim() && form.description.trim() && form.settings.trim())
)

/* ── 表单校验 ── */
const touched = reactive({
  name: false,
  description: false,
  settings: false,
})

const validation = computed(() => {
  const errors: Record<string, string> = {}
  const name = form.name.trim()
  if (!name) errors.name = '请输入角色名称'
  else if (name.length > 50) errors.name = '名称最多50字符'
  else if (/^\s+$/.test(form.name)) errors.name = '名称不能全为空格'

  const desc = form.description.trim()
  if (!desc) errors.description = '请填写角色描述'
  else if (desc.length > 1000) errors.description = '描述最多1000字符'

  const settings = form.settings.trim()
  if (!settings) errors.settings = '请填写整体设定'

  return errors
})

const isFormValid = computed(() => {
  return Object.keys(validation.value).length === 0
})

/* ── 自定义标签 ── */
function addCustomTag() {
  const raw = tagInput.value.trim()
  if (!raw) return
  if (form.customTags.length >= 10) {
    uni.showToast({ title: '最多10个标签', icon: 'none' })
    return
  }
  const tag = raw.slice(0, 20)
  if (form.customTags.includes(tag)) {
    uni.showToast({ title: '标签已存在', icon: 'none' })
    return
  }
  form.customTags.push(tag)
  tagInput.value = ''
}

function removeCustomTag(idx: number) {
  form.customTags.splice(idx, 1)
}

onMounted(() => {
  const id = route.query.id as string
  if (id) {
    void loadCharacter(id)
  } else {
    uni.showToast({ title: '缺少角色ID', icon: 'none' })
    router.back()
  }
})

watch(() => form.category, next => {
  if (!subCategories.value.includes(form.subCategory)) {
    form.subCategory = getFirstSubCategory(next)
  }
})

watch(() => form.themeGroup, () => {
  form.themeType = ''
})

async function loadCharacter(id: string) {
  const c = await characterStore.getCharacterById(id)
  if (!c) {
    uni.showToast({ title: '角色不存在', icon: 'none' })
    router.back()
    return
  }
  originalCharacter.value = c

  // 从 tags 推断 themeType / themeGroup
  const allThemeLeaves = themeGroups.flatMap(g => g.items.map(i => ({ group: g.label, leaf: i })))
  const foundTheme = c.tags?.map(t => allThemeLeaves.find(l => l.leaf === t)).find(Boolean)
  const themeType = foundTheme?.leaf || ''
  const themeGroup = foundTheme?.group || ''

  form.id = c.id
  form.name = c.name
  form.avatar = c.avatar || ''
  form.background = c.background || ''
  form.description = c.description
  form.greeting = c.greeting || ''
  form.settings = c.settings
  form.sceneTime = c.sceneTime || ''
  form.category = c.category || ''
  form.subCategory = c.subCategory || ''
  form.themeGroup = themeGroup
  form.themeType = themeType
  form.mode = c.mode || resolvedMode.value
  form.scenario = c.scenario || ''
  form.persona.anchor = c.persona?.anchor || ''
  form.persona.traits = c.persona?.traits?.join(', ') || ''
  form.persona.voice = c.persona?.voice || ''
  form.lorebook.scanRange = c.lorebook?.scanRange || 100
  form.lorebook.entries = (c.lorebook?.entries || []).map(e => ({
    id: e.id || generateUUID(),
    keywords: e.keywords || [],
    keywordInput: (e.keywords || []).join(', '),
    content: e.content || '',
    order: e.order ?? 0,
    enabled: e.enabled ?? true,
    characterName: e.characterName,
    position: e.position ?? 0,
    depth: e.depth ?? 0,
    role: e.role === 'user' ? 1 : e.role === 'assistant' ? 2 : 0,
  }))
  form.worldBooks = (c.worldBooks || []).map(wb => ({
    id: wb.id || generateUUID(),
    name: wb.name || '未命名世界书',
    entries: (wb.entries || []).map(e => ({
      id: e.id || generateUUID(),
      keywords: [...(e.keywords || [])],
      keywordInput: (e.keywords || []).join(', '),
      content: e.content || '',
      order: e.order ?? 0,
      enabled: e.enabled ?? true,
      position: e.position ?? 0,
      depth: e.depth ?? 0,
      role: e.role ?? 0,
      probability: e.probability ?? 100,
      comment: e.comment || '',
    })),
    scanRange: wb.scanRange || 100,
    _expanded: false,
  }))
  showWorldBooks.value = !!(c.worldBooks?.length)
  form.depthPrompt.depth = c.depthPrompt?.depth ?? 4
  form.depthPrompt.prompt = c.depthPrompt?.prompt || ''
  form.depthPrompt.role = c.depthPrompt?.role || 'system'
  form.alternateGreetings = c.alternateGreetings ? [...c.alternateGreetings] : []
  form.media.chatBackground = c.chatBackground || ''
  form.media.globalBackground = c.globalBackground || ''
  form.media.switchAnimation = c.switchAnimation || ''
  form.media.emotionAnimations = c.emotionAnimations ? JSON.parse(JSON.stringify(c.emotionAnimations)) : []
  form.gameData = c.gameData || ''
  form.personality = c.personality
  form.behavior = c.behavior
  form.values = c.values
  form.exampleDialogue = c.exampleDialogue
  // 从 tags 中区分自定义标签与系统标签
  const systemTags = new Set([form.category, form.subCategory, form.themeType].filter(Boolean))
  form.customTags = c.tags?.filter(t => !systemTags.has(t)) || []
}

function goBack() {
  router.back()
}

function showAvatarSheet() {
  uni.showActionSheet({
    itemList: ['从相册上传', 'AI生成头像', '取消'],
    itemColor: '#38bdf8',
    success: (res: { tapIndex: number }) => {
      if (res.tapIndex === 0) chooseAvatar()
      else if (res.tapIndex === 1) generateAvatar()
    },
  })
}

async function blobUrlToBase64(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      const imagePath = res.tempFilePaths?.[0]
      if (!imagePath) return
      try {
        const base64 = await blobUrlToBase64(imagePath)
        form.avatar = base64
      } catch {
        form.avatar = imagePath
      }
    },
  })
}

async function generateAvatar() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请先填写角色名称', icon: 'none' })
    return
  }
  uni.showToast({ title: '生成中…', icon: 'loading', duration: 2000 })
  try {
    const url = await generateCharacterAvatar(form.name, form.category)
    if (url) form.avatar = url
    uni.showToast({ title: '生成成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '生成失败', icon: 'none' })
  }
}

function triggerImportWorldBook() { worldBookFileInput.value?.click() }

function onWorldBookFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target?.result as string)
      const wb = parseWorldBookFromJSON(json)
      if (wb) {
        form.worldBooks.push(wb)
        uni.showToast({ title: `导入成功：${wb.name}`, icon: 'success' })
      } else {
        uni.showToast({ title: '文件格式不正确', icon: 'none' })
      }
    } catch {
      uni.showToast({ title: '解析失败', icon: 'none' })
    }
  }
  reader.readAsText(file)
}

function parseWorldBookFromJSON(json: any): WorldBookUI | null {
  if (!json || typeof json !== 'object') return null
  const entries: WorldBookEntryUI[] = []
  const rawEntries = Array.isArray(json.entries) ? json.entries : Array.isArray(json) ? json : []
  for (const e of rawEntries) {
    if (!e || typeof e !== 'object') continue
    const keywords = Array.isArray(e.keywords) ? e.keywords : (e.key || '').split(',').map((s: string) => s.trim()).filter(Boolean)
    entries.push({
      id: e.id || generateUUID(),
      keywords,
      keywordInput: keywords.join('，'),
      content: String(e.content || e.value || ''),
      order: Number(e.order ?? 0),
      enabled: e.enabled !== false,
      position: Number(e.position ?? 0),
      depth: Number(e.depth ?? 0),
      role: Number(e.role ?? 0),
      probability: Number(e.probability ?? 100),
      comment: String(e.comment || ''),
    })
  }
  return {
    id: json.id || generateUUID(),
    name: String(json.name || '导入的世界书'),
    entries,
    scanRange: Number(json.scanRange ?? 100),
    _expanded: true,
  }
}

type MediaKey = 'chatBackground' | 'globalBackground' | 'switchAnimation'
function uploadMedia(key: MediaKey) {
  uni.chooseImage({
    count: 1,
    success: (res: { tempFilePaths: string[] }) => {
      const path = res.tempFilePaths?.[0]
      if (path) form.media[key] = path
    },
  })
}

function addEmotion() {
  form.media.emotionAnimations.push({ emotion: '', animationUrl: '' })
}

function removeEmotion(idx: number) {
  form.media.emotionAnimations.splice(idx, 1)
}

function uploadEmotionAnimation(idx: number) {
  uni.chooseImage({
    count: 1,
    success: (res: { tempFilePaths: string[] }) => {
      const path = res.tempFilePaths?.[0]
      if (path) form.media.emotionAnimations[idx].animationUrl = path
    },
  })
}

function makeLoreEntry(): LorebookEntryUI {
  return {
    id: generateUUID(),
    keywords: [],
    keywordInput: '',
    content: '',
    order: 0,
    enabled: true,
    position: 0,
    depth: 0,
    role: 0,
    characterName: undefined,
  }
}

function makeWorldBookEntry(): WorldBookEntryUI {
  return {
    id: generateUUID(),
    keywords: [],
    keywordInput: '',
    content: '',
    order: 0,
    enabled: true,
    position: 0,
    depth: 0,
    role: 0,
    probability: 100,
    comment: '',
  }
}

function makeWorldBook(): WorldBookUI {
  return {
    id: generateUUID(),
    name: '',
    entries: [],
    scanRange: 100,
    _expanded: true,
  }
}

function syncWorldBookKeywords(entry: WorldBookEntryUI) {
  entry.keywords = entry.keywordInput
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function addWorldBook() {
  const name = window.prompt('输入世界书名称')
  if (name?.trim()) {
    const wb = makeWorldBook()
    wb.name = name.trim()
    form.worldBooks.push(wb)
  }
}

function removeWorldBook(idx: number) {
  form.worldBooks.splice(idx, 1)
}

function addWorldBookEntry(wb: WorldBookUI) {
  wb.entries.push(makeWorldBookEntry())
}

function removeWorldBookEntry(wb: WorldBookUI, idx: number) {
  wb.entries.splice(idx, 1)
}

function moveWorldBookEntry(wb: WorldBookUI, idx: number, dir: -1 | 1) {
  const arr = wb.entries
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= arr.length) return
  const temp = arr[idx]
  arr[idx] = arr[newIdx]
  arr[newIdx] = temp
}

function syncLoreKeywords(entry: LorebookEntryUI) {
  entry.keywords = entry.keywordInput
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function addLoreEntry() {
  form.lorebook.entries.push(makeLoreEntry())
}

function removeLoreEntry(idx: number) {
  form.lorebook.entries.splice(idx, 1)
}

function moveLoreEntry(idx: number, dir: -1 | 1) {
  const arr = form.lorebook.entries
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= arr.length) return
  const temp = arr[idx]
  arr[idx] = arr[newIdx]
  arr[newIdx] = temp
}

function addAltGreeting() {
  if (form.alternateGreetings.length >= 10) return
  form.alternateGreetings.push('')
}

function removeAltGreeting(idx: number) {
  form.alternateGreetings.splice(idx, 1)
}

function buildPersona(): CharacterPersona | undefined {
  const anchor = form.persona.anchor.trim()
  const traitsRaw = form.persona.traits.trim()
  const voice = form.persona.voice.trim()
  if (!anchor && !traitsRaw && !voice) return undefined
  const traits = traitsRaw
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean)
  return {
    anchor: anchor || '',
    traits: traits.length ? traits : [],
    voice: voice || '',
  }
}

function buildLorebook(): Lorebook | undefined {
  if (form.lorebook.entries.length === 0) return undefined
  const entries: LorebookEntry[] = form.lorebook.entries.map(e => ({
    id: e.id,
    keywords: e.keywordInput
      .split(/[,，]/)
      .map(s => s.trim())
      .filter(Boolean),
    content: e.content,
    order: e.order,
    enabled: e.enabled,
    position: e.position as LorebookEntry['position'],
    depth: e.depth,
    role: e.role === 1 ? 'user' : e.role === 2 ? 'assistant' : 'system',
    characterName: e.characterName,
  }))
  return {
    entries,
    scanRange: Number(form.lorebook.scanRange) || 100,
  }
}

function buildWorldBooks(): WorldBook[] | undefined {
  if (form.worldBooks.length === 0) return undefined
  return form.worldBooks.map(wb => ({
    id: wb.id,
    name: wb.name,
    scanRange: Number(wb.scanRange) || 100,
    entries: wb.entries.map(e => ({
      id: e.id,
      keywords: e.keywordInput
        .split(/[,，]/)
        .map(s => s.trim())
        .filter(Boolean),
      content: e.content,
      order: e.order,
      enabled: e.enabled,
      position: e.position as WorldBookEntry['position'],
      depth: e.depth,
      role: e.role as WorldBookEntry['role'],
      probability: Number(e.probability) || 100,
      comment: e.comment || undefined,
    })),
  }))
}

function buildDepthPrompt(): DepthPrompt | undefined {
  if (!form.depthPrompt.prompt.trim()) return undefined
  return {
    depth: Number(form.depthPrompt.depth) || 4,
    prompt: form.depthPrompt.prompt.trim(),
    role: form.depthPrompt.role,
  }
}

function buildPreviewCharacter(): Partial<ICharacter> {
  return {
    name: form.name.trim() || '未命名角色',
    avatar: form.avatar || undefined,
    background: form.background.trim() || undefined,
    description: form.description.trim(),
    greeting: form.greeting.trim() || undefined,
    settings: form.settings.trim(),
    mode: resolvedMode.value,
    category: form.category || undefined,
    subCategory: form.subCategory || undefined,
    scenario: form.scenario.trim() || undefined,
    persona: buildPersona(),
    lorebook: buildLorebook(),
    worldBooks: buildWorldBooks(),
    depthPrompt: buildDepthPrompt(),
  }
}

function previewCharacter() {
  if (!form.name.trim() || !form.settings.trim()) {
    uni.showToast({ title: '请至少填写角色名称和整体设定', icon: 'none' })
    return
  }
  const char = buildPreviewCharacter()
  const encoded = encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(char))))
  uni.navigateTo({ url: '/character/preview?data=' + encoded })
}

async function onSubmit() {
  if (!canSubmit.value || !isFormValid.value) {
    uni.showToast({ title: '请填写必填项', icon: 'none' })
    // 自动滚动到第一个错误字段
    const firstErrorField = document.querySelector('.invalid') as HTMLElement | null
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      firstErrorField.focus?.()
    }
    return
  }

  const c = originalCharacter.value
  if (!c) {
    uni.showToast({ title: '角色数据丢失', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const updated: ICharacter = {
      ...c,
      name: form.name.trim(),
      avatar: form.avatar || undefined,
      background: form.background.trim() || undefined,
      description: form.description.trim(),
      greeting: form.greeting.trim() || undefined,
      settings: form.settings.trim(),
      sceneTime: form.sceneTime.trim() || undefined,
      mode: resolvedMode.value,
      category: form.category || undefined,
      subCategory: form.subCategory || undefined,
      scenario: form.scenario.trim() || undefined,
      persona: buildPersona(),
      lorebook: buildLorebook(),
      worldBooks: buildWorldBooks(),
      depthPrompt: buildDepthPrompt(),
      alternateGreetings: form.alternateGreetings.filter(g => g.trim()).length
        ? form.alternateGreetings.filter(g => g.trim())
        : undefined,
      chatBackground: form.media.chatBackground || undefined,
      globalBackground: form.media.globalBackground || undefined,
      switchAnimation: form.media.switchAnimation || undefined,
      emotionAnimations: form.media.emotionAnimations.filter(e => e.emotion.trim() && e.animationUrl).length
        ? form.media.emotionAnimations.filter(e => e.emotion.trim() && e.animationUrl)
        : undefined,
      gameData: form.gameData || undefined,
      personality: form.personality,
      behavior: form.behavior,
      values: form.values,
      exampleDialogue: form.exampleDialogue,
      tags: [form.category, form.subCategory, form.themeType, ...form.customTags].filter(Boolean),
      updatedAt: Date.now(),
    }

    await characterStore.updateCharacter(updated)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => goBack(), 800)
  } catch (err) {
    console.error(err)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
$sky: #38bdf8;
$sky-light: #7dd3fc;
$mint: #34d399;

.character-edit-page {
  min-height: 100vh;
  padding: 0 0 100px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
}

.page-title {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.header-placeholder { display: block; width: 48px; height: 48px; }

.back-btn {
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px; height: 48px; padding: 0;
  border: none; background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);
  &:hover { opacity: 0.78; }
  &:active { transform: scale(0.95); }
}
.back-icon { width: 22px; height: 22px; }

.form-body {
  width: min(960px, calc(100% - 32px));
  margin: 16px auto 0;
}

.field-block { margin-bottom: 18px; }

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.field-hint {
  display: block;
  margin-top: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.6;
  text-align: right;
}

.chip-row { display: flex; flex-wrap: wrap; gap: 10px; }

.category-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  &:focus { outline: none; border-color: rgba(56, 189, 248, 0.36); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.category-chip {
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.06);
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:hover { background: rgba(52, 211, 153, 0.12); color: var(--text-primary); }
  &.active {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.82), rgba(52, 211, 153, 0.78));
    border-color: transparent; color: #fff; font-weight: 700;
  }
  &.theme-chip {
    border-color: rgba(56, 189, 248, 0.18); background: rgba(56, 189, 248, 0.08);
    &:hover { background: rgba(56, 189, 248, 0.15); }
    &.active {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.80));
      border-color: transparent; color: #fff; font-weight: 700;
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.30);
    }
  }
}

.section-block {
  margin-top: 0;
  padding: 4px 0;
  border-top: none;
}

.section-block + .section-block {
  margin-top: 0;
}

.section-title {
  margin: 0 0 12px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.avatar-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.avatar-wrapper {
  width: 64px; height: 64px; border-radius: 50%; overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.2); flex-shrink: 0;
  cursor: pointer;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.2));
  color: var(--text-tertiary); font-size: 22px; font-weight: 600;
}
.avatar-actions { display: flex; gap: 8px; }
.avatar-btn {
  padding: 5px 12px;
  border: 1px solid rgba(52, 211, 153, 0.12); border-radius: 6px;
  background: transparent; color: var(--text-tertiary);
  font: inherit; font-size: 12px; cursor: pointer;
  transition: all 0.15s;
  display: inline-flex; align-items: center; gap: 4px;
  &:hover { border-color: rgba(52, 211, 153, 0.3); color: #6ee7b7; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.media-upload-row {
  display: flex; align-items: center; gap: 8px; margin-top: 4px;
}

.remove-media-btn {
  border-color: rgba(248, 113, 113, 0.15);
  &:hover { border-color: rgba(248, 113, 113, 0.3); color: rgba(248, 113, 113, 0.8); }
}

.media-preview {
  margin-top: 6px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  max-height: 120px;
  &.small { max-height: 80px; }

  img {
    width: 100%;
    max-height: 120px;
    object-fit: cover;
    display: block;
  }
}

.emotion-add-btn {
  margin-top: 4px;
}

.emotion-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
}

.emotion-input {
  flex: 1;
}

.emotion-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.user-textarea {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  resize: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-bottom-color: rgba(56, 189, 248, 0.4);
  }
}

.settings-input {
  min-height: 160px;
}

.field-item { display: flex; flex-direction: column; gap: 0; }
.field-item .field-label {
  padding: 0 2px;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-bottom: 4px;
}
.field-item .required { color: rgba(248, 113, 113, 0.7); }
.field-input {
  width: 100%; padding: 7px 0;
  border: none; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0; background: transparent;
  color: var(--text-primary); font: inherit; font-size: 14px;
  line-height: 1.4; box-sizing: border-box; outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
}

.field-select {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  padding-right: 16px;
  transition: border-color 0.2s;
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.section-body {
  display: flex; flex-direction: column; gap: 12px;
  padding-top: 4px;
}

.empty-hint {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
  padding: 12px 0;
}

.number-input {
  width: 80px;
  text-align: center;
}

.lore-entry-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.lore-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lore-entry-index {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.lore-entry-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(56, 189, 248, 0.3);
    color: var(--text-secondary);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &.danger {
    border-color: rgba(248, 113, 113, 0.1);

    &:hover {
      border-color: rgba(248, 113, 113, 0.3);
      color: rgba(248, 113, 113, 0.8);
    }
  }
}

.lore-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.lore-toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s;

  &::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-tertiary);
    transition: transform 0.2s;
  }
}

.lore-toggle input:checked + .lore-toggle-slider {
  background: rgba(52, 211, 153, 0.35);

  &::before {
    transform: translateX(16px);
    background: #34d399;
  }
}

.lore-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;

  &.two-col {
    grid-template-columns: 1fr 1fr;
  }
}

.add-entry-btn {
  align-self: flex-start;
  margin-top: 4px;
}

.alt-greeting-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  .greeting-textarea {
    flex: 1;
  }
}

.inline-field {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;

  .field-label {
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .field-input {
    width: auto;
    flex-shrink: 0;
  }
}

/* ── World Book ── */
.world-book-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
}

.world-book-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.world-book-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.world-book-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.world-book-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.world-book-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.expand-icon {
  transition: transform 0.2s;
  color: var(--text-tertiary);

  &.expanded {
    transform: rotate(180deg);
  }
}

.world-book-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.game-preview {
  margin: 4px 0 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
}

.submit-bar {
  position: sticky; bottom: 0; z-index: 10;
  width: min(960px, calc(100% - 32px));
  margin: 24px auto 0;
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(transparent, rgba(5, 13, 20, 0.95) 30%);
}

.submit-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.submit-row .primary-btn.full {
  flex: 1;
}

.outline-btn {
  min-height: 48px;
  padding: 0 20px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 14px;
  background: transparent;
  color: var(--primary-light);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: rgba(56, 189, 248, 0.08);
    border-color: rgba(56, 189, 248, 0.55);
  }

  &:active {
    background: rgba(56, 189, 248, 0.14);
  }
}

.custom-tags-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.18));
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(248, 113, 113, 0.5);
  }
}

.tag-input {
  flex: 1;
  min-width: 80px;
  padding: 4px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
}

.char-count {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: right;

  &.error {
    color: rgba(248, 113, 113, 0.7);
  }
}

.error-text {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(248, 113, 113, 0.8);
}

.field-input.invalid {
  border-bottom-color: rgba(248, 113, 113, 0.5) !important;
}

.user-textarea.invalid {
  border-bottom-color: rgba(248, 113, 113, 0.5) !important;
}

.primary-btn.full {
  width: 100%; min-height: 48px; border: none; border-radius: 14px;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff; font: inherit; font-size: 16px; font-weight: 600;
  cursor: pointer; box-shadow: 0 6px 18px rgba(56, 189, 248, 0.28);
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(56, 189, 248, 0.40); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
}

.world-book-actions-row { display: flex; gap: 8px; flex-wrap: wrap; }
.hidden-file-input { display: none; }

@media (max-width: 720px) {
  .form-body {
    width: calc(100% - 20px);
  }
  .submit-bar {
    width: calc(100% - 24px);
  }
}
</style>
