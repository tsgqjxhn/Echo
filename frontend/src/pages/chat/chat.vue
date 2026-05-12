<template>
  <div class="chat-page" :style="chatPageStyle">
    <header class="chat-header">
      <button v-if="showBackButton" type="button" class="btn-back" @click="router.back()">
        <svg viewBox="0 0 1024 1024" width="20" height="20">
          <path d="M768 112.512L718.016 64 256 512l462.016 448 49.984-48.512L355.968 512z" fill="currentColor"/>
        </svg>
      </button>
      <ConversationSwitchButton
        v-else-if="showRandomSwitchButton"
        class="header-switch"
        :disabled="switchingCharacter || isCurrentChatGenerating"
        @click="switchToRandomCharacter"
      />

      <button type="button" class="header-center" @click="showDetailSheet = true">
        <strong>{{ character?.name || '角色' }}</strong>
        <span v-if="character?.sceneTime" class="header-scene">{{ character.sceneTime }}</span>
      </button>

      <button v-if="showHeaderTTS" type="button" class="btn-tts" :class="{ active: isHeaderTTSSpeaking }" @click="toggleHeaderTTS" aria-label="语音朗读">
        <svg v-if="isHeaderTTSSpeaking" viewBox="0 0 1024 1024" width="22" height="22">
          <path d="M257.5 322.4l215.6-133c24.98-15.4 57.88-7.9 73.5 16.75A51.2 51.2 0 0 1 554.7 234v556c0 29.4-23.9 53-53.3 53a53.3 53.3 0 0 1-28.3-8L257.5 701.6H160c-41.2 0-74.7-33-74.7-73.7V396.1c0-40.7 33.5-73.7 74.7-73.7h97.5zm26.1 58.4a32.3 32.3 0 0 1-17 4.8H160c-5.9 0-10.7 4.7-10.7 10.5v231.8c0 5.8 4.8 10.5 10.7 10.5h106.7c6 0 11.9 1.7 17 4.8L490.7 771V253L283.6 380.8zM801 830a32.3 32.3 0 0 1-45.2-.8 31.3 31.3 0 0 1 .8-44.7c157.6-150.5 157.6-394 0-544.4a31.3 31.3 0 0 1-.8-44.7 32.3 32.3 0 0 1 45.2-.8c183.7 175.3 183.7 460 0 635.3zm-107-126.2a32.3 32.3 0 0 1-45.2-1.2 31.3 31.3 0 0 1 1.2-44.7c86.2-80.6 86.2-210.6 0-291.2a31.3 31.3 0 0 1-1.2-44.7 32.3 32.3 0 0 1 45.2-1.2c112.9 105.5 112.9 277.4 0 383z" fill="currentColor"/>
        </svg>
        <svg v-else viewBox="0 0 1026 1024" width="22" height="22">
          <path d="M240.023158 329.356725H144.719298c-8.819774 0-15.968811 7.149037-15.968811 15.968811v328.358675c0 8.819774 7.149037 15.96881 15.968811 15.96881h193.621833c0 0.07685 0.036928 0.149708 0.099805 0.195618l182.323898 133.236772a7.984405 7.984405 0 0 0 12.695205-6.446409V622.793606l64.374269 64.374269v240.995306c0 8.819774-7.149037 15.968811-15.968811 15.968811a15.968811 15.968811 0 0 1-9.422596-3.075992L320.078799 756.605255a15.968811 15.968811 0 0 0-9.422596-3.07699H128.750487c-35.277099 0-63.875244-28.598144-63.875243-63.875244V329.356725c0-35.277099 28.598144-63.875244 63.875243-63.875244h47.397427l63.875244 63.875244zM533.460039 442.126472V203.34584a7.984405 7.984405 0 0 0-12.695205-6.446409l-134.351594 98.180242-45.171774-45.171774L572.443899 80.92694c7.120094-5.204834 17.110581-3.650869 22.314417 3.469224A15.968811 15.968811 0 0 1 597.834308 93.816764v412.683977l-64.374269-64.374269z m336.776234 336.776234l-43.516008-43.51501C873.074729 672.799938 896.251462 598.005021 896.251462 511.001949c0-138.745014-58.939883-246.440671-176.820647-323.088967A47.906433 47.906433 0 0 1 697.639376 147.751423V144.717349c0-14.036585 11.378776-25.415361 25.415361-25.415361 4.359485 0 8.644117 1.120811 12.445692 3.255642C885.249949 206.655376 960.126706 336.137481 960.126706 511.001949c0 114.37062-40.59671 203.053411-89.890433 267.900757z m-90.129965 90.537169C737.183142 902.479345 702.280312 917.638737 697.639376 916.210526c-12.974659-3.992203-19.961014-16.269224-19.961013-34.931774 0-11.10531 5.301645-21.265466 15.903937-30.480467a45.910331 45.910331 0 0 1 6.746823-4.863501c11.948663-7.066199 23.35239-14.421832 34.208187-22.063907l45.568998 45.568998z m0.504016-180.163119l-47.753731-47.753731C755.502363 603.286706 768.500975 558.661864 768.500975 511.001949c0-88.404335-44.723649-166.363072-112.779727-212.48499-15.968811-11.078363-33.933723-31.039376-29.941521-48.006238s17.964912-29.94152 29.941521-25.916382C760.489622 277.271454 832.376218 385.741598 832.376218 511.001949c0 67.674823-18.361138 128.419181-51.765894 178.274807zM688.117973 777.45154A323.332491 323.332491 0 0 1 664.703704 790.45614c-13.97271 4.895439-24.951267 4.990253-36.927876-14.97076-9.769918-16.283197-1.60786-29.909583 15.275166-43.100819l45.066979 45.065981zM90.7537 90.752749c12.472639-12.472639 32.694144-12.472639 45.166783 0L936.922027 891.753294c12.472639 12.472639 12.472639 32.694144 0 45.166784s-32.694144 12.472639-45.166783 0L90.754698 135.918534c-12.472639-12.472639-12.472639-32.694144 0-45.166784z" fill="currentColor"/>
        </svg>
      </button>

      <button v-if="hasChatMoreActions" type="button" class="btn-more" aria-label="更多" @click="showChatMore = !showChatMore">
        <svg viewBox="0 0 1024 1024" width="22" height="22">
          <path d="M512 298.6496a85.3504 85.3504 0 1 0 0-170.6496 85.3504 85.3504 0 0 0 0 170.6496z" fill="currentColor"/>
          <path d="M512 512m-85.3504 0a85.3504 85.3504 0 1 0 170.7008 0 85.3504 85.3504 0 1 0-170.7008 0Z" fill="currentColor"/>
          <path d="M512 896a85.3504 85.3504 0 1 0 0-170.7008 85.3504 85.3504 0 0 0 0 170.7008z" fill="currentColor"/>
        </svg>
      </button>
    </header>

    <!-- 群聊/多人顶部成员头像栏 -->
    <div v-if="isMultiplayerChat && groupMembers.length > 0" class="member-avatar-bar">
      <div class="member-avatar-list">
        <div
          v-for="member in groupMembers"
          :key="member.id"
          class="member-avatar-item"
          :class="{ narrator: member.isNarrator }"
          @click="showMemberDetail(member)"
        >
          <img
            v-if="member.avatar"
            :src="member.avatar"
            :alt="member.name"
            class="member-avatar-img"
          />
          <div v-else class="member-avatar-fallback">{{ member.name?.charAt(0) || '?' }}</div>
          <span class="member-avatar-name">{{ member.name }}</span>
        </div>
      </div>
    </div>

    <main class="message-list">
      <section v-if="showQuickPrompts" class="hero-card">
        <p class="hero-eyebrow">开始对话</p>
        <h1>{{ character?.name || '角色' }} 正在线</h1>
        <p class="hero-copy">
          你可以直接输入对白，也可以用括号补充动作、表情和语气。
        </p>

        <div class="prompt-list">
          <button
            v-for="prompt in quickPrompts"
            :key="prompt"
            type="button"
            class="prompt-chip"
            @click="sendQuickPrompt(prompt)"
          >
            {{ prompt }}
          </button>
        </div>
      </section>

      <div v-if="messages.length === 0 && !showQuickPrompts" class="empty-state">
        <strong>还没有消息</strong>
        <p>发送第一句话，或从上方推荐提示开始。</p>
      </div>

      <div
        v-for="(message, index) in messages"
        :key="message.id"
        class="message-row"
      >
        <MessageBubble
          :message="message"
          :is-user="message.role === 'user'"
          :is-last-message="isLastAssistantMessage(index)"
          :assistant-avatar="getMessageAvatar(message)"
          :user-avatar="playerAvatar"
          :sender-name="getMessageSenderName(message)"
          :message-type="getMessageType(message)"
          @retry="retryGeneration(message.id)"
          @avatar-click="openCharacterSheet"
          @image-click="onImageClick"
        />
      </div>
    </main>

    <footer class="composer-shell">
      <div v-if="recordingState !== RecordingState.IDLE" class="recording-card">
        <strong>
          {{
            recordingState === RecordingState.RECORDING
              ? '正在录音'
              : recordingState === RecordingState.PROCESSING
                ? '正在转写'
                : '按住说话'
          }}
        </strong>
        <span>{{ recordingCopy }}</span>
      </div>

      <div class="composer">
        <div class="composer-row">
          <div class="input-area">
            <textarea
              v-if="!voiceMode"
              ref="inputRef"
              v-model="inputText"
              class="message-input"
              :disabled="isCurrentChatGenerating || recordingState === RecordingState.PROCESSING"
              placeholder="输入消息…"
              rows="1"
              @keydown.enter.exact.prevent="sendMessage"
              @focus="onInputFocus"
              @blur="onInputBlur"
              @pointerdown="onInputPointerDown"
              @pointerup="onInputPointerUp"
              @pointerleave="onInputPointerUp"
            />
            <button
              v-else
              type="button"
              class="hold-to-talk"
              :class="{ recording: recordingState === RecordingState.RECORDING }"
              draggable="false"
              @pointerdown.prevent="onHoldToTalkStart"
              @pointerup.prevent="onHoldToTalkEnd"
              @pointerleave.prevent="onHoldToTalkEnd"
              @pointercancel.prevent="onHoldToTalkEnd"
              @contextmenu.prevent
              @selectstart.prevent
              @dragstart.prevent
            >
              {{ holdToTalkLabel }}
            </button>
          </div>

          <button
            v-if="showBracketButton"
            type="button"
            class="icon-btn bracket-btn"
            title="插入括号"
            @pointerdown.prevent="insertParenthesesAtCursor"
          >
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path
                d="M395.733333 128H288.853333A679.509333 679.509333 0 0 0 170.666667 512c0 142.378667 43.605333 274.602667 118.186666 384h106.88A594.901333 594.901333 0 0 1 256 512c0-146.176 52.48-280.106667 139.733333-384z m232.533334 768A594.901333 594.901333 0 0 0 768 512c0-146.176-52.48-280.106667-139.733333-384h106.922666A679.509333 679.509333 0 0 1 853.333333 512c0 142.378667-43.605333 274.602667-118.186666 384h-106.88z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            v-if="showVoiceToggle"
            type="button"
            class="icon-btn"
            :title="voiceMode ? '键盘' : '语音'"
            @click="toggleVoiceModeBtn"
          >
            <svg v-if="!voiceMode" viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" fill="currentColor"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="20" height="20">
              <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" fill="currentColor"/>
            </svg>
          </button>

          <button
            v-if="showSendButton"
            type="button"
            class="send-circle-btn send-mode"
            :disabled="isCurrentChatGenerating || !hasSendableContent"
            @click="sendMessage"
            title="发送"
          >
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path
                d="M512 85.333333c234.666667 0 426.666667 192 426.666667 426.666667s-192 426.666667-426.666667 426.666667S85.333333 746.666667 85.333333 512 277.333333 85.333333 512 85.333333z m-6.4 234.666667c-4.266667 2.133333-6.4 2.133333-12.8 8.533333l-153.6 153.6c-12.8 12.8-12.8 32 0 44.8 12.8 12.8 32 12.8 44.8 0l96-96V682.666667c0 17.066667 14.933333 32 32 32s32-14.933333 32-32V430.933333l96 96c12.8 12.8 32 12.8 44.8 0s12.8-32 0-44.8l-153.6-153.6c-6.4-6.4-8.533333-8.533333-12.8-8.533333s-8.533333-2.133333-12.8 0z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            v-else
            type="button"
            class="send-circle-btn"
            :class="{ open: showTools }"
            @click="toggleTools"
            title="更多"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div v-if="showTools" class="tools-panel">
          <button type="button" class="icon-btn" title="回滚" @click="doRollback">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor"/>
            </svg>
          </button>

          <button type="button" class="icon-btn" title="图片" @click="chooseImage">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </footer>

    <div class="page-floor" aria-hidden="true"></div>

    <Teleport to="body">
      <div v-if="showChatMore" class="chat-more-overlay" @click.self="showChatMore = false">
        <div class="chat-more-menu">
          <button v-if="hasGalleryAction" type="button" class="chat-more-item" @click="openGallery">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z" fill="currentColor"/>
            </svg>
            <span>图鉴</span>
          </button>
          <button v-if="hasChatSettingsAction" type="button" class="chat-more-item" @click="openChatSettings">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M19.14 12.94a7.957 7.957 0 0 0 .04-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.97 7.97 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.97 7.97 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.69 8.84a.5.5 0 0 0 .12.64l2.03 1.58a8 8 0 0 0 0 1.88L2.81 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.38 1.04.69 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.97 7.97 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" fill="currentColor"/>
            </svg>
            <span>会话设置</span>
          </button>
        </div>
      </div>
    </Teleport>

    <ChatSettingsSheet
      :visible="showChatSettings"
      :character-id="characterId"
      :character-name="character?.name"
      @close="showChatSettings = false"
      @change="onChatSettingsChange"
    />

    <StoryGallery :visible="showGallery" @close="showGallery = false" />

    <ImageViewer
      :visible="imageViewerVisible"
      :src="imageViewerSrc"
      :caption="imageViewerCaption"
      @close="imageViewerVisible = false"
    />

    <Teleport to="body">
      <div
        v-if="charPopoverVisible"
        class="char-popover-overlay"
        @click.self="charPopoverVisible = false"
      >
        <section
          class="char-popover"
          :class="`char-popover--${charPopoverPlacement}`"
          :style="charPopoverStyle"
        >
          <div class="char-popover-head">
            <img v-if="characterAvatar" :src="characterAvatar" :alt="character?.name" class="char-popover-avatar" />
            <div class="char-popover-copy">
              <div class="char-popover-name-row">
                <strong>{{ character?.name || '角色' }}</strong>
                <span class="affinity-badge">好感 {{ currentAffinity }}</span>
              </div>
              <span>{{ character?.description?.slice(0, 48) || '角色简介' }}</span>
            </div>
          </div>
          <div class="char-popover-list">
            <button type="button" class="char-popover-btn" :disabled="charPopoverBusy" @click="sheetClearHistory">
              清空聊天记录
            </button>
            <button type="button" class="char-popover-btn" :disabled="charPopoverBusy" @click="sheetToggleFriend">
              {{ character?.isFriend ? '取消好友' : '添加好友' }}
            </button>
            <button type="button" class="char-popover-btn" :disabled="charPopoverBusy" @click="sheetToggleLike">
              {{ character?.isLiked ? '取消点赞' : '点赞' }}
            </button>
            <button v-if="isGroupCharacter" type="button" class="char-popover-btn" :disabled="charPopoverBusy" @click="sheetEnterGroup">
              进入该群
            </button>
            <button v-else-if="character?.isFriend" type="button" class="char-popover-btn" :disabled="charPopoverBusy" @click="sheetInviteToGroup">
              邀请进入群聊
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showInviteModal" class="invite-overlay" @click.self="showInviteModal = false">
        <section class="invite-modal">
          <div class="invite-modal-head">
            <strong>邀请进入群聊</strong>
            <button type="button" class="invite-close-btn" @click="showInviteModal = false">×</button>
          </div>
          <p class="invite-hint">选择要邀请 <b>{{ character?.name }}</b> 加入的群聊</p>
          <div v-if="groupCharacters.length > 0" class="invite-list">
            <article
              v-for="group in groupCharacters"
              :key="group.id"
              class="invite-group-item"
              @click="confirmInviteToGroup(group)"
            >
              <img :src="group.avatar || defaultAvatar" :alt="group.name" class="invite-group-avatar" />
              <div class="invite-group-info">
                <span class="invite-group-name">{{ group.name }}</span>
                <span class="invite-group-meta">{{ group.members?.length || 0 }} 位成员</span>
              </div>
              <span class="invite-arrow">›</span>
            </article>
          </div>
          <div v-else class="invite-empty">
            <p>暂无可用群聊</p>
            <small>先创建一个群聊角色</small>
          </div>
        </section>
      </div>
    </Teleport>

    <div v-if="showDetailSheet" class="overlay" @click.self="showDetailSheet = false">
      <section class="detail-sheet">
        <header class="detail-head">
          <div class="detail-profile">
            <img :src="characterAvatar" :alt="character?.name || '角色'" class="detail-avatar" />
            <div>
              <strong>{{ character?.name || '角色' }}</strong>
              <span>{{ characterMeta }}</span>
            </div>
          </div>

          <button type="button" class="icon-close" @click="showDetailSheet = false">×</button>
        </header>

        <section class="detail-section">
          <p class="detail-label">角色简介</p>
          <p class="detail-text">{{ character?.description || '暂无角色简介。' }}</p>
        </section>

        <section class="detail-section">
          <p class="detail-label">记忆摘要</p>
          <p class="detail-text">{{ memorySummary || '暂无记忆摘要。' }}</p>
        </section>

        <section class="detail-section">
          <p class="detail-label">偏好标签</p>
          <div class="tag-list">
            <span v-for="item in memoryPreferences" :key="item" class="memory-tag">
              {{ item }}
            </span>
            <span v-if="memoryPreferences.length === 0" class="memory-tag subtle">暂无</span>
          </div>
        </section>

        <section class="detail-actions">
          <button type="button" class="ghost-btn" @click="openCharacterDetail">查看详情</button>
          <button type="button" class="ghost-btn" @click="confirmClearHistory">清空记录</button>
        </section>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConversationSwitchButton from '@/components/ConversationSwitchButton/index.vue'
import { useChatStore } from '@/stores/chat'
import { useCharacterStore } from '@/stores/character'
import type { ICharacter, GroupMember } from '@/types/character'
import { useUserStore } from '@/stores/user'
import { isMultiplayerCategory } from '@/data/taxonomy'
import { uni } from '@/utils/uni-polyfill'
import MessageBubble from '@/components/MessageBubble/index.vue'
import { TTSService } from '@/services/tts'
import { DEFAULT_STT_CONFIG, loadVoiceSettings } from '@/services/voice-settings'
import { RecordingState, STTService } from '@/services/stt'
import { loadCharacterMemory } from '@/services/chat-memory'
import { requestPermission } from '@/services/permissions'
import { switchToRandomLocalCharacter } from '@/services/random-character-switch'
import { getStorageDriver } from '@/services/storage'
import { ECHO_STORY_CHARACTER_ID } from '@/services/story-conversations'
import StoryGallery from '@/components/StoryGallery/index.vue'
import type { IMessage } from '@/types/chat'
import ImageViewer from '@/components/ImageViewer/index.vue'
import ChatSettingsSheet from '@/components/ChatSettingsSheet/index.vue'
import {
  loadChatSettings,
  DEFAULT_CHAT_SETTINGS,
  type ChatSettings,
} from '@/services/chat-settings'

const AUTO_VOICE_KEY = 'chat_auto_tts'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const characterStore = useCharacterStore()
const userStore = useUserStore()
const storage = getStorageDriver()

const character = ref<any>(null)
const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isInputFocused = ref(false)
const showDetailSheet = ref(false)
const charPopoverVisible = ref(false)
const charPopoverBusy = ref(false)
const charPopoverAnchor = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const showInviteModal = ref(false)
const autoVoicePlayback = ref(false)
const voiceMode = ref(false)
const showTools = ref(false)
const recordingState = ref<RecordingState>(RecordingState.IDLE)
const recordingStartedAt = ref(0)
const isHoldingToTalk = ref(false)
const isStartingVoiceRecording = ref(false)
const memorySummary = ref('')
const memoryPreferences = ref<string[]>([])
const switchingCharacter = ref(false)
const showChatMore = ref(false)
const showChatSettings = ref(false)
const chatSettings = ref<ChatSettings>({ ...DEFAULT_CHAT_SETTINGS })
const showGallery = ref(false)
const imageViewerVisible = ref(false)
const imageViewerSrc = ref('')
const imageViewerCaption = ref('')

const sttService = ref<STTService | null>(null)
const ttsService = ref<TTSService | null>(null)
const lastAutoSpokenMessageId = ref('')
const isHeaderTTSSpeaking = ref(false)

let longPressTimer: ReturnType<typeof setTimeout> | null = null

const defaultAvatar = '/src/static/images/default-avatar.svg'
const characterId = computed(() => route.params.characterId as string)
const sessionId = computed(() => (route.query.sessionId as string) || '')
const isHistoryEntry = computed(() => route.query.from === 'history')
const currentAffinity = computed(() => getAffinity(characterId.value))
const messages = computed(() => chatStore.messages)
const hasComposerContent = computed(() => inputText.value.length > 0)
const hasSendableContent = computed(() => inputText.value.trim().length > 0)
const showBracketButton = computed(() => !voiceMode.value && (hasComposerContent.value || isInputFocused.value))
const showVoiceToggle = computed(() => !hasComposerContent.value && showVoiceInputToggle.value)
const showSendButton = computed(() => hasComposerContent.value)
const hasGalleryAction = computed(() =>
  characterId.value === ECHO_STORY_CHARACTER_ID || character.value?.sourceType === 'builtin-story'
)
const isStarCharacter = computed(() =>
  characterId.value === ECHO_STORY_CHARACTER_ID || character.value?.sourceType === 'builtin-story'
)
const hasChatSettingsAction = computed(() => !isStarCharacter.value && Boolean(characterId.value))
const hasChatMoreActions = computed(() => hasGalleryAction.value || hasChatSettingsAction.value)
const showHeaderTTS = computed(() => isStarCharacter.value || chatSettings.value.enableTTS)
const showVoiceInputToggle = computed(() => isStarCharacter.value || chatSettings.value.enableVoiceInput)
const showBackButton = computed(() => isHistoryEntry.value)
const showRandomSwitchButton = computed(() => !isHistoryEntry.value)
const isCurrentChatGenerating = computed(() => chatStore.isCurrentSessionGenerating)
const characterAvatar = computed(() => character.value?.avatar || defaultAvatar)
const playerAvatar = computed(() => userStore.userAvatar || defaultAvatar)
const characterMeta = computed(() =>
  [character.value?.category, character.value?.subCategory].filter(Boolean).join(' / ') || '角色设定'
)

const chatPageStyle = computed(() => {
  const bg = character.value?.chatBackground || character.value?.globalBackground
  if (!bg) return undefined
  return {
    backgroundImage: `url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  }
})
const showQuickPrompts = computed(() => messages.value.length <= 1 && !isCurrentChatGenerating.value)
const quickPrompts = computed(() => {
  const name = character.value?.name || 'TA'
  return [
    `${name}，先用一句话介绍你现在的状态。`,
    '从当前场景继续，不要跳出角色。',
    '描述一下你现在的动作、表情和语气。'
  ]
})
const recordingCopy = computed(() => {
  if (recordingState.value === RecordingState.RECORDING) {
    return '正在录音，松开后会自动发送。'
  }

  if (recordingState.value === RecordingState.PROCESSING) {
    return '正在转写语音，请稍候。'
  }

  return '按住按钮说话，松开发送。'
})

const holdToTalkLabel = computed(() =>
  isHoldingToTalk.value || recordingState.value === RecordingState.RECORDING
    ? '正在输入中……'
    : '按住说话'
)


const isMultiplayerChat = computed(() => isMultiplayerCategory(character.value?.category))
const groupMembers = computed<GroupMember[]>(() => character.value?.structuredMembers || [])

const groupCharacters = computed(() =>
  characterStore.characters.filter(c => c.mode === 'group-chat' || c.mode === 'group-challenge' || c.mode === 'multi-free' || c.mode === 'multi-story' || c.mode === 'multi-game')
)

const isGroupCharacter = computed(() =>
  character.value?.mode === 'group-chat' || character.value?.mode === 'group-challenge' || character.value?.mode === 'multi-free' || character.value?.mode === 'multi-story' || character.value?.mode === 'multi-game'
)

const charPopoverPlacement = computed<'top' | 'bottom'>(() => {
  const a = charPopoverAnchor.value
  if (!a) return 'top'
  const estimatedHeight = 220
  return a.top < estimatedHeight && (window.innerHeight - a.top - a.height) > a.top ? 'bottom' : 'top'
})

const charPopoverStyle = computed(() => {
  const a = charPopoverAnchor.value
  if (!a) return { top: '16px', left: '16px' }
  const pw = Math.min(248, Math.max(212, window.innerWidth - 32))
  const eh = 220
  const gap = 14
  const hp = 12
  const bss = 160
  const left = Math.min(Math.max(hp, window.innerWidth - pw - hp), Math.max(hp, a.left + a.width / 2 - pw / 2))
  const rawTop = charPopoverPlacement.value === 'top' ? a.top - eh - gap : a.top + a.height + gap
  const top = Math.min(Math.max(12, window.innerHeight - bss - eh), Math.max(12, rawTop))
  const arrowLeft = Math.min(pw - 28, Math.max(28, a.left + a.width / 2 - left))
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${pw}px`,
    '--char-popover-arrow-left': `${arrowLeft}px`
  }
})

onActivated(async () => {
  // Re-initialize if keep-alive reactivates this instance while chatStore holds a different character's data.
  if (chatStore.currentCharacterId && chatStore.currentCharacterId !== characterId.value) {
    await initChat()
    await loadCharacter()
  }
  scrollToBottom()
})

onMounted(async () => {
  await Promise.all([
    userStore.loadUserInfo().catch(() => null),
    initChat()
  ])

  await loadCharacter()
  if (character.value?.sourceType === 'builtin-story' || characterId.value === ECHO_STORY_CHARACTER_ID) {
    router.replace('/dialogue')
    return
  }

  await loadAutoVoicePlayback()
  await refreshMemory()
  scrollToBottom()
})

watch(
  () => {
    const lastMessage = messages.value[messages.value.length - 1]
    return `${messages.value.length}:${lastMessage?.id || ''}:${lastMessage?.content.length || 0}:${isCurrentChatGenerating.value}`
  },
  async () => {
    scrollToBottom()
    await maybeAutoSpeak()
    if (!isCurrentChatGenerating.value) {
      await refreshMemory()
    }
  }
)

watch(hasComposerContent, hasContent => {
  if (!hasContent) {
    return
  }

  showTools.value = false
  voiceMode.value = false
})

function scrollToBottom() {
  nextTick(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight })
    })
  })
}

async function initChat() {
  if (!characterId.value) {
    return
  }

  try {
    await chatStore.initChat(characterId.value, sessionId.value || undefined)
  } catch {
    if (!sessionId.value) {
      throw new Error('Failed to initialize chat session.')
    }

    await chatStore.initChat(characterId.value)
  }
}

async function loadCharacter() {
  character.value = await characterStore.getCharacterById(characterId.value)
  await reloadChatSettings()
}

async function switchToRandomCharacter() {
  if (switchingCharacter.value || isCurrentChatGenerating.value || !showRandomSwitchButton.value) {
    return
  }

  switchingCharacter.value = true

  try {
    const target = await switchToRandomLocalCharacter(router, {
      excludeCharacterIds: characterId.value ? [characterId.value] : []
    })

    if (!target) {
      uni.showToast({ title: '没有可切换的本地角色', icon: 'none' })
    }
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '切换失败',
      icon: 'none'
    })
  } finally {
    window.setTimeout(() => {
      switchingCharacter.value = false
    }, 180)
  }
}

async function refreshMemory() {
  if (!characterId.value || !character.value) {
    return
  }

  const profile = await loadCharacterMemory(storage, characterId.value, character.value.name)
  memorySummary.value = profile.summary
  memoryPreferences.value = profile.userPreferences.slice(-4)
}

async function loadAutoVoicePlayback() {
  const raw = await storage.getUserSetting(AUTO_VOICE_KEY)
  autoVoicePlayback.value = raw === '1'
}

async function maybeAutoSpeak() {
  if (!autoVoicePlayback.value || isCurrentChatGenerating.value) {
    return
  }

  // For non-star characters, respect the per-character chat settings: when
  // either TTS or auto-TTS is disabled, skip auto playback entirely.
  if (!isStarCharacter.value) {
    if (!chatSettings.value.enableTTS || !chatSettings.value.autoTTS) {
      return
    }
  }

  const lastMessage = [...messages.value].reverse().find(message => message.role === 'assistant')
  if (!lastMessage || lastMessage.id === lastAutoSpokenMessageId.value || !lastMessage.content.trim()) {
    return
  }

  const settings = await loadVoiceSettings()
  ttsService.value?.destroy()
  ttsService.value = new TTSService({
    ...settings.tts,
    language: settings.tts.language || 'zh-CN'
  })

  lastAutoSpokenMessageId.value = lastMessage.id
  try {
    await ttsService.value.speak(lastMessage.content)
  } catch {
    // Ignore autoplay failures.
  }
}

async function toggleHeaderTTS() {
  if (isHeaderTTSSpeaking.value) {
    ttsService.value?.stop()
    isHeaderTTSSpeaking.value = false
    return
  }

  const lastAssistant = [...messages.value].reverse().find(m => m.role === 'assistant')
  if (!lastAssistant?.content.trim()) return

  const settings = await loadVoiceSettings()
  ttsService.value?.destroy()
  ttsService.value = new TTSService({
    ...settings.tts,
    language: settings.tts.language || 'zh-CN',
  })
  ttsService.value.onEnd(() => { isHeaderTTSSpeaking.value = false })
  ttsService.value.onError(() => { isHeaderTTSSpeaking.value = false })

  isHeaderTTSSpeaking.value = true
  try {
    await ttsService.value.speak(lastAssistant.content)
  } catch {
    isHeaderTTSSpeaking.value = false
  }
}

async function sendQuickPrompt(prompt: string) {
  inputText.value = prompt
  await sendMessage()
}

async function sendMessage() {
  const content = inputText.value.trim()
  if (!content || isCurrentChatGenerating.value) {
    return
  }

  inputText.value = ''

  try {
    await chatStore.sendMessage(content)
  } catch (error) {
    inputText.value = content
    uni.showToast({
      title: (error as Error).message || '发送失败',
      icon: 'none'
    })
  }
}

async function chooseImage() {
  const storagePerm = await requestPermission('storage')
  if (!storagePerm.granted) {
    uni.showToast({ title: '存储权限被拒绝', icon: 'none' })
    return
  }

  uni.chooseImage({
    count: 1,
    success: async res => {
      const imagePath = res.tempFilePaths?.[0]
      if (!imagePath) {
        return
      }

      try {
        await chatStore.sendImage(imagePath)
      } catch (error) {
        uni.showToast({
          title: (error as Error).message || '图片发送失败',
          icon: 'none'
        })
      }
    }
  })
}

function toggleTools() {
  showTools.value = !showTools.value
}

function toggleVoiceModeBtn() {
  if (voiceMode.value && recordingState.value === RecordingState.RECORDING) {
    finishVoiceRecording()
  }

  isInputFocused.value = false
  showTools.value = false
  voiceMode.value = !voiceMode.value
}

function onInputFocus() {
  isInputFocused.value = true
}

function onInputBlur() {
  isInputFocused.value = false
}

function insertParenthesesAtCursor() {
  if (isCurrentChatGenerating.value || recordingState.value === RecordingState.PROCESSING) {
    return
  }

  voiceMode.value = false
  showTools.value = false
  isInputFocused.value = true

  const currentValue = inputText.value
  const textarea = inputRef.value
  const start = textarea?.selectionStart ?? currentValue.length
  const end = textarea?.selectionEnd ?? currentValue.length
  const selectedText = currentValue.slice(start, end)
  const insertion = selectedText ? `（${selectedText}）` : '（）'

  inputText.value = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`

  void nextTick(() => {
    const element = inputRef.value
    if (!element) {
      return
    }

    element.focus()
    const cursor = selectedText ? start + insertion.length : start + 1
    element.setSelectionRange(cursor, cursor)
  })
}

function onInputPointerDown() {
  longPressTimer = null
}

function onInputPointerUp() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function setHoldPointerCapture(event?: PointerEvent) {
  const target = event?.currentTarget as HTMLElement | undefined
  try {
    target?.setPointerCapture?.(event?.pointerId ?? 0)
  } catch {
    // Some embedded WebViews throw if pointer capture is unavailable for this event.
  }
}

function releaseHoldPointerCapture(event?: PointerEvent) {
  const target = event?.currentTarget as HTMLElement | undefined
  try {
    target?.releasePointerCapture?.(event?.pointerId ?? 0)
  } catch {
    // Safe to ignore: the button may already have lost capture after pointerleave.
  }
}

function isVoiceRecording() {
  return recordingState.value === RecordingState.RECORDING
}

async function onHoldToTalkStart(event?: PointerEvent) {
  event?.preventDefault()
  setHoldPointerCapture(event)

  if (
    isCurrentChatGenerating.value ||
    recordingState.value !== RecordingState.IDLE ||
    isStartingVoiceRecording.value
  ) {
    return
  }

  isHoldingToTalk.value = true
  isStartingVoiceRecording.value = true

  try {
    await toggleVoiceRecording()
  } finally {
    isStartingVoiceRecording.value = false
  }

  if (!isHoldingToTalk.value && isVoiceRecording()) {
    await finishVoiceRecording()
  } else if (!isVoiceRecording()) {
    isHoldingToTalk.value = false
  }
}

async function onHoldToTalkEnd(event?: PointerEvent) {
  event?.preventDefault()
  releaseHoldPointerCapture(event)

  isHoldingToTalk.value = false

  if (isStartingVoiceRecording.value) {
    return
  }

  if (recordingState.value === RecordingState.RECORDING) {
    await finishVoiceRecording()
  } else if (recordingState.value === RecordingState.ERROR) {
    recordingState.value = RecordingState.IDLE
    sttService.value?.cancel()
  }
}

async function doRollback() {
  const assistantMessages = messages.value.filter(m => m.role === 'assistant')
  const last = assistantMessages[assistantMessages.length - 1]
  if (!last) {
    return
  }
  await retryGeneration(last.id)
}

async function toggleVoiceRecording() {
  if (!sttService.value) {
    const settings = await loadVoiceSettings()
    sttService.value = new STTService({
      language: settings.stt.language || DEFAULT_STT_CONFIG.language
    })
    sttService.value.onResult((text, _isFinal) => {
      // 实时收集本地识别结果，确保 transcribe() 能取到文本
      if (text) {
        console.log('STT 识别中:', text)
      }
    })
    sttService.value.onError((error) => {
      recordingState.value = RecordingState.IDLE
      isHoldingToTalk.value = false
      uni.showToast({
        title: error.message || '语音识别失败',
        icon: 'none'
      })
    })
  }

  if (!sttService.value.isSupported()) {
    uni.showToast({
      title: '当前设备不支持语音输入',
      icon: 'none'
    })
    return
  }

  if (recordingState.value === RecordingState.PROCESSING) {
    return
  }

  if (recordingState.value === RecordingState.RECORDING) {
    await finishVoiceRecording()
    return
  }

  try {
    await sttService.value.startRecording()
    recordingState.value = RecordingState.RECORDING
    recordingStartedAt.value = Date.now()
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '开始录音失败',
      icon: 'none'
    })
    recordingState.value = RecordingState.IDLE
  }
}

async function finishVoiceRecording() {
  if (!sttService.value) {
    return
  }

  isHoldingToTalk.value = false
  recordingState.value = RecordingState.PROCESSING

  try {
    const tempAudioPath = await sttService.value.stopRecording()
    const transcript = await sttService.value.transcribe(tempAudioPath)
    const duration = Math.max(1, Math.round((Date.now() - recordingStartedAt.value) / 1000))
    const recordedBlob = sttService.value.getRecordedBlob()
    const uploadSource = recordedBlob || sttService.value.getTempAudioPath()

    if (!transcript.trim()) {
      recordingState.value = RecordingState.IDLE
      uni.showToast({
        title: '未识别到语音内容',
        icon: 'none'
      })
      return
    }

    if (typeof uploadSource === 'string' && uploadSource) {
      await chatStore.sendVoice(uploadSource, transcript, duration)
    } else {
      await chatStore.sendMessage(transcript)
    }

    recordingState.value = RecordingState.IDLE
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '语音发送失败',
      icon: 'none'
    })
    recordingState.value = RecordingState.IDLE
  }
}

function isLastAssistantMessage(index: number) {
  if (messages.value[index]?.role !== 'assistant') {
    return false
  }

  return !messages.value.slice(index + 1).some(message => message.role === 'assistant')
}

async function retryGeneration(messageId: string) {
  try {
    await chatStore.retryLastResponse(messageId)
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '重新生成失败',
      icon: 'none'
    })
  }
}

function openCharacterDetail() {
  showDetailSheet.value = false
  router.push(`/character/detail/${characterId.value}`)
}

function openGallery() {
  if (characterId.value !== ECHO_STORY_CHARACTER_ID && character.value?.sourceType !== 'builtin-story') {
    uni.showToast({ title: '图鉴仅绑定星故事', icon: 'none' })
    showChatMore.value = false
    return
  }
  showChatMore.value = false
  charPopoverVisible.value = false
  showGallery.value = true
}

function openChatSettings() {
  showChatMore.value = false
  showChatSettings.value = true
}

function onChatSettingsChange(next: ChatSettings) {
  chatSettings.value = next
  // If TTS was just disabled, also stop any ongoing playback.
  if (!next.enableTTS) {
    if (isHeaderTTSSpeaking.value) {
      ttsService.value?.stop()
      isHeaderTTSSpeaking.value = false
    }
  }
  // If voice input was disabled while in voice mode, fall back to keyboard.
  if (!next.enableVoiceInput && voiceMode.value) {
    voiceMode.value = false
  }
}

async function reloadChatSettings() {
  if (!characterId.value || isStarCharacter.value) {
    chatSettings.value = { ...DEFAULT_CHAT_SETTINGS }
    return
  }
  chatSettings.value = await loadChatSettings(characterId.value)
}

async function toggleAutoVoicePlayback() {
  autoVoicePlayback.value = !autoVoicePlayback.value
  await storage.saveUserSetting(AUTO_VOICE_KEY, autoVoicePlayback.value ? '1' : '0')
  showChatMore.value = false
  uni.showToast({
    title: autoVoicePlayback.value ? '已开启自动朗读' : '已关闭自动朗读',
    icon: 'none'
  })

  if (autoVoicePlayback.value) {
    await maybeAutoSpeak()
  }
}

function onImageClick(src: string, description: string) {
  imageViewerSrc.value = src
  imageViewerCaption.value = description
  imageViewerVisible.value = true
}

function confirmClearHistory() {
  uni.showModal({
    title: '清空聊天记录',
    content: '确认清空当前会话记录吗？此操作不可撤销。',
    success: async result => {
      if (!result.confirm) return
      await chatStore.clearHistory()
      await refreshMemory()
      showDetailSheet.value = false
    }
  })
}

// Affinity helpers
function getAffinityMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('echo_affinity') || '{}') } catch { return {} }
}
function getAffinity(charId: string): number {
  const map = getAffinityMap()
  if (map[charId] !== undefined) return map[charId]
  // Initialize: base 20 for friends, +1 per message in sessions
  const sessions = chatStore.sessions.filter(s => s.characterId === charId)
  let msgs = 0
  for (const s of sessions) msgs += s.messageCount
  const val = Math.min(100, 20 + msgs)
  setAffinity(charId, val)
  return val
}
function setAffinity(charId: string, val: number) {
  const map = getAffinityMap()
  map[charId] = Math.max(0, Math.min(100, val))
  localStorage.setItem('echo_affinity', JSON.stringify(map))
}

function getMessageAvatar(message: IMessage): string {
  if (message.role === 'user') return playerAvatar.value
  if (!isMultiplayerChat.value) return characterAvatar.value
  // Try to extract sender name from message content for multiplayer
  const match = message.content.match(/^(.+?)[:：]/)
  if (match) {
    const senderName = match[1].trim()
    const member = groupMembers.value.find(m => m.name === senderName)
    if (member?.avatar) return member.avatar
    if (member?.isNarrator) return ''
  }
  return characterAvatar.value
}

function getMessageSenderName(message: IMessage): string {
  if (message.role === 'user') return ''
  if (!isMultiplayerChat.value) return ''
  const match = message.content.match(/^(.+?)[:：]/)
  if (match) {
    const senderName = match[1].trim()
    const member = groupMembers.value.find(m => m.name === senderName)
    if (member) return member.name
  }
  return ''
}

function getMessageType(message: IMessage): 'normal' | 'narrator' | 'action' {
  if (message.role === 'user') return 'normal'
  if (!isMultiplayerChat.value) return 'normal'
  const match = message.content.match(/^(.+?)[:：]/)
  if (match) {
    const senderName = match[1].trim()
    const member = groupMembers.value.find(m => m.name === senderName)
    if (member?.isNarrator) return 'narrator'
  }
  // Check if content is primarily in parentheses (action/emotion)
  const content = message.content.replace(/^(.+?)[:：]/, '').trim()
  if (content.startsWith('（') && content.endsWith('）')) return 'action'
  return 'normal'
}

function showMemberDetail(member: GroupMember) {
  if (member.isNarrator) {
    uni.showToast({ title: `${member.name}：${member.description || '负责场景描写和剧情推进'}`, icon: 'none' })
  } else {
    uni.showToast({ title: `${member.name}：${member.description || member.personality || '群成员'}`, icon: 'none' })
  }
}

function openCharacterSheet(rect: DOMRect) {
  showChatMore.value = false
  showTools.value = false
  showGallery.value = false
  charPopoverAnchor.value = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  charPopoverVisible.value = true
}

async function sheetClearHistory() {
  charPopoverVisible.value = false
  confirmClearHistory()
}

async function sheetToggleFriend() {
  if (!characterId.value || charPopoverBusy.value) return
  charPopoverBusy.value = true
  try {
    await characterStore.toggleFriend(characterId.value)
    character.value = await characterStore.getCharacterById(characterId.value)
    uni.showToast({ title: character.value?.isFriend ? '已加入好友' : '已取消好友', icon: 'none' })
  } finally {
    charPopoverBusy.value = false
  }
}

async function sheetToggleLike() {
  if (!characterId.value || charPopoverBusy.value) return
  charPopoverBusy.value = true
  try {
    await characterStore.toggleLike(characterId.value)
    character.value = await characterStore.getCharacterById(characterId.value)
    uni.showToast({ title: character.value?.isLiked ? '已标记喜欢' : '已取消喜欢', icon: 'none' })
  } finally {
    charPopoverBusy.value = false
  }
}

async function sheetEnterGroup() {
  charPopoverVisible.value = false
  if (characterId.value) {
    router.push('/chat/' + characterId.value)
  }
}

async function sheetInviteToGroup() {
  charPopoverVisible.value = false
  await characterStore.loadCharacters()
  showInviteModal.value = true
}

function confirmInviteToGroup(group: ICharacter) {
  showInviteModal.value = false
  if (!character.value) return
  const memberIds = Array.from(new Set([...(group.memberIds || []), character.value.id]))
  const members = Array.from(new Set([...(group.members || []), character.value.name]))
  characterStore.updateCharacter({
    ...group,
    memberIds,
    members,
    updatedAt: Date.now(),
  }).then(() => {
    uni.showToast({ title: `已邀请加入「${group.name}」`, icon: 'success' })
  }).catch(() => {
    uni.showToast({ title: '邀请失败', icon: 'none' })
  })
}

onUnmounted(() => {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
  }
  sttService.value?.destroy()
  ttsService.value?.destroy()
})
</script>

<style lang="scss" scoped>
.chat-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 48px 16px 170px;
  background:
    radial-gradient(ellipse at 20% 5%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 50%, #0a1e2c 100%);
}

.hero-card,
.empty-state,
.recording-card,
.composer,
.detail-sheet {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.chat-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: 44px 1fr 44px 44px;
  align-items: center;
  padding: 2px 10px;
  background: rgba(5, 13, 20, 0.68);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.header-switch {
  justify-self: start;
}

.btn-back {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color var(--transition-base);

  &:hover {
    color: var(--text-primary);
  }
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 1px 2px;
  border: none;
  background: transparent;
  cursor: pointer;

  strong {
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.2;
  }

  .header-scene {
    color: var(--text-tertiary);
    font-size: 10px;
  }
}

.btn-more {
  justify-self: end;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color var(--transition-base);

  &:hover {
    color: var(--text-primary);
  }
}

.btn-tts {
  justify-self: end;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color var(--transition-base), opacity var(--transition-base);

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    color: #38bdf8;
  }
}

.detail-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(56, 189, 248, 0.20);
}

.hero-card,
.empty-state {
  padding: 18px;
  border-radius: 18px;
  border-color: rgba(52, 211, 153, 0.14);
}

.hero-eyebrow,
.detail-label {
  color: #7dd3fc;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.9;
}

.hero-card h1,
.empty-state strong {
  display: block;
  margin: 10px 0 8px;
  color: var(--text-primary);
  font-size: 24px;
  line-height: 1.2;
}

.hero-copy,
.empty-state p,
.detail-text {
  color: var(--text-secondary);
  line-height: 1.75;
}

.prompt-list,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.prompt-chip,
.memory-tag {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.08);
  color: #6ee7b7;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.18);
    border-color: rgba(52, 211, 153, 0.28);
    color: #fff;
  }
}

.memory-tag.subtle {
  color: var(--text-secondary);
  border-color: rgba(78, 68, 112, 0.28);
  background: rgba(78, 68, 112, 0.16);
}

.page-floor {
  display: none;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: calc(100vh - 218px);
  padding-top: 12px;
}

.message-row {
  display: block;
}

/* 群聊/多人顶部成员头像栏 */
.member-avatar-bar {
  position: fixed;
  top: 48px;
  left: 0;
  right: 0;
  z-index: 99;
  padding: 8px 12px;
  background: rgba(5, 13, 20, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.member-avatar-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 2px;
}

.member-avatar-list::-webkit-scrollbar {
  display: none;
}

.member-avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
  }

  &.narrator {
    .member-avatar-img,
    .member-avatar-fallback {
      border-color: rgba(52, 211, 153, 0.4);
      background: rgba(52, 211, 153, 0.1);
    }
  }
}

.member-avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.member-avatar-fallback {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.2));
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.member-avatar-name {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.composer-shell {
  position: fixed;
  right: 16px;
  bottom: 70px;
  left: 16px;
  display: grid;
  gap: 10px;
  z-index: 10;
}

.recording-card,
.composer {
  padding: 12px 14px;
  border-radius: 18px;
}

.recording-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recording-card strong {
  color: var(--text-primary);
}

.recording-card span {
  color: var(--text-secondary);
  font-size: 13px;
}

.tools-panel {
  display: flex;
  gap: 12px;
  padding-top: 10px;
  margin-top: 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.composer-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-area {
  flex: 1;
  min-width: 0;
}

.message-input {
  display: block;
  width: 100%;
  height: 27px;
  padding: 0 8px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;
  line-height: 27px;
  resize: none;
  overflow: hidden;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-tertiary);
  }

  &:focus {
    outline: none;
  }
}

.hold-to-talk {
  width: 100%;
  height: 27px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;

  &.recording {
    color: #34d399;
  }
}

.icon-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);

  svg {
    display: block;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: var(--text-primary);
  }
}

.bracket-btn {
  color: #8adac8;
}

.send-circle-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(235, 239, 244, 0.92), rgba(160, 170, 180, 0.92));
  color: rgb(9, 10, 12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;

  svg {
    display: block;
  }

  &.open {
    transform: rotate(45deg);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.send-circle-btn.send-mode {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(220, 230, 240, 0.96));
  color: #09121f;
}

.char-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 10040;
  background: transparent;
}

.char-popover {
  position: fixed;
  width: min(248px, calc(100vw - 32px));
  border: 1px solid rgba(56, 189, 248, 0.18);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
  overflow: hidden;
  isolation: isolate;
}

.char-popover::before {
  content: '';
  position: absolute;
  left: var(--char-popover-arrow-left, 50%);
  width: 18px;
  height: 18px;
  background: linear-gradient(180deg, rgba(8, 14, 24, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  border-left: 1px solid rgba(56, 189, 248, 0.18);
  border-top: 1px solid rgba(56, 189, 248, 0.18);
  transform: translateX(-50%) rotate(45deg);
  z-index: -1;
}

.char-popover--top::before {
  bottom: -10px;
}

.char-popover--bottom::before {
  top: -10px;
  transform: translateX(-50%) rotate(225deg);
}

.char-popover-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 10px;
}

.char-popover-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.char-popover-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.3;
  }

  span {
    color: var(--text-tertiary);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.char-popover-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.affinity-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.12);
  color: rgba(250, 204, 21, 0.7);
  flex-shrink: 0;
}

.char-popover-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 14px 16px;
}

.char-popover-btn {
  width: 100%;
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 18px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), transform var(--transition-base);

  &:hover {
    background: rgba(56, 189, 248, 0.08);
    border-color: rgba(56, 189, 248, 0.24);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
}

.detail-sheet {
  width: min(520px, 100%);
  padding: 18px;
  border-radius: 22px;
}

.detail-head,
.detail-profile,
.detail-actions {
  display: flex;
  align-items: center;
}

.detail-head {
  justify-content: space-between;
  gap: 12px;
}

.detail-profile {
  gap: 12px;
}

.detail-profile strong {
  display: block;
  color: var(--text-primary);
  font-size: 20px;
}

.detail-profile span {
  color: var(--text-secondary);
  font-size: 13px;
}

.detail-section {
  margin-top: 18px;
}

.detail-actions {
  gap: 10px;
  margin-top: 20px;
}

.ghost-btn,
.icon-close {
  min-height: 42px;
  border: none;
  border-radius: 12px;
  font: inherit;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.ghost-btn {
  flex: 1;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-1px);
  }
}

@media (min-width: 960px) {
  .chat-page {
    width: min(760px, 100%);
    margin: 0 auto;
  }

  .composer-shell {
    width: min(760px, calc(100% - 32px));
    margin: 0 auto;
  }
}

@media (max-width: 640px) {
  .chat-page {
    padding: 44px 12px 170px;
  }

  .chat-header {
    padding: 2px 8px;
  }

  .composer-shell {
    right: 12px;
    bottom: 70px;
    left: 12px;
  }
}

.invite-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.invite-modal {
  width: min(480px, 100%);
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
  overflow: hidden;
}

.invite-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 10px;

  strong {
    color: var(--text-primary);
    font-size: 16px;
  }
}

.invite-close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.invite-hint {
  padding: 0 18px 12px;
  color: var(--text-secondary);
  font-size: 13px;

  b {
    color: var(--text-primary);
  }
}

.invite-list {
  overflow-y: auto;
  padding: 0 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invite-group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(56, 189, 248, 0.10);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover {
    background: rgba(56, 189, 248, 0.08);
    border-color: rgba(56, 189, 248, 0.22);
  }
}

.invite-group-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.10);
}

.invite-group-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.invite-group-name {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invite-group-meta {
  color: var(--text-tertiary);
  font-size: 12px;
}

.invite-arrow {
  color: var(--text-tertiary);
  font-size: 20px;
}

.invite-empty {
  padding: 24px 18px 28px;
  text-align: center;

  p {
    color: var(--text-secondary);
    font-size: 15px;
    margin-bottom: 6px;
  }

  small {
    color: var(--text-tertiary);
    font-size: 12px;
  }
}

.chat-more-overlay {
  position: fixed;
  inset: 0;
  z-index: 10030;
  background: transparent;
}

.chat-more-menu {
  position: fixed;
  top: 48px;
  right: 12px;
  min-width: 140px;
  padding: 6px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98), rgba(6, 11, 20, 0.98));
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.chat-more-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(56, 189, 248, 0.08);
  }
}
</style>
