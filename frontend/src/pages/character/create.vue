<template>
  <div class="create-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="onBack">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="page-title">{{ pageTitle }}</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- Step 0: 入口选择页                                      -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section v-if="step === 'choose'" class="step-choose">
      <div class="choose-container">
        <h2 class="choose-title">🌟 创建新角色 🌟</h2>
        <div class="choose-cards">
          <button type="button" class="entry-card quick-card" @click="goQuick">
            <span class="entry-emoji">🚀</span>
            <span class="entry-title">快速开始</span>
            <span class="entry-desc">一句话描述，AI生成<br>或选择预设模板</span>
          </button>
          <button type="button" class="entry-card manual-card" @click="goManual">
            <span class="entry-emoji">🧩</span>
            <span class="entry-title">角色创建</span>
            <span class="entry-desc">自由角色卡片化封装<br>低级/高级设定集中配置</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- Step 1A: 快速创建页                                     -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section v-else-if="step === 'quick'" class="step-quick">
      <div class="quick-tabs">
        <button type="button" class="quick-tab" :class="{ active: quickMode === 'template' }" @click="quickMode = 'template'">🧩 角色创建</button>
        <button type="button" class="quick-tab" :class="{ active: quickMode === 'ai' }" @click="quickMode = 'ai'">🤖 AI生成</button>
      </div>
      <div v-if="quickMode === 'template'" class="template-grid">
        <button v-for="preset in characterPresets" :key="preset.id" type="button"
          class="template-card" :style="{ background: presetGradient(preset.id) }" @click="applyPresetAndGo(preset)">
          <span class="template-emoji">{{ preset.icon }}</span>
          <div class="template-info">
            <span class="template-name">{{ preset.name }}</span>
            <span class="template-desc">{{ preset.description }}</span>
          </div>
          <svg class="template-arrow" viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div v-else class="ai-panel">
        <div class="ai-header">🤖 AI 角色生成器</div>
        <textarea v-model="aiDescription" class="ai-textarea" rows="6"
          placeholder="描述你想要的角色，例如：&#10;一个傲娇的猫耳女仆，说话带喵，喜欢捉弄主人" maxlength="200" />
        <div class="ai-count">{{ aiDescription.length }}/200</div>
        <div class="ai-section">
          <div class="ai-label">风格倾向（可多选）</div>
          <div class="chip-row">
            <button v-for="tag in styleTagOptions" :key="tag" type="button" class="style-chip"
              :class="{ active: aiStyleTags.includes(tag) }" @click="toggleStyleTag(tag)">{{ tag }}</button>
          </div>
        </div>
        <div class="ai-section">
          <div class="ai-label">互动类型</div>
          <div class="chip-row">
            <button v-for="type in interactionTypeOptions" :key="type" type="button" class="style-chip"
              :class="{ active: aiInteractionType === type }" @click="aiInteractionType = type">{{ type }}</button>
          </div>
        </div>
        <button type="button" class="advanced-toggle" @click="showAdvancedOptions = !showAdvancedOptions">
          高级选项 {{ showAdvancedOptions ? '▲' : '▼' }}
        </button>
        <div v-if="showAdvancedOptions" class="advanced-options">
          <div class="slider-row">
            <label>创意度</label>
            <input v-model.number="aiCreativity" type="range" min="1" max="10" />
            <span class="slider-value">{{ aiCreativity }}</span>
          </div>
          <div class="slider-row">
            <label>详细度</label>
            <input v-model.number="aiDetailLevel" type="range" min="1" max="10" />
            <span class="slider-value">{{ aiDetailLevel }}</span>
          </div>
        </div>
        <button type="button" class="ai-generate-btn" :disabled="aiGenerating" @click="handleAIGenerate">
          {{ aiGenerating ? '生成中…' : '🚀 生成角色' }}
        </button>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- Step 1B / Step 2: 编辑器（8卡片布局）                    -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <main v-else class="editor-body">
      <div v-if="step === 'preview' && previewSourceLabel" class="source-badge">{{ previewSourceLabel }}</div>

      <Character
        v-model:tier="freeSettingTier"
        :is-free-dialogue-category="isFreeDialogueCategory"
        :has-classification-tags="hasClassificationTags"
        :has-role-content="hasRoleContent"
      >
        <template #top>
          <!-- 基础信息区（头像+名称+描述+开场白） -->
          <section class="base-info-section" :class="{ 'compact-avatar-name': isCompactTopCategory }">
            <div class="base-row">
              <div class="avatar-upload" @click="showAvatarSheet">
                <img v-if="avatarPreview" :src="avatarPreview" alt="头像" class="avatar-img" />
                <div v-else class="avatar-placeholder">{{ form.name?.charAt(0) || '?' }}</div>
                <div class="avatar-hint">点击上传</div>
              </div>
              <div class="base-fields">
                <input v-model="form.name" type="text" class="field-input" placeholder="角色名称" maxlength="50" />
                <input v-if="!isCompactTopCategory" v-model="templateData.description" type="text" class="field-input" placeholder="一句话描述" />
              </div>
            </div>
            <textarea v-if="!isCompactTopCategory" v-model="templateData.greeting" class="field-textarea auto-textarea" rows="2" placeholder="开场白（角色第一次打招呼的内容）" @input="onTextareaInput" />
          </section>
        </template>

        <template #classification>
          <div class="field-item">
            <label class="field-label">分类</label>
            <select v-model="form.category" class="category-select">
              <option v-for="group in categoryGroups" :key="group.label" :value="group.label">{{ group.label }}</option>
            </select>
          </div>
          <div class="field-item">
            <label class="field-label">子分类</label>
            <div v-if="subCategories.length" class="chip-row">
              <button v-for="item in subCategories" :key="item" type="button" class="category-chip" :class="{ active: form.subCategory === item }" @click="form.subCategory = item">{{ item }}</button>
            </div>
            <div v-else class="chip-empty">当前分类没有子分类</div>
          </div>
          <div class="field-item">
            <label class="field-label">主题</label>
            <select v-model="form.themeGroup" class="category-select">
              <option value="">选择主题大类</option>
              <option v-for="tg in themeGroups" :key="tg.label" :value="tg.label">{{ tg.label }}</option>
            </select>
          </div>
          <div class="field-item">
            <label class="field-label">主题细类</label>
            <div v-if="currentThemeLeaves.length" class="chip-row">
              <button v-for="leaf in currentThemeLeaves" :key="leaf" type="button" class="category-chip theme-chip" :class="{ active: form.themeType === leaf }" @click="form.themeType = leaf">{{ leaf }}</button>
            </div>
            <div v-else class="chip-empty">{{ form.themeGroup ? '当前主题没有细类' : '选择主题后显示主题细类' }}</div>
          </div>
          <div class="field-item">
            <label class="field-label">自定义标签</label>
            <div class="custom-tags-row">
              <div class="tag-chip" v-for="(tag, idx) in customTags" :key="tag + idx">
                <span>{{ tag }}</span>
                <button type="button" class="tag-remove" @click="removeCustomTag(idx)">
                  <svg viewBox="0 0 24 24" width="10" height="10"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
                </button>
              </div>
              <input v-if="customTags.length < 10" v-model="tagInput" type="text" class="tag-input" placeholder="输入标签，回车添加" maxlength="20" @keydown.enter.prevent="addCustomTag" />
            </div>
            <p class="field-hint">{{ customTags.length }}/10 个标签，每个最多20字符</p>
          </div>
        </template>

        <template #basic>
        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 1. 🏷️ 基础信息                                           -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'basic'" class="config-card role-basic-card" :class="{ filled: hasBaseInfo }" @click="!isFreeDialogueCategory && toggleCard('base')">
          <div class="card-header">
            <span class="card-emoji">🏷️</span>
            <div class="card-meta">
              <span class="card-title">基础信息</span>
              <span class="card-status">{{ hasBaseInfo ? '已填写' : '未填写' }}</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.base" class="card-body" @click.stop>
            <!-- 负向特征 -->
            <div class="field-item">
              <label class="field-label">负向特征与行为禁忌</label>
              <div v-for="(nt, idx) in negativeTraits" :key="nt.id" class="list-item-row">
                <input v-model="nt.content" type="text" class="field-input" placeholder="如：绝不主动道歉" />
                <button type="button" class="icon-btn danger" @click="removeNegativeTrait(idx)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <button type="button" class="avatar-btn add-entry-btn" @click="addNegativeTrait">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加
              </button>
            </div>
            <!-- 物理特征 -->
            <div class="field-item">
              <label class="field-label">客观物理特征清单</label>
              <div v-for="(pf, idx) in physicalFeatures" :key="pf.id" class="list-item-row">
                <input v-model="pf.content" type="text" class="field-input" placeholder="如：蓝眼睛、左手有旧伤" />
                <button type="button" class="icon-btn danger" @click="removePhysicalFeature(idx)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <button type="button" class="avatar-btn add-entry-btn" @click="addPhysicalFeature">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加
              </button>
            </div>
            <!-- 语言习惯 -->
            <div class="field-item">
              <label class="field-label">语言习惯与语用特征</label>
              <div v-for="(sp, idx) in speechPatterns" :key="sp.id" class="list-item-row speech-row">
                <select v-model="sp.category" class="field-select speech-cat-select">
                  <option value="sentence-length">句子长度</option>
                  <option value="catchphrase">口头禅</option>
                  <option value="interjection">感叹词</option>
                  <option value="slang">俚语</option>
                  <option value="address">称呼方式</option>
                  <option value="rhetorical-question">反问句</option>
                  <option value="other">其他</option>
                </select>
                <input v-model="sp.content" type="text" class="field-input" placeholder="语言特征描述" />
                <button type="button" class="icon-btn danger" @click="removeSpeechPattern(idx)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <button type="button" class="avatar-btn add-entry-btn" @click="addSpeechPattern">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加
              </button>
            </div>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('base')">收起</button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 2. 📝 整体设定                                           -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'basic'" class="config-card role-basic-card" :class="{ filled: hasTemplateFields }" @click="!isFreeDialogueCategory && toggleCard('overallSettings')">
          <div class="card-header">
            <span class="card-emoji">📝</span>
            <div class="card-meta">
              <span class="card-title">整体设定</span>
              <span class="card-status">{{ hasTemplateFields ? '已填写' : '未填写' }}</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.overallSettings" class="card-body" @click.stop>
            <div class="template-fields">
              <TemplateFieldRenderer v-for="field in activeTemplate.basicFields" :key="field.key" :field="field"
                :model-value="templateData[field.key] ?? (field.type === 'chip-select' ? [] : '')"
                @update:model-value="updateTemplateField(field.key, $event)" />
              <TemplateFieldRenderer v-for="field in activeTemplate.advancedFields" :key="field.key" :field="field"
                :model-value="templateData[field.key] ?? (field.type === 'chip-select' ? [] : '')"
                @update:model-value="updateTemplateField(field.key, $event)" />
              <TemplateFieldRenderer v-for="field in activeTemplate.specialFields" :key="field.key" :field="field"
                :model-value="templateData[field.key] ?? (field.type === 'chip-select' ? [] : '')"
                @update:model-value="updateTemplateField(field.key, $event)" />
            </div>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('overallSettings')">收起</button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 3. 🎭 结构化人设                                         -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'basic'" class="config-card role-basic-card" :class="{ filled: hasPersona }" @click="!isFreeDialogueCategory && toggleCard('persona')">
          <div class="card-header">
            <span class="card-emoji">🎭</span>
            <div class="card-meta">
              <span class="card-title">结构化人设</span>
              <span class="card-status">{{ hasPersona ? '已填写' : '未填写' }}</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.persona" class="card-body" @click.stop>
            <div class="field-item">
              <label class="field-label">身份锁（锚点）</label>
              <textarea v-model="personaData.anchor" class="field-textarea auto-textarea" rows="2" placeholder="角色的核心身份锚点，用于锁定角色本质" @input="onTextareaInput" />
            </div>
            <div class="field-item">
              <label class="field-label">性格特质</label>
              <textarea v-model="personaData.traits" class="field-textarea auto-textarea" rows="2" placeholder="用逗号分隔的性格特征列表" @input="onTextareaInput" />
            </div>
            <div class="field-item">
              <label class="field-label">交流风格</label>
              <textarea v-model="personaData.voice" class="field-textarea auto-textarea" rows="2" placeholder="说话方式、语气、口头禅等" @input="onTextareaInput" />
            </div>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('persona')">收起</button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 4. 🖼️ 媒体设定                                           -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'basic'" class="config-card role-basic-card" :class="{ filled: hasMedia }" @click="!isFreeDialogueCategory && toggleCard('media')">
          <div class="card-header">
            <span class="card-emoji">🖼️</span>
            <div class="card-meta">
              <span class="card-title">媒体设定</span>
              <span class="card-status">{{ hasMedia ? '已设置' : '未设置' }}</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.media" class="card-body" @click.stop>
            <div class="field-item">
              <label class="field-label">宏观画风</label>
              <label class="lore-toggle-row">
                <span>启用聊天中生成图片</span>
                <span class="lore-toggle">
                  <input v-model="mediaWeightsData.enableChatImageGeneration" type="checkbox" />
                  <span class="lore-toggle-slider"></span>
                </span>
              </label>
              <div class="lore-grid two-col">
                <div class="field-item">
                  <label class="field-label">宏观画风描述</label>
                  <input v-model="mediaWeightsData.artStyle" type="text" class="field-input" placeholder="如：赛博朋克、水墨风" />
                </div>
                <div class="field-item">
                  <label class="field-label">视觉风格权重（%）</label>
                  <input v-model.number="mediaWeightsData.qualityWeight" type="number" class="field-input" min="0" max="100" />
                </div>
              </div>
              <div v-if="mediaWeightsData.enableChatImageGeneration" class="style-config-list">
                <div v-for="(style, idx) in (mediaWeightsData.artStyleMix || [])" :key="style.id" class="tts-config-row">
                  <div class="lore-grid two-col">
                    <div class="field-item">
                      <label class="field-label">画风条目</label>
                      <input v-model="style.styleName" type="text" class="field-input" placeholder="如：胶片感、厚涂、清透水彩" />
                    </div>
                    <div class="field-item">
                      <label class="field-label">权重%</label>
                      <input v-model.number="style.weight" type="number" class="field-input" min="0" max="100" placeholder="100" />
                    </div>
                  </div>
                  <div class="ed-header">
                    <span class="lore-entry-index">画风 {{ idx + 1 }}</span>
                    <button type="button" class="icon-btn danger" @click="removeArtStyleConfig(idx)">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <button type="button" class="avatar-btn add-entry-btn" @click="addArtStyleConfig">
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加画风
                </button>
              </div>
            </div>
            <div class="field-item">
              <label class="field-label">封面图</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadCoverImage">上传图片</button>
                <button v-if="form.coverImage" type="button" class="avatar-btn remove-media-btn" @click="form.coverImage = ''">移除</button>
              </div>
              <div v-if="form.coverImage" class="media-preview"><img :src="getAssetUrl(form.coverImage)" alt="封面图" /></div>
            </div>
            <div class="field-item">
              <label class="field-label">角色背景图</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadMedia('chatBackground')">上传图片</button>
                <button v-if="mediaData.chatBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.chatBackground = ''">移除</button>
              </div>
              <div v-if="mediaData.chatBackground" class="media-preview"><img :src="getAssetUrl(mediaData.chatBackground)" alt="角色背景图" /></div>
            </div>
            <div class="field-item">
              <label class="field-label">整体聊天背景</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadMedia('globalBackground')">上传图片</button>
                <button v-if="mediaData.globalBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.globalBackground = ''">移除</button>
              </div>
              <div v-if="mediaData.globalBackground" class="media-preview"><img :src="getAssetUrl(mediaData.globalBackground)" alt="整体背景" /></div>
            </div>
            <div class="field-item">
              <label class="field-label">对话全局动态视频</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadVideoBackground">上传视频</button>
                <button v-if="mediaData.globalVideoBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.globalVideoBackground = ''">移除</button>
              </div>
              <div v-if="mediaData.globalVideoBackground" class="media-preview">
                <video :src="mediaData.globalVideoBackground" muted loop playsinline controls></video>
              </div>
            </div>
            <div class="field-item">
              <label class="field-label">角色情感表达动图</label>
              <button type="button" class="avatar-btn emotion-add-btn" @click="addEmotion">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加情感
              </button>
              <div v-for="(ea, idx) in emotionAnimations" :key="idx" class="emotion-row">
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
            <div class="field-item">
              <label class="field-label">基于亲密度的动态媒体触发机制</label>
              <div v-for="(trigger, idx) in intimacyTriggers" :key="trigger.id" class="intimacy-trigger-row">
                <div class="lore-grid two-col">
                  <div class="field-item">
                    <label class="field-label">亲密度阈值</label>
                    <input v-model.number="trigger.intimacyLevel" type="number" class="field-input" min="0" max="100" />
                  </div>
                  <div class="field-item">
                    <label class="field-label">媒体类型</label>
                    <select v-model="trigger.mediaType" class="field-select">
                      <option value="sticker">贴纸</option>
                      <option value="meme">表情包</option>
                      <option value="animation">动画</option>
                      <option value="background">背景</option>
                      <option value="tts-voice">TTS音色</option>
                    </select>
                  </div>
                </div>
                <div class="field-item">
                  <label class="field-label">触发文案</label>
                  <input v-model="trigger.triggerText" type="text" class="field-input" placeholder="触发后显示的文案" />
                </div>
                <div class="ed-header">
                  <span class="lore-entry-index">触发 {{ idx + 1 }}</span>
                  <button type="button" class="icon-btn danger" @click="removeIntimacyTrigger(idx)">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
              </div>
              <button type="button" class="avatar-btn add-entry-btn" @click="addIntimacyTrigger">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加触发
              </button>
            </div>
            <div class="field-item">
              <label class="field-label">TTS音色</label>
              <select v-model="ttsMode" class="field-select">
                <option value="">先选择音色方案</option>
                <option value="voice-clone">声音克隆</option>
                <option value="single">单音色</option>
                <option value="multi">多音色混合</option>
                <option value="emotion">情感音色</option>
              </select>
              <p class="field-hint">当前仅保存方案选择，具体生成与克隆逻辑后续接入。</p>
              <template v-if="ttsMode && ttsMode !== 'voice-clone'">
                <div v-for="(tts, idx) in ttsConfigs" :key="idx" class="tts-config-row">
                  <div class="lore-grid two-col">
                    <div class="field-item">
                      <label class="field-label">音色名称</label>
                      <input v-model="tts.voiceName" type="text" class="field-input" placeholder="如：alloy、shimmer" />
                    </div>
                    <div class="field-item">
                      <label class="field-label">权重%</label>
                      <input v-model.number="tts.weight" type="number" class="field-input" min="0" max="100" placeholder="100" />
                    </div>
                  </div>
                  <div class="ed-header">
                    <span class="lore-entry-index">音色 {{ idx + 1 }}</span>
                    <button type="button" class="icon-btn danger" @click="removeTtsConfig(idx)">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </template>
              <button v-if="ttsMode && ttsMode !== 'voice-clone'" type="button" class="avatar-btn add-entry-btn" @click="addTtsConfig">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加音色
              </button>
            </div>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('media')">收起</button>
          </div>
        </div>

        </template>
        <template #advanced>
        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 4. 📚 知识书                                             -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'advanced'" class="config-card role-advanced-card" :class="{ filled: lorebookData.entries.length > 0 }" @click="!isFreeDialogueCategory && toggleCard('lorebook')">
          <div class="card-header">
            <span class="card-emoji">📚</span>
            <div class="card-meta">
              <span class="card-title">知识书</span>
              <span class="card-status">{{ lorebookData.entries.length }} 个词条</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.lorebook" class="card-body" @click.stop>
            <p class="card-desc">知识书用于存储与角色相关的背景知识。当对话中提到特定关键词时，系统会自动插入对应的词条内容，帮助 AI 更好地理解和回应。</p>
            <div class="field-item inline-field">
              <label class="field-label">扫描消息数</label>
              <input v-model.number="lorebookData.scanRange" type="number" class="field-input number-input" min="1" max="9999" />
            </div>
            <div v-if="lorebookData.entries.length === 0" class="empty-hint">点击添加词条</div>
            <div v-for="(entry, idx) in lorebookData.entries" :key="entry.id" class="lore-entry-card">
              <div class="lore-entry-header">
                <span class="lore-entry-index">词条 {{ idx + 1 }}</span>
                <div class="lore-entry-actions">
                  <button type="button" class="icon-btn" :disabled="idx === 0" @click="moveLoreEntry(idx, -1)">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 15l-6-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                  <button type="button" class="icon-btn" :disabled="idx === lorebookData.entries.length - 1" @click="moveLoreEntry(idx, 1)">
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
                <textarea v-model="entry.content" class="field-textarea auto-textarea" rows="3" placeholder="词条内容，匹配关键词时注入到对话中" @input="onTextareaInput" />
              </div>
              <div class="lore-grid">
                <div class="field-item">
                  <label class="field-label">插入位置</label>
                  <select v-model.number="entry.position" class="field-select">
                    <option :value="0">对话前</option><option :value="1">对话后</option>
                    <option :value="2">主提示词顶部</option><option :value="3">主提示词底部</option>
                    <option :value="4">作者注释顶部</option><option :value="5">作者注释底部</option>
                    <option :value="6">深度位置</option><option :value="7">出口</option>
                  </select>
                </div>
                <div class="field-item">
                  <label class="field-label">深度</label>
                  <input v-model.number="entry.depth" type="number" class="field-input" :disabled="entry.position !== 6" min="0" max="99" />
                </div>
                <div class="field-item">
                  <label class="field-label">角色</label>
                  <select v-model.number="entry.role" class="field-select">
                    <option :value="0">system</option><option :value="1">user</option><option :value="2">assistant</option>
                  </select>
                </div>
                <div class="field-item">
                  <label class="field-label">优先级</label>
                  <input v-model.number="entry.order" type="number" class="field-input" min="0" max="999" />
                </div>
              </div>
              <!-- 新增字段 -->
              <div class="lore-grid two-col">
                <div class="field-item">
                  <label class="field-label">动态角色注释/心理锚点</label>
                  <input v-model="entry.dynamicAnchor" type="text" class="field-input" placeholder="可选" />
                </div>
                <div class="field-item">
                  <label class="field-label">用户画像与长期关系演算</label>
                  <input v-model="entry.userPersona" type="text" class="field-input" placeholder="可选" />
                </div>
              </div>
            </div>
            <button type="button" class="avatar-btn add-entry-btn" @click="addLoreEntry">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加词条
            </button>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('lorebook')">收起</button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 5. 🌍 世界书                                             -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'advanced'" class="config-card role-advanced-card" :class="{ filled: worldBooksData.length > 0 }" @click="!isFreeDialogueCategory && toggleCard('worldBooks')">
          <div class="card-header">
            <span class="card-emoji">🌍</span>
            <div class="card-meta">
              <span class="card-title">世界书</span>
              <span class="card-status">{{ worldBooksData.length }} 本书</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.worldBooks" class="card-body" @click.stop>
            <p class="card-desc">世界书用于存储与角色相关的背景知识。当对话中提到特定关键词时，系统会自动插入对应的词条内容，帮助 AI 更好地理解和回应。</p>
            <div v-if="worldBooksData.length === 0" class="empty-hint">暂无世界书，点击添加</div>
            <div v-for="(wb, wIdx) in worldBooksData" :key="wb.id" class="world-book-card">
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
                <div v-if="wb.entries.length === 0" class="empty-hint">点击添加词条</div>
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
                    <textarea v-model="entry.content" class="field-textarea auto-textarea" rows="3" placeholder="词条内容，匹配关键词时注入到对话中" @input="onTextareaInput" />
                  </div>
                  <div class="lore-grid">
                    <div class="field-item">
                      <label class="field-label">插入位置</label>
                      <select v-model.number="entry.position" class="field-select">
                        <option :value="0">对话前</option><option :value="1">对话后</option>
                        <option :value="2">主提示词顶部</option><option :value="3">主提示词底部</option>
                        <option :value="4">作者注释顶部</option><option :value="5">作者注释底部</option>
                        <option :value="6">深度位置</option><option :value="7">出口</option>
                      </select>
                    </div>
                    <div class="field-item">
                      <label class="field-label">深度</label>
                      <input v-model.number="entry.depth" type="number" class="field-input" :disabled="entry.position !== 6" min="0" max="99" />
                    </div>
                    <div class="field-item">
                      <label class="field-label">角色</label>
                      <select v-model.number="entry.role" class="field-select">
                        <option :value="0">system</option><option :value="1">user</option><option :value="2">assistant</option>
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
                  <!-- 新增字段 -->
                  <div class="lore-grid two-col">
                    <div class="field-item">
                      <label class="field-label">动态角色注释/心理锚点</label>
                      <input v-model="entry.dynamicAnchor" type="text" class="field-input" placeholder="可选" />
                    </div>
                    <div class="field-item">
                      <label class="field-label">用户画像与长期关系演算</label>
                      <input v-model="entry.userPersona" type="text" class="field-input" placeholder="可选" />
                    </div>
                  </div>
                  <div class="lore-grid two-col">
                    <div class="field-item">
                      <label class="field-label">契合度/联结度指标</label>
                      <input v-model.number="entry.compatibilityScore" type="number" class="field-input" min="0" max="100" placeholder="0-100" />
                    </div>
                    <div class="field-item">
                      <label class="field-label">关系阶段触发条件</label>
                      <input v-model="entry.relationshipTrigger" type="text" class="field-input" placeholder="可选" />
                    </div>
                  </div>
                </div>
                <button type="button" class="avatar-btn add-entry-btn" @click="addWorldBookEntry(wb)">
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加词条
                </button>
              </div>
            </div>
            <div class="world-book-actions-row">
              <button type="button" class="avatar-btn add-entry-btn" @click="addWorldBook">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加世界书
              </button>
              <button type="button" class="avatar-btn add-entry-btn" @click="triggerImportWorldBook">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> 从文件导入
              </button>
            </div>
            <input ref="worldBookFileInput" type="file" class="hidden-file-input" accept=".json" @change="onWorldBookFileSelected" />
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('worldBooks')">收起</button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 6. 💬 开场白                                              -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'advanced'" class="config-card role-advanced-card" :class="{ filled: greetingCount > 0 }" @click="!isFreeDialogueCategory && toggleCard('greetings')">
          <div class="card-header">
            <span class="card-emoji">💬</span>
            <div class="card-meta">
              <span class="card-title">开场白</span>
              <span class="card-status">{{ greetingCount }} 条</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.greetings" class="card-body" @click.stop>
            <div class="field-item">
              <label class="field-label">主开场白</label>
              <textarea v-model="templateData.greeting" class="field-textarea auto-textarea" rows="2" placeholder="角色第一次打招呼的内容" @input="onTextareaInput" />
            </div>
            <div class="field-item">
              <label class="field-label">备选开场白</label>
              <div v-if="altGreetings.length === 0" class="empty-hint">点击添加备选开场白</div>
              <div v-for="(_, idx) in altGreetings" :key="idx" class="alt-greeting-row">
                <textarea v-model="altGreetings[idx]" class="field-textarea auto-textarea greeting-textarea" rows="2" placeholder="输入备选开场白内容" @input="onTextareaInput" />
                <button type="button" class="icon-btn danger" @click="removeAltGreeting(idx)">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <button v-if="altGreetings.length < 10" type="button" class="avatar-btn add-entry-btn" @click="addAltGreeting">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加备选
              </button>
            </div>
            <!-- 多重情境开场白池 -->
            <div class="field-item">
              <label class="field-label">多重情境开场白池</label>
              <div v-for="(cg, idx) in contextualGreetings" :key="cg.id" class="contextual-greeting-row">
                <div class="cg-header-row">
                  <select v-model="cg.context" class="field-select cg-context-select">
                    <option value="first-meet">初次见面</option>
                    <option value="reunion">重逢</option>
                    <option value="conflict">冲突</option>
                    <option value="comfort">安慰</option>
                    <option value="task-start">任务开始</option>
                    <option value="group-entry">群组加入</option>
                    <option value="other">其他</option>
                  </select>
                  <input v-if="cg.context === 'other'" v-model="cg.contextLabel" type="text" class="field-input cg-label-input" placeholder="自定义情境标签" />
                  <button type="button" class="icon-btn danger" @click="removeContextualGreeting(idx)">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
                <textarea v-model="cg.content" class="field-textarea auto-textarea" rows="2" placeholder="该情境下的开场白内容" @input="onTextareaInput" />
              </div>
              <button type="button" class="avatar-btn add-entry-btn" @click="addContextualGreeting">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加情境开场白
              </button>
            </div>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('greetings')">收起</button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 7. ⚡ 深度提示                                           -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-show="!isFreeDialogueCategory || freeSettingTier === 'advanced'" class="config-card role-advanced-card" :class="{ filled: !!depthPromptData.prompt }" @click="!isFreeDialogueCategory && toggleCard('depthPrompt')">
          <div class="card-header">
            <span class="card-emoji">⚡</span>
            <div class="card-meta">
              <span class="card-title">深度提示</span>
              <span class="card-status">{{ depthPromptData.prompt ? '已设置' : '未设置' }}</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.depthPrompt" class="card-body" @click.stop>
            <div class="lore-grid two-col">
              <div class="field-item inline-field">
                <label class="field-label">深度层级</label>
                <input v-model.number="depthPromptData.depth" type="number" class="field-input" min="0" max="99" />
              </div>
              <div class="field-item">
                <label class="field-label">角色定位</label>
                <select v-model="depthPromptData.role" class="field-select">
                  <option value="system">system</option>
                  <option value="user">user</option>
                  <option value="assistant">assistant</option>
                </select>
              </div>
            </div>
            <div class="field-item">
              <label class="field-label">深度提示内容</label>
              <textarea v-model="depthPromptData.prompt" class="field-textarea auto-textarea" rows="4" placeholder="输入深度提示内容，将被注入到指定深度的对话上下文中" @input="onTextareaInput" />
            </div>
            <div class="field-item">
              <label class="field-label">动态角色注释/心理锚点</label>
              <textarea v-model="depthPromptData.dynamicAnchor" class="field-textarea auto-textarea" rows="2" placeholder="可选的动态注释或心理锚点描述" @input="onTextareaInput" />
            </div>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('depthPrompt')">收起</button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- 8. 🖼️ 媒体设定已移入基础设定，此处保留旧模板但不渲染        -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-if="false" class="config-card role-basic-card" :class="{ filled: hasMedia }" @click="!isFreeDialogueCategory && toggleCard('media')">
          <div class="card-header">
            <span class="card-emoji">🖼️</span>
            <div class="card-meta">
              <span class="card-title">媒体设定</span>
              <span class="card-status">{{ hasMedia ? '已设置' : '未设置' }}</span>
            </div>
          </div>
          <div v-if="isFreeDialogueCategory || expandedCards.media" class="card-body" @click.stop>
            <!-- 宏观画风 -->
            <div class="field-item">
              <label class="field-label">宏观画风</label>
              <label class="lore-toggle-row">
                <span>启用聊天中生成图片</span>
                <span class="lore-toggle">
                  <input v-model="mediaWeightsData.enableChatImageGeneration" type="checkbox" />
                  <span class="lore-toggle-slider"></span>
                </span>
              </label>
              <div class="lore-grid two-col">
                <div class="field-item">
                  <label class="field-label">宏观画风描述</label>
                  <input v-model="mediaWeightsData.artStyle" type="text" class="field-input" placeholder="如：赛博朋克、水墨风" />
                </div>
                <div class="field-item">
                  <label class="field-label">视觉风格权重（%）</label>
                  <input v-model.number="mediaWeightsData.qualityWeight" type="number" class="field-input" min="0" max="100" />
                </div>
              </div>
              <div v-if="mediaWeightsData.enableChatImageGeneration" class="style-config-list">
                <div v-for="(style, idx) in (mediaWeightsData.artStyleMix || [])" :key="style.id" class="tts-config-row">
                  <div class="lore-grid two-col">
                    <div class="field-item">
                      <label class="field-label">画风条目</label>
                      <input v-model="style.styleName" type="text" class="field-input" placeholder="如：胶片感、厚涂、清透水彩" />
                    </div>
                    <div class="field-item">
                      <label class="field-label">权重%</label>
                      <input v-model.number="style.weight" type="number" class="field-input" min="0" max="100" placeholder="100" />
                    </div>
                  </div>
                  <div class="ed-header">
                    <span class="lore-entry-index">画风 {{ idx + 1 }}</span>
                    <button type="button" class="icon-btn danger" @click="removeArtStyleConfig(idx)">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <button type="button" class="avatar-btn add-entry-btn" @click="addArtStyleConfig">
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加画风
                </button>
              </div>
            </div>
            <div class="field-item">
              <label class="field-label">封面图</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadCoverImage">上传图片</button>
                <button v-if="form.coverImage" type="button" class="avatar-btn remove-media-btn" @click="form.coverImage = ''">移除</button>
              </div>
              <div v-if="form.coverImage" class="media-preview"><img :src="getAssetUrl(form.coverImage)" alt="封面图" /></div>
            </div>
            <div class="field-item">
              <label class="field-label">角色背景图</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadMedia('chatBackground')">上传图片</button>
                <button v-if="mediaData.chatBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.chatBackground = ''">移除</button>
              </div>
              <div v-if="mediaData.chatBackground" class="media-preview"><img :src="getAssetUrl(mediaData.chatBackground)" alt="角色背景图" /></div>
            </div>
            <div class="field-item">
              <label class="field-label">整体聊天背景</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadMedia('globalBackground')">上传图片</button>
                <button v-if="mediaData.globalBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.globalBackground = ''">移除</button>
              </div>
              <div v-if="mediaData.globalBackground" class="media-preview"><img :src="getAssetUrl(mediaData.globalBackground)" alt="整体背景" /></div>
            </div>
            <div class="field-item">
              <label class="field-label">对话全局动态视频</label>
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="uploadVideoBackground">上传视频</button>
                <button v-if="mediaData.globalVideoBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.globalVideoBackground = ''">移除</button>
              </div>
              <div v-if="mediaData.globalVideoBackground" class="media-preview">
                <video :src="mediaData.globalVideoBackground" muted loop playsinline controls></video>
              </div>
            </div>
            <div class="field-item">
              <label class="field-label">角色情感表达动图</label>
              <button type="button" class="avatar-btn emotion-add-btn" @click="addEmotion">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加情感
              </button>
              <div v-for="(ea, idx) in emotionAnimations" :key="idx" class="emotion-row">
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
            <!-- 基于亲密度的动态媒体触发 -->
            <div class="field-item">
              <label class="field-label">基于亲密度的动态媒体触发机制</label>
              <div v-for="(trigger, idx) in intimacyTriggers" :key="trigger.id" class="intimacy-trigger-row">
                <div class="lore-grid two-col">
                  <div class="field-item">
                    <label class="field-label">亲密度阈值</label>
                    <input v-model.number="trigger.intimacyLevel" type="number" class="field-input" min="0" max="100" />
                  </div>
                  <div class="field-item">
                    <label class="field-label">媒体类型</label>
                    <select v-model="trigger.mediaType" class="field-select">
                      <option value="sticker">贴纸</option>
                      <option value="meme">表情包</option>
                      <option value="animation">动画</option>
                      <option value="background">背景</option>
                      <option value="tts-voice">TTS音色</option>
                    </select>
                  </div>
                </div>
                <div class="field-item">
                  <label class="field-label">触发文案</label>
                  <input v-model="trigger.triggerText" type="text" class="field-input" placeholder="触发后显示的文案" />
                </div>
                <div class="ed-header">
                  <span class="lore-entry-index">触发 {{ idx + 1 }}</span>
                  <button type="button" class="icon-btn danger" @click="removeIntimacyTrigger(idx)">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
              </div>
              <button type="button" class="avatar-btn add-entry-btn" @click="addIntimacyTrigger">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加触发
              </button>
            </div>
            <!-- TTS音色 -->
            <div class="field-item">
              <label class="field-label">TTS音色</label>
              <select v-model="ttsMode" class="field-select">
                <option value="">先选择音色方案</option>
                <option value="voice-clone">声音克隆</option>
                <option value="single">单音色</option>
                <option value="multi">多音色混合</option>
                <option value="emotion">情感音色</option>
              </select>
              <p class="field-hint">当前仅保存方案选择，具体生成与克隆逻辑后续接入。</p>
              <template v-if="ttsMode && ttsMode !== 'voice-clone'">
                <div v-for="(tts, idx) in ttsConfigs" :key="idx" class="tts-config-row">
                  <div class="lore-grid two-col">
                    <div class="field-item">
                      <label class="field-label">音色名称</label>
                      <input v-model="tts.voiceName" type="text" class="field-input" placeholder="如：alloy、shimmer" />
                    </div>
                    <div class="field-item">
                      <label class="field-label">权重%</label>
                      <input v-model.number="tts.weight" type="number" class="field-input" min="0" max="100" placeholder="100" />
                    </div>
                  </div>
                  <div class="ed-header">
                    <span class="lore-entry-index">音色 {{ idx + 1 }}</span>
                    <button type="button" class="icon-btn danger" @click="removeTtsConfig(idx)">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </template>
              <button v-if="ttsMode && ttsMode !== 'voice-clone'" type="button" class="avatar-btn add-entry-btn" @click="addTtsConfig">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg> 添加音色
              </button>
            </div>
            <button v-if="!isFreeDialogueCategory" type="button" class="collapse-btn" @click.stop="toggleCard('media')">收起</button>
          </div>
        </div>
        </template>

        <template #plot>
          <PlotCard
            v-if="isStoryCategory"
            v-model="plotCardData"
            v-model:subCategory="form.subCategory"
            :filled="hasPlotCardFields"
          />
        </template>
      </Character>

      <!-- 底部提交栏 -->
      <div class="submit-bar">
        <div class="submit-row">
          <button v-if="step === 'preview' && showRegenerate" type="button" class="outline-btn" @click="regenerateAI">🔄 重新生成</button>
          <button type="button" class="outline-btn" @click="previewCharacter">预览对话</button>
          <button type="button" class="primary-btn full" :disabled="submitting || !isFormValid" @click="submit">
            {{ submitting ? '创建中…' : '保存角色' }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { createSilverAvatarDataUrl, createSilverBackdropDataUrl } from '@/utils/silver-art'
import { uni } from '@/utils/uni-polyfill'
import { getAssetUrl } from '@/services/files'
import type { ICharacter, EmotionAnimation, CharacterPersona, Lorebook, LorebookEntry, DepthPrompt, GroupMember, NegativeTrait, PhysicalFeature, SpeechPattern, ContextualGreeting, IntimacyMediaTrigger, TTSConfig, MediaWeights, ArtStyleConfig, TTSMode } from '@/types/character'
import type { WorldBook, WorldBookEntry } from '@/types/world-book'
import { generateUUID } from '@/utils/uuid'
import { importCharacterFromFile } from '@/services/character-import'
import { generateCharacterByAI, generateCharacterAvatar } from '@/services/character-ai-generate'
import Character from '@/components/CharacterForm/character.vue'
import PlotCard from '@/components/CharacterForm/PlotCard.vue'
import { DEFAULT_CATEGORY, getFirstSubCategory, getThemeGroups, getVisibleCategoryGroups, inferCharacterMode, isMultiplayerCategory } from '@/data/taxonomy'
import { getTemplateForCategory, buildSettingsFromTemplate } from '@/data/character-templates'
import { characterPresets } from '@/data/character-presets'
import type { CharacterPreset } from '@/data/character-presets'
import TemplateFieldRenderer from '@/components/CharacterForm/TemplateFieldRenderer.vue'
import type { PlotCardData } from '@/types/plot-card'
import { buildPlotCardSettings, createEmptyPlotCardData, hasPlotCardContent, plotTypeFromSubCategory } from '@/types/plot-card'

/* ── 类型与状态 ── */
type CreateStep = 'choose' | 'quick' | 'manual' | 'preview'
type QuickMode = 'template' | 'ai'
type MediaKey = 'globalBackground' | 'chatBackground'
type FreeSettingTier = 'basic' | 'advanced'

const router = useRouter()
const characterStore = useCharacterStore()
const submitting = ref(false)

const step = ref<CreateStep>('choose')
const quickMode = ref<QuickMode>('template')
const freeSettingTier = ref<FreeSettingTier>('basic')

const aiDescription = ref('')
const aiStyleTags = ref<string[]>([])
const aiInteractionType = ref('')
const aiCreativity = ref(7)
const aiDetailLevel = ref(5)
const aiGenerating = ref(false)
const showAdvancedOptions = ref(false)

const previewSourceLabel = ref('')
const showRegenerate = ref(false)

const styleTagOptions = ['日常', '冒险', '恋爱', '恐怖', '搞笑', '神秘', '治愈', '悬疑']
const interactionTypeOptions = ['自由对话', '剧情推进', '互动游戏']

function toggleStyleTag(tag: string) {
  const idx = aiStyleTags.value.indexOf(tag)
  if (idx >= 0) aiStyleTags.value.splice(idx, 1)
  else aiStyleTags.value.push(tag)
}

function presetGradient(id: string): string {
  const g: Record<string, string> = {
    companion: 'linear-gradient(135deg, #6B5B95, #4A3F6B)',
    adventure: 'linear-gradient(135deg, #4A90D9, #2C5F8D)',
    'game-npc': 'linear-gradient(135deg, #5D4E6D, #3D3350)',
    'story-character': 'linear-gradient(135deg, #5B8C5A, #3A5F3A)',
    'group-party': 'linear-gradient(135deg, #D4A373, #A67C52)',
    'utility-helper': 'linear-gradient(135deg, #6B7280, #4B5563)',
  }
  return g[id] || 'linear-gradient(135deg, #4A5568, #2D3748)'
}

/* ── 表单数据 ── */
const form = ref({ name: '', category: DEFAULT_CATEGORY, subCategory: getFirstSubCategory(DEFAULT_CATEGORY), themeGroup: '', themeType: '', avatar: '', coverImage: '', voiceSample: '' })
const templateData = ref<Record<string, any>>({})
const plotCardData = ref<PlotCardData>(createEmptyPlotCardData(form.value.subCategory))
const mediaData = reactive<Record<MediaKey | 'globalVideoBackground', string>>({ globalBackground: '', globalVideoBackground: '', chatBackground: '' })
const emotionAnimations = reactive<EmotionAnimation[]>([])
const mediaWeightsData = reactive<MediaWeights>({ enableChatImageGeneration: false, artStyle: '', artStyleMix: [], qualityWeight: 100 })
const intimacyTriggers = reactive<IntimacyMediaTrigger[]>([])
const ttsConfigs = reactive<TTSConfig[]>([])
const ttsMode = ref<TTSMode | ''>('')
const ttsVoice = ref('')
const ttsWeight = ref(100)

const userData = reactive({ avatar: '', description: '', personality: '', role: '' })

interface PersonaFormData { anchor: string; traits: string; voice: string }
const personaData = reactive<PersonaFormData>({ anchor: '', traits: '', voice: '' })

interface LorebookEntryUI {
  id: string; keywords: string[]; keywordInput: string; content: string; order: number
  enabled: boolean; characterName?: string; position: number; depth: number; role: number
  dynamicAnchor?: string; userPersona?: string
}
const lorebookData = reactive<{ entries: LorebookEntryUI[]; scanRange: number }>({ entries: [], scanRange: 100 })

interface WorldBookEntryUI {
  id: string; keywords: string[]; keywordInput: string; content: string; order: number
  enabled: boolean; position: number; depth: number; role: number; probability: number; comment: string
  dynamicAnchor?: string; userPersona?: string; compatibilityScore?: number; relationshipTrigger?: string
}
interface WorldBookUI { id: string; name: string; entries: WorldBookEntryUI[]; scanRange: number; _expanded: boolean }
const worldBooksData = reactive<WorldBookUI[]>([])

const altGreetings = ref<string[]>([])
const contextualGreetings = reactive<ContextualGreeting[]>([])
const depthPromptData = reactive<DepthPrompt & { dynamicAnchor?: string }>({ depth: 4, prompt: '', role: 'system', dynamicAnchor: '' })
const customTags = ref<string[]>([])
const tagInput = ref('')
const structuredMembers = ref<GroupMember[]>([])

// 列表字段
const negativeTraits = reactive<NegativeTrait[]>([])
const physicalFeatures = reactive<PhysicalFeature[]>([])
const speechPatterns = reactive<SpeechPattern[]>([])

/* ── 头像 ActionSheet ── */
function showAvatarSheet() {
  uni.showActionSheet({
    itemList: ['从相册上传', 'AI生成头像', '取消'],
    itemColor: '#38bdf8',
    success: (res: { tapIndex: number }) => {
      if (res.tapIndex === 0) uploadAvatar()
      else if (res.tapIndex === 1) generateAvatarByAI()
    },
  })
}

async function generateAvatarByAI() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请先填写角色名称', icon: 'none' })
    return
  }
  uni.showToast({ title: '生成中…', icon: 'loading', duration: 2000 })
  try {
    const url = await generateCharacterAvatar(form.value.name, form.value.category)
    if (url) form.value.avatar = url
    uni.showToast({ title: '生成成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '生成失败', icon: 'none' })
  }
}

/* ── 世界书文件导入 ── */
const worldBookFileInput = ref<HTMLInputElement | null>(null)

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
        worldBooksData.push(wb)
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
      id: e.id || generateUUID(), keywords, keywordInput: keywords.join('，'),
      content: String(e.content || e.value || ''), order: Number(e.order ?? 0),
      enabled: e.enabled !== false, position: Number(e.position ?? 0), depth: Number(e.depth ?? 0),
      role: Number(e.role ?? 0), probability: Number(e.probability ?? 100), comment: String(e.comment || ''),
      dynamicAnchor: String(e.dynamicAnchor || ''), userPersona: String(e.userPersona || ''),
      compatibilityScore: e.compatibilityScore != null ? Number(e.compatibilityScore) : undefined,
      relationshipTrigger: String(e.relationshipTrigger || ''),
    })
  }
  return { id: json.id || generateUUID(), name: String(json.name || '导入的世界书'), entries, scanRange: Number(json.scanRange ?? 100), _expanded: true }
}

/* ── 计算属性 ── */
const categoryGroups = getVisibleCategoryGroups()
const themeGroups = getThemeGroups()

const subCategories = computed(() => categoryGroups.find(g => g.label === form.value.category)?.items || [])
const currentThemeLeaves = computed(() => themeGroups.find(g => g.label === form.value.themeGroup)?.items || [])
const activeTemplate = computed(() => getTemplateForCategory(form.value.category, form.value.subCategory))
const resolvedMode = computed(() => inferCharacterMode({ category: form.value.category, subCategory: form.value.subCategory }))
const isFreeDialogueCategory = computed(() => form.value.category === '自由对话')
const isStoryCategory = computed(() => form.value.category === '剧情')
const isCompactTopCategory = computed(() => isFreeDialogueCategory.value || isStoryCategory.value)

const avatarPreview = computed(() => {
  if (form.value.avatar) return getAssetUrl(form.value.avatar)
  if (form.value.name) return createSilverAvatarDataUrl(form.value.name)
  return ''
})
const isGroupOrComprehensive = computed(() => isMultiplayerCategory(form.value.category) || form.value.category === '综合')

const hasTemplateFields = computed(() => {
  const allKeys = [...activeTemplate.value.basicFields, ...activeTemplate.value.advancedFields, ...activeTemplate.value.specialFields].map(f => f.key)
  return allKeys.some(k => {
    const v = templateData.value[k]
    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  })
})
const hasClassificationTags = computed(() => !!(form.value.category || form.value.subCategory || form.value.themeGroup || form.value.themeType || customTags.value.length))
const hasPlotCardFields = computed(() => isStoryCategory.value && hasPlotCardContent(plotCardData.value))
const hasBaseInfo = computed(() => !!(negativeTraits.length || physicalFeatures.length || speechPatterns.length))
const hasPersona = computed(() => !!personaData.anchor.trim() || !!personaData.traits.trim() || !!personaData.voice.trim())
const hasMedia = computed(() =>
  !!form.value.coverImage ||
  !!mediaData.chatBackground ||
  !!mediaData.globalBackground ||
  !!mediaData.globalVideoBackground ||
  emotionAnimations.length > 0 ||
  !!mediaWeightsData.enableChatImageGeneration ||
  !!mediaWeightsData.artStyle ||
  !!mediaWeightsData.artStyleMix?.length ||
  intimacyTriggers.length > 0 ||
  !!ttsMode.value ||
  ttsConfigs.length > 0
)
const greetingCount = computed(() => (templateData.value.greeting ? 1 : 0) + altGreetings.value.filter(g => g.trim()).length + contextualGreetings.length)
const hasRoleContent = computed(() => hasBaseInfo.value || hasTemplateFields.value || hasPersona.value || lorebookData.entries.length > 0 || worldBooksData.length > 0 || greetingCount.value > 0 || !!depthPromptData.prompt || hasMedia.value)

const pageTitle = computed(() => {
  switch (step.value) {
    case 'quick': return '快速创建'
    case 'manual': return isFreeDialogueCategory.value ? '角色创建' : '手动配置'
    case 'preview': return '预览编辑'
    default: return '创建角色'
  }
})

/* ── Watchers ── */
watch(() => form.value.category, next => {
  if (!subCategories.value.includes(form.value.subCategory)) {
    form.value.subCategory = getFirstSubCategory(next)
  }
})
watch(() => form.value.subCategory, next => {
  plotCardData.value = {
    ...plotCardData.value,
    basic: {
      ...plotCardData.value.basic,
      plotType: plotTypeFromSubCategory(next),
    },
  }
})
watch(() => form.value.themeGroup, () => { form.value.themeType = '' })

/* ── 步骤导航 ── */
function goQuick() { step.value = 'quick'; quickMode.value = 'template' }
function goManual() { step.value = 'manual'; resetForm() }
function onBack() {
  if (step.value === 'quick' || step.value === 'manual' || step.value === 'preview') step.value = 'choose'
  else router.back()
}

/* ── 预设应用 ── */
function applyPresetAndGo(preset: CharacterPreset) {
  resetForm()
  applyPresetData(preset)
  previewSourceLabel.value = `🎨 来自模板：${preset.name}`
  showRegenerate.value = false
  step.value = preset.id === 'free-character-card' ? 'manual' : 'preview'
  if (preset.id === 'free-character-card') {
    freeSettingTier.value = 'basic'
  }
}

function applyPresetData(preset: CharacterPreset) {
  form.value.category = preset.category
  form.value.subCategory = preset.subCategory
  form.value.themeGroup = preset.themeGroup
  form.value.themeType = preset.themeType
  if (preset.defaultData.name) {
    if (preset.category === '多人' || preset.category === '综合') {
      form.value.name = ''
      if (preset.defaultData.groupName) templateData.value.groupName = String(preset.defaultData.groupName)
      else if (preset.defaultData.worldName) templateData.value.worldName = String(preset.defaultData.worldName)
    } else {
      form.value.name = String(preset.defaultData.name)
    }
  }
  for (const [key, value] of Object.entries(preset.defaultData)) {
    if (key === 'name') continue
    if (key === '_personaAnchor') { personaData.anchor = String(value); continue }
    if (key === '_personaTraits') { personaData.traits = Array.isArray(value) ? value.join('，') : String(value); continue }
    if (key === '_personaVoice') { personaData.voice = String(value); continue }
    if (key === '_settings') continue
    templateData.value = { ...templateData.value, [key]: value }
  }
}

/* ── AI 生成 ── */
async function handleAIGenerate() {
  if (!aiDescription.value.trim()) { uni.showToast({ title: '请输入角色描述', icon: 'none' }); return }
  aiGenerating.value = true
  try {
    const result = await generateCharacterByAI({
      description: aiDescription.value.trim(), styleTags: aiStyleTags.value,
      interactionType: aiInteractionType.value, creativity: aiCreativity.value, detailLevel: aiDetailLevel.value,
    })
    resetForm()
    fillFormFromAI(result)
    previewSourceLabel.value = '🤖 来自AI生成'
    showRegenerate.value = true
    step.value = 'preview'
  } catch (err) {
    uni.showToast({ title: (err as Error).message || '生成失败', icon: 'none' })
  } finally { aiGenerating.value = false }
}

function regenerateAI() { handleAIGenerate() }

function fillFormFromAI(character: Partial<ICharacter>) {
  if (character.name) form.value.name = character.name
  if (character.avatar) form.value.avatar = character.avatar
  if (character.description) templateData.value.description = character.description
  if (character.greeting) templateData.value.greeting = character.greeting
  if (character.settings) templateData.value._importedSettings = character.settings
  if (character.scenario) templateData.value.scenario = character.scenario
  if (character.exampleDialogue) templateData.value.exampleDialogue = character.exampleDialogue
  if (character.personality) templateData.value.personalityTraits = character.personality
  if (character.tags?.length) customTags.value = character.tags.filter(t => t !== form.value.category && t !== form.value.subCategory)
  if (character.category) form.value.category = character.category
  if (character.subCategory) form.value.subCategory = character.subCategory
  if (character.persona) {
    personaData.anchor = character.persona.anchor
    personaData.traits = character.persona.traits.join('，')
    personaData.voice = character.persona.voice
  }
  if (character.lorebook?.entries.length) {
    lorebookData.entries = character.lorebook.entries.map(e => ({
      id: e.id, keywords: [...e.keywords], keywordInput: e.keywords.join('，'), content: e.content,
      order: e.order, enabled: e.enabled, position: e.position, depth: e.depth,
      role: e.role === 'user' ? 1 : e.role === 'assistant' ? 2 : 0, characterName: e.characterName,
      dynamicAnchor: e.dynamicAnchor || '', userPersona: e.userPersona || '',
    }))
    lorebookData.scanRange = character.lorebook.scanRange
  }
  if (character.worldBooks?.length) {
    worldBooksData.splice(0, worldBooksData.length, ...character.worldBooks.map(wb => ({
      id: wb.id || generateUUID(), name: wb.name || '未命名世界书',
      entries: (wb.entries || []).map(e => ({
        id: e.id || generateUUID(), keywords: [...(e.keywords || [])], keywordInput: (e.keywords || []).join('，'),
        content: e.content || '', order: e.order ?? 0, enabled: e.enabled ?? true, position: e.position ?? 0,
        depth: e.depth ?? 0, role: e.role ?? 0, probability: e.probability ?? 100, comment: e.comment || '',
        dynamicAnchor: e.dynamicAnchor || '', userPersona: e.userPersona || '',
        compatibilityScore: e.compatibilityScore, relationshipTrigger: e.relationshipTrigger || '',
      })),
      scanRange: wb.scanRange || 100, _expanded: false,
    })))
  }
  if (character.alternateGreetings?.length) altGreetings.value = [...character.alternateGreetings]
  if (character.depthPrompt) {
    depthPromptData.depth = character.depthPrompt.depth
    depthPromptData.prompt = character.depthPrompt.prompt
    depthPromptData.role = character.depthPrompt.role
    depthPromptData.dynamicAnchor = character.depthPrompt.dynamicAnchor || ''
  }
}

/* ── 卡片展开控制 ── */
const expandedCards = reactive<Record<string, boolean>>({
  base: false, overallSettings: false, persona: false, lorebook: false,
  worldBooks: false, media: false, greetings: false, depthPrompt: false,
})
function toggleCard(key: string) { expandedCards[key] = !expandedCards[key] }

/* ── textarea 自动高度 ── */
function onTextareaInput(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

/* ── 列表字段操作 ── */
function makeId() { return generateUUID() }
function addNegativeTrait() { negativeTraits.push({ id: makeId(), content: '' }) }
function removeNegativeTrait(idx: number) { negativeTraits.splice(idx, 1) }
function addPhysicalFeature() { physicalFeatures.push({ id: makeId(), content: '' }) }
function removePhysicalFeature(idx: number) { physicalFeatures.splice(idx, 1) }
function addSpeechPattern() { speechPatterns.push({ id: makeId(), category: 'catchphrase', content: '' }) }
function removeSpeechPattern(idx: number) { speechPatterns.splice(idx, 1) }
function addContextualGreeting() { contextualGreetings.push({ id: makeId(), context: 'first-meet', content: '' }) }
function removeContextualGreeting(idx: number) { contextualGreetings.splice(idx, 1) }
function addIntimacyTrigger() { intimacyTriggers.push({ id: makeId(), intimacyLevel: 50, mediaType: 'sticker' }) }
function removeIntimacyTrigger(idx: number) { intimacyTriggers.splice(idx, 1) }
function addArtStyleConfig() {
  if (!mediaWeightsData.artStyleMix) mediaWeightsData.artStyleMix = []
  mediaWeightsData.artStyleMix.push({ id: makeId(), styleName: '', weight: 100 })
}
function removeArtStyleConfig(idx: number) {
  mediaWeightsData.artStyleMix?.splice(idx, 1)
}
function addTtsConfig() { ttsConfigs.push({ voiceId: makeId(), voiceName: '', weight: 100 }) }
function removeTtsConfig(idx: number) { ttsConfigs.splice(idx, 1) }

/* ── 媒体操作 ── */
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

function uploadAvatar() {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: async (res: { tempFilePaths: string[] }) => {
      const path = res.tempFilePaths?.[0]
      if (!path) return
      try { form.value.avatar = await blobUrlToBase64(path) }
      catch { form.value.avatar = path }
    },
  })
}
function uploadMedia(key: MediaKey) {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => { if (res.tempFilePaths?.[0]) mediaData[key] = res.tempFilePaths[0] },
  })
}
function uploadCoverImage() {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => { if (res.tempFilePaths?.[0]) form.value.coverImage = res.tempFilePaths[0] },
  })
}
function addEmotion() { emotionAnimations.push({ emotion: '', animationUrl: '' }) }
function removeEmotion(idx: number) { emotionAnimations.splice(idx, 1) }
function uploadEmotionAnimation(idx: number) {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => { if (res.tempFilePaths?.[0]) emotionAnimations[idx].animationUrl = res.tempFilePaths[0] },
  })
}
function uploadVideoBackground() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'video/*'
  input.onchange = () => { const file = input.files?.[0]; if (file) mediaData.globalVideoBackground = URL.createObjectURL(file) }
  input.click()
}

/* ── 模板字段 ── */
function updateTemplateField(key: string, value: string | string[]) {
  templateData.value = { ...templateData.value, [key]: value }
}

/* ── Lorebook ── */
function makeLoreEntry(): LorebookEntryUI {
  return { id: generateUUID(), keywords: [], keywordInput: '', content: '', order: 0, enabled: true, position: 0, depth: 0, role: 0, characterName: undefined, dynamicAnchor: '', userPersona: '' }
}
function syncLoreKeywords(entry: LorebookEntryUI) { entry.keywords = entry.keywordInput.split(/[,，]/).map(s => s.trim()).filter(Boolean) }
function addLoreEntry() { lorebookData.entries.push(makeLoreEntry()) }
function removeLoreEntry(idx: number) { lorebookData.entries.splice(idx, 1) }
function moveLoreEntry(idx: number, dir: -1 | 1) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= lorebookData.entries.length) return
  const temp = lorebookData.entries[idx]; lorebookData.entries[idx] = lorebookData.entries[newIdx]; lorebookData.entries[newIdx] = temp
}

/* ── 世界书 ── */
function makeWorldBookEntry(): WorldBookEntryUI {
  return { id: generateUUID(), keywords: [], keywordInput: '', content: '', order: 0, enabled: true, position: 0, depth: 0, role: 0, probability: 100, comment: '', dynamicAnchor: '', userPersona: '', compatibilityScore: undefined, relationshipTrigger: '' }
}
function makeWorldBook(): WorldBookUI {
  return { id: generateUUID(), name: '', entries: [], scanRange: 100, _expanded: true }
}
function syncWorldBookKeywords(entry: WorldBookEntryUI) { entry.keywords = entry.keywordInput.split(/[,，]/).map(s => s.trim()).filter(Boolean) }
function addWorldBook() {
  const name = window.prompt('输入世界书名称')
  if (name?.trim()) { const wb = makeWorldBook(); wb.name = name.trim(); worldBooksData.push(wb) }
}
function removeWorldBook(idx: number) { worldBooksData.splice(idx, 1) }
function addWorldBookEntry(wb: WorldBookUI) { wb.entries.push(makeWorldBookEntry()) }
function removeWorldBookEntry(wb: WorldBookUI, idx: number) { wb.entries.splice(idx, 1) }
function moveWorldBookEntry(wb: WorldBookUI, idx: number, dir: -1 | 1) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= wb.entries.length) return
  const temp = wb.entries[idx]; wb.entries[idx] = wb.entries[newIdx]; wb.entries[newIdx] = temp
}

/* ── 开场白 ── */
function addAltGreeting() { if (altGreetings.value.length >= 10) return; altGreetings.value.push('') }
function removeAltGreeting(idx: number) { altGreetings.value.splice(idx, 1) }

/* ── 标签 ── */
function addCustomTag() {
  const raw = tagInput.value.trim()
  if (!raw) return
  if (customTags.value.length >= 10) { uni.showToast({ title: '最多10个标签', icon: 'none' }); return }
  const tag = raw.slice(0, 20)
  if (customTags.value.includes(tag)) { uni.showToast({ title: '标签已存在', icon: 'none' }); return }
  customTags.value.push(tag); tagInput.value = ''
}
function removeCustomTag(idx: number) { customTags.value.splice(idx, 1) }

/* ── 构建与提交 ── */
function loreRoleFromNumber(n: number): 'system' | 'user' | 'assistant' {
  if (n === 1) return 'user'
  if (n === 2) return 'assistant'
  return 'system'
}
function buildPersona(): CharacterPersona | undefined {
  const anchor = personaData.anchor.trim(), traitsRaw = personaData.traits.trim(), voice = personaData.voice.trim()
  if (!anchor && !traitsRaw && !voice) return undefined
  const traits = traitsRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean)
  return { anchor: anchor || '', traits: traits.length ? traits : [], voice: voice || '' }
}
function buildLorebook(): Lorebook | undefined {
  if (lorebookData.entries.length === 0) return undefined
  return {
    entries: lorebookData.entries.map(e => ({
      id: e.id, keywords: e.keywordInput.split(/[,，]/).map(s => s.trim()).filter(Boolean), content: e.content,
      order: e.order, enabled: e.enabled, position: e.position as LorebookEntry['position'], depth: e.depth,
      role: loreRoleFromNumber(e.role), characterName: e.characterName,
      dynamicAnchor: e.dynamicAnchor?.trim() || undefined, userPersona: e.userPersona?.trim() || undefined,
    })),
    scanRange: Number(lorebookData.scanRange) || 100,
  }
}
function buildWorldBooks(): WorldBook[] | undefined {
  if (worldBooksData.length === 0) return undefined
  return worldBooksData.map(wb => ({
    id: wb.id, name: wb.name, scanRange: Number(wb.scanRange) || 100,
    entries: wb.entries.map(e => ({
      id: e.id, keywords: e.keywordInput.split(/[,，]/).map(s => s.trim()).filter(Boolean), content: e.content,
      order: e.order, enabled: e.enabled, position: e.position as WorldBookEntry['position'], depth: e.depth,
      role: e.role as WorldBookEntry['role'], probability: Number(e.probability) || 100, comment: e.comment || undefined,
      dynamicAnchor: e.dynamicAnchor?.trim() || undefined, userPersona: e.userPersona?.trim() || undefined,
      compatibilityScore: e.compatibilityScore != null ? Number(e.compatibilityScore) : undefined,
      relationshipTrigger: e.relationshipTrigger?.trim() || undefined,
    })),
  }))
}
function buildDepthPrompt(): DepthPrompt | undefined {
  if (!depthPromptData.prompt.trim() && !depthPromptData.dynamicAnchor?.trim()) return undefined
  return { depth: Number(depthPromptData.depth) || 4, prompt: depthPromptData.prompt.trim(), role: depthPromptData.role, dynamicAnchor: depthPromptData.dynamicAnchor?.trim() || undefined }
}

function buildMediaWeights(): MediaWeights | undefined {
  const artStyleMix = (mediaWeightsData.artStyleMix || [])
    .filter((item): item is ArtStyleConfig => !!item && !!item.styleName?.trim())
    .map(item => ({
      id: item.id || makeId(),
      styleName: item.styleName.trim(),
      weight: Number(item.weight) || 0,
    }))

  const artStyle = mediaWeightsData.artStyle?.trim()
  const qualityWeight = Number(mediaWeightsData.qualityWeight)
  const enableChatImageGeneration = !!mediaWeightsData.enableChatImageGeneration

  if (!enableChatImageGeneration && !artStyle && !artStyleMix.length && (qualityWeight === 100 || Number.isNaN(qualityWeight))) {
    return undefined
  }

  return {
    enableChatImageGeneration,
    artStyle: artStyle || undefined,
    artStyleMix: artStyleMix.length ? artStyleMix : undefined,
    qualityWeight: Number.isNaN(qualityWeight) ? 100 : qualityWeight,
  }
}

function resolveCharacterName(): string {
  if (isGroupOrComprehensive.value) {
    return String(templateData.value.groupName ?? templateData.value.worldName ?? form.value.name ?? '').trim()
  }
  return form.value.name.trim() || (isStoryCategory.value ? plotCardData.value.basic.plotName.trim() : '')
}

function resolveDescription(): string {
  return (
    String(templateData.value.description ?? '').trim() ||
    String(templateData.value.worldview ?? '').trim() ||
    String(templateData.value.expertPersona ?? '').trim() ||
    String(templateData.value.worldSandbox ?? '').trim() ||
    String(templateData.value.groupBackground ?? '').trim() ||
    (isStoryCategory.value ? plotCardData.value.basic.plotGoal.trim() || plotCardData.value.basic.worldTone.trim() : '')
  )
}

function buildFullSettings(name: string): string {
  const baseSettings = buildSettingsFromTemplate(form.value.category, form.value.subCategory, { ...templateData.value, _characterName: name }, activeTemplate.value)
  const plotSettings = isStoryCategory.value ? buildPlotCardSettings(plotCardData.value, form.value.subCategory) : ''
  return [baseSettings, plotSettings].filter(Boolean).join('\n\n').trim()
}

function buildPreviewCharacter(): Partial<ICharacter> {
  const name = resolveCharacterName()
  const description = resolveDescription()
  const settings = buildFullSettings(name)
  return {
    name: name || '未命名角色', avatar: form.value.avatar || undefined, coverImage: form.value.coverImage || undefined, description: description || `${form.value.category}角色`,
    greeting: String(templateData.value.greeting ?? '').trim() || undefined, settings,
    mode: resolvedMode.value, category: form.value.category, subCategory: form.value.subCategory,
    scenario: String(templateData.value.scenario ?? '').trim() || undefined,
    chatBackground: mediaData.chatBackground || undefined,
    globalBackground: mediaData.globalBackground || undefined,
    globalVideoBackground: mediaData.globalVideoBackground || undefined,
    emotionAnimations: emotionAnimations.filter(e => e.emotion.trim() && e.animationUrl) || undefined,
    mediaWeights: buildMediaWeights(),
    ttsMode: ttsMode.value || undefined,
    ttsConfigs: ttsConfigs.filter(t => t.voiceName.trim()).length ? ttsConfigs.filter(t => t.voiceName.trim()) : undefined,
    persona: buildPersona(), lorebook: buildLorebook(), worldBooks: buildWorldBooks(), depthPrompt: buildDepthPrompt(),
    plotCard: isStoryCategory.value ? plotCardData.value : undefined,
  }
}
function previewCharacter() {
  const name = resolveCharacterName()
  const settings = buildFullSettings(name)
  if (!name.trim() || !settings.trim()) { uni.showToast({ title: '请至少填写角色名称和整体设定', icon: 'none' }); return }
  const char = buildPreviewCharacter()
  const encoded = encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(char))))
  uni.navigateTo({ url: '/character/preview?data=' + encoded })
}

/* ── 表单校验 ── */
const isFormValid = computed(() => {
  const name = resolveCharacterName()
  if (!name || name.length > 50 || /^\s+$/.test(name)) return false
  if (!isGroupOrComprehensive.value) {
    const desc = resolveDescription()
    if (!desc || desc.length > 1000) return false
  }
  return true
})

/* ── 提交 ── */
async function submit() {
  let name: string
  if (isGroupOrComprehensive.value) {
    name = String(templateData.value.groupName ?? templateData.value.worldName ?? '').trim()
    if (!name) { uni.showToast({ title: '请在基础设定中填写名称', icon: 'none' }); return }
  } else {
    name = resolveCharacterName()
    if (!name) { uni.showToast({ title: '请输入角色名称', icon: 'none' }); return }
  }
  submitting.value = true
  try {
    const description = resolveDescription()
    if (!description && !isGroupOrComprehensive.value) { uni.showToast({ title: '请填写角色描述或相关基础设定', icon: 'none' }); submitting.value = false; return }
    const avatar = isGroupOrComprehensive.value ? createSilverAvatarDataUrl(name) : (form.value.avatar || createSilverAvatarDataUrl(name))
    const settings = buildFullSettings(name)
    const userParts: string[] = []
    if (userData.description.trim()) userParts.push(userData.description.trim())
    if (userData.personality.trim()) userParts.push(`性格：${userData.personality.trim()}`)
    if (userData.role.trim()) userParts.push(`身份：${userData.role.trim()}`)
    const character: Partial<ICharacter> = {
      name, avatar, coverImage: form.value.coverImage || undefined, background: `${form.value.category} / ${form.value.subCategory}`,
      description: description || `${form.value.category}角色`, greeting: String(templateData.value.greeting ?? '').trim(),
      settings, mode: resolvedMode.value, category: form.value.category, subCategory: form.value.subCategory,
      avatarTone: form.value.avatar ? undefined : 'silver',
      backgroundImage: createSilverBackdropDataUrl(name, `${form.value.category} · ${form.value.subCategory}`),
      tags: [form.value.category, form.value.subCategory, form.value.themeType, ...customTags.value].filter(Boolean),
      sourceType: 'manual', exampleDialogue: templateData.value.exampleDialogue as string | undefined,
      scenario: templateData.value.scenario as string | undefined, personality: templateData.value.personalityTraits as string | undefined,
      values: templateData.value.coreValues as string | undefined,
      chatBackground: mediaData.chatBackground || undefined,
      globalBackground: mediaData.globalBackground || undefined,
      globalVideoBackground: mediaData.globalVideoBackground || undefined,
      emotionAnimations: emotionAnimations.filter(e => e.emotion.trim() && e.animationUrl) || undefined,
      persona: buildPersona(), lorebook: buildLorebook(), worldBooks: buildWorldBooks(),
      alternateGreetings: altGreetings.value.filter(g => g.trim()).length ? altGreetings.value.filter(g => g.trim()) : undefined,
      depthPrompt: buildDepthPrompt(),
      plotCard: isStoryCategory.value ? plotCardData.value : undefined,
      // 新字段
      negativeTraits: negativeTraits.filter(t => t.content.trim()).length ? negativeTraits.filter(t => t.content.trim()) : undefined,
      physicalFeatures: physicalFeatures.filter(f => f.content.trim()).length ? physicalFeatures.filter(f => f.content.trim()) : undefined,
      speechPatterns: speechPatterns.filter(s => s.content.trim()).length ? speechPatterns.filter(s => s.content.trim()) : undefined,
      contextualGreetings: contextualGreetings.filter(g => g.content.trim()).length ? contextualGreetings.filter(g => g.content.trim()) : undefined,
      mediaWeights: buildMediaWeights(),
      intimacyMediaTriggers: intimacyTriggers.length ? [...intimacyTriggers] : undefined,
      ttsMode: ttsMode.value || undefined,
      ttsConfigs: ttsConfigs.filter(t => t.voiceName.trim()).length ? ttsConfigs.filter(t => t.voiceName.trim()) : undefined,
    }
    if (resolvedMode.value === 'group-chat' || resolvedMode.value === 'group-challenge' || resolvedMode.value === 'multi-free' || resolvedMode.value === 'multi-story' || resolvedMode.value === 'multi-game') {
      character.groupAnnouncement = String(templateData.value.groupRules ?? templateData.value.groupBackground ?? '').trim()
      character.groupChatMode = 'queue'
      if (structuredMembers.value.length > 0) character.structuredMembers = structuredMembers.value
    }
    const extraBlocks: string[] = []
    if (userParts.length > 0 || userData.avatar) {
      const userBlock: string[] = ['【用户设定】']
      if (userData.avatar) userBlock.push('用户头像：已配置')
      if (userParts.length) userBlock.push(...userParts)
      extraBlocks.push(userBlock.join('\n'))
    }
    if (ttsVoice.value.trim()) extraBlocks.push(`【TTS音色设定】\nTTS音色：${ttsVoice.value.trim()}${ttsWeight.value !== 100 ? `(${ttsWeight.value}%)` : ''}`)
    try {
      const records: Record<string, string> = JSON.parse(localStorage.getItem('echo_game_records') || '{}')
      const entries = Object.values(records)
      if (entries.length) extraBlocks.push(`【用户游戏最佳记录】\n${entries.join('\n')}`)
    } catch { /* no records */ }
    if (extraBlocks.length) character.settings = settings + '\n\n' + extraBlocks.join('\n\n')
    const newId = await characterStore.createCharacter(character)
    clearDraft()
    showSuccessActions(newId)
  } catch {
    uni.showToast({ title: '创建失败', icon: 'none' })
  } finally { submitting.value = false }
}

/* ── 重置表单 ── */
function resetForm() {
  form.value = { name: '', category: DEFAULT_CATEGORY, subCategory: getFirstSubCategory(DEFAULT_CATEGORY), themeGroup: '', themeType: '', avatar: '', coverImage: '', voiceSample: '' }
  templateData.value = {}
  plotCardData.value = createEmptyPlotCardData(form.value.subCategory)
  mediaData.chatBackground = ''; mediaData.globalBackground = ''; mediaData.globalVideoBackground = ''
  emotionAnimations.splice(0, emotionAnimations.length)
  intimacyTriggers.splice(0, intimacyTriggers.length)
  ttsConfigs.splice(0, ttsConfigs.length)
  mediaWeightsData.enableChatImageGeneration = false; mediaWeightsData.artStyle = ''; mediaWeightsData.qualityWeight = 100; mediaWeightsData.artStyleMix = []
  userData.avatar = ''; userData.description = ''; userData.personality = ''; userData.role = ''
  personaData.anchor = ''; personaData.traits = ''; personaData.voice = ''
  lorebookData.entries = []; lorebookData.scanRange = 100
  worldBooksData.splice(0, worldBooksData.length)
  depthPromptData.depth = 4; depthPromptData.prompt = ''; depthPromptData.role = 'system'; depthPromptData.dynamicAnchor = ''
  altGreetings.value = []
  contextualGreetings.splice(0, contextualGreetings.length)
  ttsMode.value = ''; ttsVoice.value = ''; ttsWeight.value = 100
  customTags.value = []; tagInput.value = ''
  structuredMembers.value = []
  negativeTraits.splice(0, negativeTraits.length)
  physicalFeatures.splice(0, physicalFeatures.length)
  speechPatterns.splice(0, speechPatterns.length)
  freeSettingTier.value = 'basic'
  for (const key of Object.keys(expandedCards)) expandedCards[key] = false
  clearDraft()
}

/* ── 创建成功快捷操作 ── */
function showSuccessActions(newId: string) {
  uni.showActionSheet({
    title: '角色创建成功！',
    itemList: ['立即开始对话', '编辑角色', '再创建一个', '返回列表'],
    itemColor: '#38bdf8',
    success: (res: { tapIndex: number }) => {
      switch (res.tapIndex) {
        case 0: router.push(`/chat/${newId}`); break
        case 1: router.push(`/character/edit?id=${newId}`); break
        case 2: resetForm(); step.value = 'choose'; break
        case 3: default: router.push('/character')
      }
    },
    fail: () => { router.push('/character') },
  })
}

/* ── 草稿自动保存 ── */
const DRAFT_KEY = 'character_draft'
const SAVE_DEBOUNCE = 2000
let draftTimer: ReturnType<typeof setTimeout> | null = null

function hasDraftContent(): boolean { return !!(form.value.name.trim() || String(templateData.value.description ?? '').trim() || hasPlotCardContent(plotCardData.value)) }
function getDraftSnapshot(): unknown {
  return {
    form: JSON.parse(JSON.stringify(form.value)),
    templateData: JSON.parse(JSON.stringify(templateData.value)),
    plotCardData: JSON.parse(JSON.stringify(plotCardData.value)),
    mediaData: JSON.parse(JSON.stringify(mediaData)),
    emotionAnimations: JSON.parse(JSON.stringify(emotionAnimations)),
    intimacyTriggers: JSON.parse(JSON.stringify(intimacyTriggers)),
    ttsConfigs: JSON.parse(JSON.stringify(ttsConfigs)),
    mediaWeightsData: JSON.parse(JSON.stringify(mediaWeightsData)),
    userData: JSON.parse(JSON.stringify(userData)),
    personaData: JSON.parse(JSON.stringify(personaData)),
    lorebookData: JSON.parse(JSON.stringify(lorebookData)),
    worldBooksData: JSON.parse(JSON.stringify(worldBooksData)),
    depthPromptData: JSON.parse(JSON.stringify(depthPromptData)),
    altGreetings: [...altGreetings.value],
    contextualGreetings: JSON.parse(JSON.stringify(contextualGreetings)),
    negativeTraits: JSON.parse(JSON.stringify(negativeTraits)),
    physicalFeatures: JSON.parse(JSON.stringify(physicalFeatures)),
    speechPatterns: JSON.parse(JSON.stringify(speechPatterns)),
    ttsMode: ttsMode.value, ttsVoice: ttsVoice.value, ttsWeight: ttsWeight.value,
    customTags: [...customTags.value],
    structuredMembers: [...structuredMembers.value],
    aiDescription: aiDescription.value, aiStyleTags: [...aiStyleTags.value],
    aiInteractionType: aiInteractionType.value, aiCreativity: aiCreativity.value, aiDetailLevel: aiDetailLevel.value,
  }
}
function saveDraft() {
  if (!hasDraftContent()) return
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(getDraftSnapshot())) } catch (e) { console.warn('草稿保存失败:', e) }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }
function loadDraft(): unknown | null { try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null } catch { return null } }
function restoreDraft(data: any) {
  if (!data) return
  if (data.form) form.value = { ...form.value, ...data.form }
  if (data.templateData) templateData.value = data.templateData
  if (data.plotCardData) plotCardData.value = { ...createEmptyPlotCardData(form.value.subCategory), ...data.plotCardData }
  if (data.mediaData) Object.assign(mediaData, data.mediaData)
  if (data.emotionAnimations) emotionAnimations.splice(0, emotionAnimations.length, ...data.emotionAnimations)
  if (data.intimacyTriggers) intimacyTriggers.splice(0, intimacyTriggers.length, ...data.intimacyTriggers)
  if (data.ttsConfigs) ttsConfigs.splice(0, ttsConfigs.length, ...data.ttsConfigs)
  if (data.mediaWeightsData) {
    Object.assign(mediaWeightsData, data.mediaWeightsData)
    mediaWeightsData.artStyleMix = Array.isArray(mediaWeightsData.artStyleMix) ? mediaWeightsData.artStyleMix : []
    mediaWeightsData.enableChatImageGeneration = !!mediaWeightsData.enableChatImageGeneration
  }
  if (data.userData) Object.assign(userData, data.userData)
  if (data.personaData) Object.assign(personaData, data.personaData)
  if (data.lorebookData) Object.assign(lorebookData, data.lorebookData)
  if (data.worldBooksData) worldBooksData.splice(0, worldBooksData.length, ...data.worldBooksData)
  if (data.depthPromptData) Object.assign(depthPromptData, data.depthPromptData)
  if (data.altGreetings) altGreetings.value = data.altGreetings
  if (data.contextualGreetings) contextualGreetings.splice(0, contextualGreetings.length, ...data.contextualGreetings)
  if (data.negativeTraits) negativeTraits.splice(0, negativeTraits.length, ...data.negativeTraits)
  if (data.physicalFeatures) physicalFeatures.splice(0, physicalFeatures.length, ...data.physicalFeatures)
  if (data.speechPatterns) speechPatterns.splice(0, speechPatterns.length, ...data.speechPatterns)
  if (data.ttsMode !== undefined) ttsMode.value = data.ttsMode
  if (data.ttsVoice !== undefined) ttsVoice.value = data.ttsVoice
  if (data.ttsWeight !== undefined) ttsWeight.value = data.ttsWeight
  if (data.customTags) customTags.value = data.customTags
  if (data.structuredMembers) structuredMembers.value = data.structuredMembers
  if (data.aiDescription !== undefined) aiDescription.value = data.aiDescription
  if (data.aiStyleTags) aiStyleTags.value = data.aiStyleTags
  if (data.aiInteractionType !== undefined) aiInteractionType.value = data.aiInteractionType
  if (data.aiCreativity !== undefined) aiCreativity.value = data.aiCreativity
  if (data.aiDetailLevel !== undefined) aiDetailLevel.value = data.aiDetailLevel
}
function handleDraftRestore() {
  const draft = loadDraft()
  if (draft && hasDraftContentInDraft(draft)) {
    uni.showModal({
      title: '检测到未提交的草稿',
      content: '是否继续编辑上次未完成的角色？',
      confirmText: '继续编辑',
      cancelText: '丢弃',
      success: (res: { confirm: boolean }) => {
        if (res.confirm) { restoreDraft(draft); uni.showToast({ title: '已恢复草稿', icon: 'none' }) }
        else { clearDraft() }
      },
    })
  }
}
function hasDraftContentInDraft(draft: any): boolean { return !!(draft?.form?.name?.trim() || draft?.templateData?.description?.trim() || draft?.plotCardData?.basic?.plotName?.trim() || draft?.plotCardData?.basic?.plotGoal?.trim()) }

watch(() => JSON.stringify({ f: form.value, t: templateData.value, plot: plotCardData.value, m: mediaData, e: emotionAnimations, u: userData, p: personaData, l: lorebookData, w: worldBooksData, d: depthPromptData, a: altGreetings.value, tags: customTags.value, sm: structuredMembers.value, cg: contextualGreetings, nt: negativeTraits, pf: physicalFeatures, sp: speechPatterns, imt: intimacyTriggers, ttsMode: ttsMode.value, tts: ttsConfigs, mw: mediaWeightsData }),
  () => { if (draftTimer) clearTimeout(draftTimer); draftTimer = setTimeout(() => saveDraft(), SAVE_DEBOUNCE) },
  { deep: true }
)

onMounted(() => { handleDraftRestore() })
</script>

<style lang="scss" scoped>
$sky: #38bdf8;
$sky-light: #7dd3fc;
$mint: #34d399;

.create-page {
  min-height: 100vh;
  padding: 0 0 100px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header {
  position: sticky; top: 0; z-index: 20;
  display: grid; grid-template-columns: 48px minmax(0, 1fr) 48px; align-items: center; gap: 10px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border-bottom: 1px solid var(--top-bar-border); background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(28px) saturate(1.45); -webkit-backdrop-filter: blur(28px) saturate(1.45);
}
.page-title { min-width: 0; margin: 0; color: var(--text-primary); font-size: 17px; font-weight: 600; letter-spacing: 0.04em; text-align: center; }
.header-placeholder { display: block; width: 48px; height: 48px; }
.back-btn { align-self: center; display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; padding: 0; border: none; background: transparent; color: var(--text-primary); cursor: pointer; transition: opacity 0.2s, transform 0.2s; &:hover { opacity: 0.78; } &:active { transform: scale(0.95); } }
.back-icon { width: 22px; height: 22px; }

/* ── Step 0: 入口选择页 ── */
.step-choose { min-height: 100vh; display: flex; padding: 24px; padding-top: calc(24px + env(safe-area-inset-top, 0px) + var(--top-bar-height)); }
.choose-container { width: 100%; max-width: 400px; }
.choose-title { margin: 0 0 32px; color: var(--text-primary); font-size: 22px; font-weight: 700; text-align: center; letter-spacing: 0.04em; }
.choose-cards { display: flex; flex-direction: column; gap: 16px; }
.entry-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 20px; border-radius: 8px; color: #fff; font: inherit; text-align: center; cursor: pointer; border: none; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden;
  &:active { transform: scale(0.98); }
}
.entry-emoji { font-size: 40px; line-height: 1; }
.entry-title { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; }
.entry-desc { font-size: 13px; color: rgba(255, 255, 255, 0.75); line-height: 1.5; }
.quick-card { background: linear-gradient(135deg, #4A90D9, #2C5F8D); box-shadow: 0 8px 24px rgba(74, 144, 217, 0.35); }
.manual-card { background: linear-gradient(135deg, #6B5B95, #4A3F6B); box-shadow: 0 8px 24px rgba(107, 91, 149, 0.35); }

/* ── Step 1A: 快速创建页 ── */
.step-quick { width: min(960px, calc(100% - 32px)); margin: 16px auto 0; }
.quick-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.quick-tab { flex: 1; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; background: rgba(255, 255, 255, 0.03); color: var(--text-secondary); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.06); }
  &.active { background: linear-gradient(135deg, rgba(56, 189, 248, 0.82), rgba(52, 211, 153, 0.78)); border-color: transparent; color: #fff; font-weight: 700; }
}
.template-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 768px) { .template-grid { grid-template-columns: repeat(3, 1fr); } }
.template-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px 16px; border-radius: 8px; color: #fff; font: inherit; text-align: center; cursor: pointer; border: none; transition: transform 0.2s, box-shadow 0.2s; position: relative; min-height: 160px; justify-content: center;
  &:active { transform: scale(0.98); }
}
.template-emoji { font-size: 48px; line-height: 1; }
.template-name { font-size: 16px; font-weight: 700; }
.template-desc { font-size: 12px; color: rgba(255, 255, 255, 0.8); line-height: 1.4; }
.template-arrow { position: absolute; right: 12px; bottom: 12px; color: rgba(255, 255, 255, 0.6); }

.ai-panel { display: flex; flex-direction: column; gap: 14px; padding: 16px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); }
.ai-header { font-size: 16px; font-weight: 600; color: var(--text-primary); text-align: center; }
.ai-textarea { width: 100%; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; background: rgba(255, 255, 255, 0.04); color: var(--text-primary); font: inherit; font-size: 14px; line-height: 1.5; resize: none; outline: none; min-height: 120px;
  &::placeholder { color: rgba(255, 255, 255, 0.2); }
  &:focus { border-color: rgba(56, 189, 248, 0.35); }
}
.ai-count { text-align: right; font-size: 12px; color: var(--text-tertiary); }
.ai-section { display: flex; flex-direction: column; gap: 8px; }
.ai-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.style-chip { min-height: 36px; padding: 0 14px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 999px; background: rgba(255, 255, 255, 0.04); color: var(--text-secondary); font: inherit; font-size: 13px; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); }
  &.active { background: linear-gradient(135deg, rgba(56, 189, 248, 0.82), rgba(52, 211, 153, 0.78)); border-color: transparent; color: #fff; font-weight: 600; }
}
.advanced-toggle { padding: 8px 0; border: none; background: transparent; color: var(--text-tertiary); font: inherit; font-size: 13px; cursor: pointer; text-align: left; &:hover { color: var(--text-secondary); } }
.advanced-options { display: flex; flex-direction: column; gap: 12px; padding: 12px; border-radius: 6px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); }
.slider-row { display: flex; align-items: center; gap: 12px;
  label { font-size: 13px; color: var(--text-secondary); min-width: 48px; }
  input[type="range"] { flex: 1; }
  .slider-value { min-width: 24px; text-align: center; font-size: 13px; color: var(--text-primary); font-weight: 600; }
}
.ai-generate-btn { width: 100%; min-height: 52px; border: none; border-radius: 7px; background: linear-gradient(135deg, $sky-light, $sky, #0284c7); color: #fff; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(56, 189, 248, 0.28); transition: all 0.2s;
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(56, 189, 248, 0.40); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* ── 编辑器 ── */
.editor-body { width: min(960px, calc(100% - 32px)); margin: 16px auto 0; }
.source-badge { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.2); color: $sky-light; font-size: 12px; font-weight: 500; margin-bottom: 16px; }

.base-info-section { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 16px; }
.base-row { display: flex; flex-direction: column; align-items: stretch; gap: 12px; }
.avatar-upload { position: relative; width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 1px solid rgba(56, 189, 248, 0.2); flex-shrink: 0; cursor: pointer;
  .avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.2)); color: var(--text-tertiary); font-size: 24px; font-weight: 600; }
  .avatar-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 11px; opacity: 0; transition: opacity 0.2s; }
  &:hover .avatar-hint { opacity: 1; }
}
.base-fields { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.base-info-section.compact-avatar-name {
  .base-row { flex-direction: row; align-items: center; }
  .base-fields { justify-content: center; min-width: 0; }
  .avatar-upload { width: 76px; height: 76px; }
}

.chip-empty {
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  color: var(--text-tertiary);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.03);
}

.config-card { border-radius: 8px; padding: 16px; min-height: 100px; background: var(--card-bg); border: 1px solid var(--border-color); position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
  &:active { transform: scale(0.98); }
  &.filled { border-color: var(--primary-color); background: linear-gradient(135deg, rgba(56, 189, 248, 0.08), var(--card-bg)); }
}
.card-header { display: flex; flex-direction: column; gap: 6px; }
.card-emoji { font-size: 32px; line-height: 1; }
.card-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.card-status { font-size: 12px; color: var(--text-tertiary); }
.card-meta { display: flex; flex-direction: column; gap: 2px; }
.card-body { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.06); display: flex; flex-direction: column; gap: 12px; cursor: default; }
.card-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.6; margin: 0; }
.collapse-btn { align-self: flex-end; padding: 4px 10px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 3px; background: transparent; color: var(--text-tertiary); font: inherit; font-size: 12px; cursor: pointer; &:hover { border-color: rgba(56, 189, 248, 0.3); color: var(--text-secondary); } }

.field-input { width: 100%; padding: 7px 0; border: none; border-bottom: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 14px; line-height: 1.4; box-sizing: border-box; outline: none; transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
}
.field-textarea { width: 100%; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; background: rgba(255, 255, 255, 0.04); color: var(--text-primary); font: inherit; font-size: 14px; line-height: 1.5; box-sizing: border-box; outline: none; resize: none;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
  &:focus { border-color: rgba(56, 189, 248, 0.35); }
}
.field-label { display: block; margin-bottom: 6px; color: var(--text-tertiary); font-size: 12px; letter-spacing: 0.02em; }
.field-item { display: flex; flex-direction: column; gap: 0; }
.field-select { width: 100%; padding: 7px 0; border: none; border-bottom: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; line-height: 1.4; box-sizing: border-box; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0 center; padding-right: 16px; transition: border-color 0.2s;
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.category-select { width: 100%; padding: 10px 14px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; background: rgba(255, 255, 255, 0.05); color: var(--text-primary); font: inherit; font-size: 14px; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center;
  &:focus { outline: none; border-color: rgba(56, 189, 248, 0.36); }
  option { background: #0a1e2c; color: var(--text-primary); }
}
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.category-chip { min-height: 36px; padding: 0 14px; border: 1px solid rgba(52, 211, 153, 0.14); border-radius: 999px; background: rgba(52, 211, 153, 0.06); color: var(--text-secondary); font: inherit; font-size: 13px; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(52, 211, 153, 0.12); color: var(--text-primary); }
  &.active { background: linear-gradient(135deg, rgba(56, 189, 248, 0.82), rgba(52, 211, 153, 0.78)); border-color: transparent; color: #fff; font-weight: 700; }
  &.theme-chip { border-color: rgba(56, 189, 248, 0.18); background: rgba(56, 189, 248, 0.08); &:hover { background: rgba(56, 189, 248, 0.15); } &.active { background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.80)); border-color: transparent; color: #fff; font-weight: 700; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.30); } }
}

.empty-hint { text-align: center; color: var(--text-tertiary); font-size: 12px; padding: 12px 0; }
.number-input { width: 80px; text-align: center; }
.lore-entry-card { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px; background: rgba(255, 255, 255, 0.02); }
.lore-entry-header { display: flex; align-items: center; justify-content: space-between; }
.lore-entry-index { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.lore-entry-actions { display: flex; align-items: center; gap: 6px; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 3px; background: transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s;
  &:hover { border-color: rgba(56, 189, 248, 0.3); color: var(--text-secondary); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
  &.danger { border-color: rgba(248, 113, 113, 0.1); &:hover { border-color: rgba(248, 113, 113, 0.3); color: rgba(248, 113, 113, 0.8); } }
}
.lore-toggle { position: relative; display: inline-flex; align-items: center; width: 36px; height: 20px; cursor: pointer;
  input { opacity: 0; width: 0; height: 0; }
}
.lore-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}
.lore-toggle-slider { position: absolute; inset: 0; border-radius: 10px; background: rgba(255, 255, 255, 0.1); transition: background 0.2s;
  &::before { content: ''; position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--text-tertiary); transition: transform 0.2s; }
}
.lore-toggle input:checked + .lore-toggle-slider { background: rgba(52, 211, 153, 0.35); &::before { transform: translateX(16px); background: #34d399; } }
.lore-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
  &.two-col { grid-template-columns: 1fr 1fr; }
}

.world-book-card { display: flex; flex-direction: column; gap: 0; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 5px; background: rgba(255, 255, 255, 0.02); overflow: hidden; }
.world-book-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; cursor: pointer; transition: background 0.15s; &:hover { background: rgba(255, 255, 255, 0.03); } }
.world-book-title-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.world-book-name { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.world-book-meta { font-size: 11px; color: var(--text-tertiary); flex-shrink: 0; }
.world-book-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.expand-icon { transition: transform 0.2s; color: var(--text-tertiary); &.expanded { transform: rotate(180deg); } }
.world-book-body { display: flex; flex-direction: column; gap: 12px; padding: 10px 12px 12px; border-top: 1px solid rgba(255, 255, 255, 0.04); }

.avatar-btn { padding: 5px 12px; border: 1px solid rgba(52, 211, 153, 0.12); border-radius: 3px; background: transparent; color: var(--text-tertiary); font: inherit; font-size: 12px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px;
  &:hover { border-color: rgba(52, 211, 153, 0.3); color: #6ee7b7; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
.remove-media-btn { border-color: rgba(248, 113, 113, 0.15); &:hover { border-color: rgba(248, 113, 113, 0.3); color: rgba(248, 113, 113, 0.8); } }
.media-upload-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.media-preview { margin-top: 6px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.06); max-height: 120px;
  img, video { width: 100%; max-height: 120px; object-fit: cover; display: block; }
  &.small { max-height: 80px; img { max-height: 80px; } }
}
.emotion-row { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding: 8px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 3px; background: rgba(255, 255, 255, 0.02); }
.emotion-input { flex: 1; }
.emotion-actions { display: flex; gap: 6px; align-items: center; }

.inline-field { display: flex; flex-direction: row; align-items: center; gap: 10px;
  .field-label { margin-bottom: 0; flex-shrink: 0; }
  .field-input { width: auto; flex-shrink: 0; }
}

/* 列表项行 */
.list-item-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
  .field-input { flex: 1; }
  .icon-btn { flex-shrink: 0; }
}
.speech-row { .speech-cat-select { width: 100px; flex-shrink: 0; } }

/* 情境开场白行 */
.contextual-greeting-row { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px; background: rgba(255, 255, 255, 0.02); margin-bottom: 6px; }
.cg-header-row { display: flex; align-items: center; gap: 8px; }
.cg-context-select { width: 130px; flex-shrink: 0; }
.cg-label-input { flex: 1; }

/* 亲密触发/TTS行 */
.intimacy-trigger-row, .tts-config-row { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px; background: rgba(255, 255, 255, 0.02); margin-bottom: 6px; }
.ed-header { display: flex; align-items: center; justify-content: space-between; }

.alt-greeting-row { display: flex; align-items: flex-start; gap: 8px;
  .greeting-textarea { flex: 1; }
}

.custom-tags-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; background: rgba(255, 255, 255, 0.03); }
.tag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.18)); color: #fff; font-size: 12px; font-weight: 500; }
.tag-remove { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; padding: 0; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.15); color: #fff; cursor: pointer; transition: background 0.15s; &:hover { background: rgba(248, 113, 113, 0.5); } }
.tag-input { flex: 1; min-width: 80px; padding: 4px 0; border: none; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; outline: none; &::placeholder { color: rgba(255, 255, 255, 0.2); } }
.field-hint { margin: 10px 0 0; color: var(--text-tertiary); font-size: 12px; line-height: 1.6; }

/* ── 提交栏 ── */
.submit-bar { position: sticky; bottom: 0; z-index: 10; width: min(960px, calc(100% - 32px)); margin: 24px auto 0; padding: 16px 0 calc(16px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(transparent, rgba(5, 13, 20, 0.95) 30%); }
.submit-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.outline-btn { min-height: 48px; padding: 0 20px; border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 7px; background: transparent; color: var(--primary-light); font: inherit; font-size: 15px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.2s;
  &:hover { background: rgba(56, 189, 248, 0.08); border-color: rgba(56, 189, 248, 0.55); }
  &:active { background: rgba(56, 189, 248, 0.14); }
}
.primary-btn.full { width: 100%; min-height: 48px; border: none; border-radius: 7px; background: linear-gradient(135deg, $sky-light, $sky, #0284c7); color: #fff; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(56, 189, 248, 0.28); flex: 1;
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(56, 189, 248, 0.40); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
}

.hidden-file-input { display: none; }
.world-book-actions-row { display: flex; gap: 8px; flex-wrap: wrap; }

@media (max-width: 640px) {
  .template-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
