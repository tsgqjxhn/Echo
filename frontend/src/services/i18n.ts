/**
 * Echo 多语言国际化翻译服务
 *
 * 以中文原文为 key，映射到各语言翻译。
 * 翻译数据来源于 docs/翻译.md
 */

import { uni } from '@/utils/uni-polyfill'

/** 支持的语言列表 */
export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', nativeName: '简体中文', englishName: 'Simplified Chinese' },
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'fr', nativeName: 'Français', englishName: 'French' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code']

/** 默认语言 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN'

/** 回退语言（当系统语言不匹配时的通用回退） */
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en'

/**
 * uni-app getSystemInfoSync().language 到 i18n 语言代码的映射
 */
const SYSTEM_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  zh: 'zh-CN',
  'zh-CN': 'zh-CN',
  zh_CN: 'zh-CN',
  'zh-TW': 'zh-CN',
  'zh-HK': 'zh-CN',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  hi: 'hi',
  'hi-IN': 'hi',
  es: 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'es-AR': 'es',
  fr: 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  ar: 'ar',
  'ar-SA': 'ar',
  'ar-EG': 'ar',
  pt: 'pt',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
}

/**
 * 翻译数据映射
 * 结构：{ "中文原文": { "en": "English", "hi": "हिन्दी", ... } }
 */
const translations: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  // ==================== 全局 / 路由 ====================
  'AI角色聊天': { en: 'AI Character Chat', hi: 'AI पात्र चैट', es: 'Chat con Personajes IA', fr: 'Chat avec Personnages IA', ar: 'دردشة شخصيات الذكاء الاصطناعي', pt: 'Chat com Personagens IA' },
  'Echo/回声': { en: 'Echo', hi: 'Echo', es: 'Echo', fr: 'Echo', ar: 'Echo', pt: 'Echo' },
  '主页': { en: 'Home', hi: 'होम', es: 'Inicio', fr: 'Accueil', ar: 'الرئيسية', pt: 'Início' },
  '对话': { en: 'Dialogue', hi: 'संवाद', es: 'Diálogo', fr: 'Dialogue', ar: 'حوار', pt: 'Diálogo' },
  '聊天': { en: 'Chat', hi: 'चैट', es: 'Chat', fr: 'Chat', ar: 'محادثة', pt: 'Chat' },
  '个人中心': { en: 'Profile', hi: 'प्रोफ़ाइल', es: 'Perfil', fr: 'Profil', ar: 'الملف الشخصي', pt: 'Perfil' },
  '会话历史': { en: 'History', hi: 'इतिहास', es: 'Historial', fr: 'Historique', ar: 'السجل', pt: 'Histórico' },
  '编辑个人资料': { en: 'Edit Profile', hi: 'प्रोफ़ाइल संपादित करें', es: 'Editar Perfil', fr: 'Modifier le Profil', ar: 'تعديل الملف الشخصي', pt: 'Editar Perfil' },
  '系统提示词管理': { en: 'System Prompts', hi: 'सिस्टम प्रॉम्प्ट', es: 'Gestión de Prompts', fr: 'Gestion des Prompts', ar: 'إدارة المطالبات النظامية', pt: 'Gerenciar Prompts' },
  '大模型配置': { en: 'LLM Config', hi: 'LLM कॉन्फ़िग', es: 'Configuración LLM', fr: 'Configuration LLM', ar: 'إعدادات النموذج اللغوي', pt: 'Configuração LLM' },
  '数据管理': { en: 'Data Management', hi: 'डेटा प्रबंधन', es: 'Gestión de Datos', fr: 'Gestion des Données', ar: 'إدارة البيانات', pt: 'Gerenciar Dados' },
  '聊天默认设置': { en: 'Chat Defaults', hi: 'चैट डिफ़ॉल्ट', es: 'Ajustes de Chat', fr: 'Paramètres de Chat', ar: 'إعدادات المحادثة الافتراضية', pt: 'Padrões de Chat' },
  '存储管理': { en: 'Storage', hi: 'स्टोरेज', es: 'Almacenamiento', fr: 'Stockage', ar: 'التخزين', pt: 'Armazenamento' },
  '网络与连接': { en: 'Network', hi: 'नेटवर्क', es: 'Red', fr: 'Réseau', ar: 'الشبكة والاتصال', pt: 'Rede' },
  '关于与帮助': { en: 'About & Help', hi: 'परिचय और सहायता', es: 'Acerca de y Ayuda', fr: 'À propos & Aide', ar: 'حول والتطبيق', pt: 'Sobre & Ajuda' },
  '朋友圈': { en: 'Moments', hi: 'मोमेंट्स', es: 'Momentos', fr: 'Moments', ar: 'لحظات', pt: 'Moments' },
  '游戏中心': { en: 'Game Center', hi: 'गेम सेंटर', es: 'Centro de Juegos', fr: 'Centre de Jeux', ar: 'مركز الألعاب', pt: 'Central de Jogos' },
  '游戏设置': { en: 'Game Settings', hi: 'गेम सेटिंग्स', es: 'Ajustes de Juego', fr: 'Paramètres de Jeu', ar: 'إعدادات اللعبة', pt: 'Configurações de Jogo' },
  '生成游戏': { en: 'Generate Game', hi: 'गेम जनरेट करें', es: 'Generar Juego', fr: 'Générer un Jeu', ar: 'إنشاء لعبة', pt: 'Gerar Jogo' },
  '创建角色': { en: 'Create Character', hi: 'पात्र बनाएँ', es: 'Crear Personaje', fr: 'Créer un Personnage', ar: 'إنشاء شخصية', pt: 'Criar Personagem' },
  '编辑角色': { en: 'Edit Character', hi: 'पात्र संपादित करें', es: 'Editar Personaje', fr: 'Modifier le Personnage', ar: 'تعديل شخصية', pt: 'Editar Personagem' },
  '预览对话': { en: 'Preview', hi: 'पूर्वावलोकन', es: 'Vista Previa', fr: 'Aperçu', ar: 'معاينة المحادثة', pt: 'Pré-visualizar' },
  '世界书': { en: 'World Book', hi: 'वर्ल्ड बुक', es: 'Libro del Mundo', fr: 'Livre du Monde', ar: 'كتاب العالم', pt: 'Livro do Mundo' },
  '编辑世界书': { en: 'Edit World Book', hi: 'वर्ल्ड बुक संपादित करें', es: 'Editar Libro del Mundo', fr: 'Modifier le Livre du Monde', ar: 'تعديل كتاب العالم', pt: 'Editar Livro do Mundo' },
  '创建世界书': { en: 'Create World Book', hi: 'वर्ल्ड बुक बनाएँ', es: 'Crear Libro del Mundo', fr: 'Créer un Livre du Monde', ar: 'إنشاء كتاب العالم', pt: 'Criar Livro do Mundo' },
  '再点按一次退出': { en: 'Press again to exit', hi: 'दोबारा दबाएँ बाहर निकलने के लिए', es: 'Presiona otra vez para salir', fr: 'Appuyez à nouveau pour quitter', ar: 'اضغط مرة أخرى للخروج', pt: 'Pressione novamente para sair' },
  '没有可切换的本地角色': { en: 'No local characters to switch', hi: 'कोई स्थानीय पात्र नहीं', es: 'No hay personajes locales', fr: 'Aucun personnage local', ar: 'لا توجد شخصيات محلية للتبديل', pt: 'Nenhum personagem local disponível' },
  '切换失败': { en: 'Switch failed', hi: 'स्विच विफल', es: 'Cambio fallido', fr: 'Échec du changement', ar: 'فشل التبديل', pt: 'Falha ao trocar' },

  // ==================== 设置 - 通用 ====================
  '通用设置': { en: 'General Settings', hi: 'सामान्य सेटिंग्स', es: 'Ajustes Generales', fr: 'Paramètres Généraux', ar: 'الإعدادات العامة', pt: 'Configurações Gerais' },
  '用户头像': { en: 'Avatar', hi: 'अवतार', es: 'Avatar', fr: 'Avatar', ar: 'الصورة الرمزية', pt: 'Avatar' },
  '数据导入导出': { en: 'Import & Export', hi: 'आयात और निर्यात', es: 'Importar y Exportar', fr: 'Importer & Exporter', ar: 'استيراد وتصدير', pt: 'Importar & Exportar' },
  '确认清空本地数据': { en: 'Clear all local data?', hi: 'स्थानीय डेटा साफ़ करें?', es: '¿Borrar datos locales?', fr: 'Effacer toutes les données locales ?', ar: 'هل تريد مسح البيانات المحلية؟', pt: 'Limpar dados locais?' },

  // ==================== 设置 - 编辑资料 ====================
  '编辑资料': { en: 'Edit Profile', hi: 'प्रोफ़ाइल संपादित करें', es: 'Editar Perfil', fr: 'Modifier le Profil', ar: 'تعديل الملف الشخصي', pt: 'Editar Perfil' },
  '更新你的头像昵称与提示词': { en: 'Update avatar, nickname & prompt', hi: 'अवतार, नाम और प्रॉम्प्ट अपडेट करें', es: 'Actualiza avatar, nombre y prompt', fr: "Mettre à jour l'avatar, le pseudo et le prompt", ar: 'تحديث الصورة والاسم والمطالبة', pt: 'Atualize avatar, nome e prompt' },
  '用户昵称': { en: 'Nickname', hi: 'उपनाम', es: 'Apodo', fr: 'Pseudo', ar: 'الاسم المستعار', pt: 'Apelido' },
  '全局提示词': { en: 'Global Prompt', hi: 'ग्लोबल प्रॉम्प्ट', es: 'Prompt Global', fr: 'Prompt Global', ar: 'المطالبة العامة', pt: 'Prompt Global' },
  '点击更换头像': { en: 'Tap to change avatar', hi: 'अवतार बदलने के लिए टैप करें', es: 'Toca para cambiar avatar', fr: "Appuyez pour changer l'avatar", ar: 'اضغط لتغيير الصورة', pt: 'Toque para mudar o avatar' },
  '保存资料': { en: 'Save Profile', hi: 'प्रोफ़ाइल सहेजें', es: 'Guardar Perfil', fr: 'Enregistrer le Profil', ar: 'حفظ الملف الشخصي', pt: 'Salvar Perfil' },

  // ==================== 设置 - 聊天默认设置 ====================
  '全局默认参数': { en: 'Global Defaults', hi: 'ग्लोबल डिफ़ॉल्ट', es: 'Valores Predeterminados', fr: 'Valeurs par Défaut', ar: 'الإعدادات الافتراضية العامة', pt: 'Padrões Globais' },
  '默认聊天模式': { en: 'Default Chat Mode', hi: 'डिफ़ॉल्ट चैट मोड', es: 'Modo de Chat Predeterminado', fr: 'Mode de Chat par Défaut', ar: 'وضع المحادثة الافتراضي', pt: 'Modo de Chat Padrão' },
  '自由对话': { en: 'Free Chat', hi: 'फ्री चैट', es: 'Chat Libre', fr: 'Chat Libre', ar: 'محادثة حرة', pt: 'Chat Livre' },
  '挑战对话': { en: 'Challenge Mode', hi: 'चुनौती मोड', es: 'Modo Desafío', fr: 'Mode Défi', ar: 'وضع التحدي', pt: 'Modo Desafio' },
  '回复长度偏好': { en: 'Response Length', hi: 'उत्तर की लंबाई', es: 'Longitud de Respuesta', fr: 'Longueur de Réponse', ar: 'طول الرد', pt: 'Tamanho da Resposta' },
  '简短': { en: 'Short', hi: 'छोटा', es: 'Corto', fr: 'Court', ar: 'قصير', pt: 'Curto' },
  '适中': { en: 'Medium', hi: 'मध्यम', es: 'Medio', fr: 'Moyen', ar: 'متوسط', pt: 'Médio' },
  '详细': { en: 'Long', hi: 'लंबा', es: 'Largo', fr: 'Long', ar: 'طويل', pt: 'Longo' },
  '严谨': { en: 'Precise', hi: 'सटीक', es: 'Preciso', fr: 'Précis', ar: 'دقيق', pt: 'Preciso' },
  '创造': { en: 'Creative', hi: 'रचनात्मक', es: 'Creativo', fr: 'Créatif', ar: 'إبداعي', pt: 'Criativo' },
  '显示与交互': { en: 'Display & Interaction', hi: 'प्रदर्शन और इंटरैक्शन', es: 'Pantalla e Interacción', fr: 'Affichage & Interaction', ar: 'العرض والتفاعل', pt: 'Exibição & Interação' },
  '流式输出': { en: 'Streaming', hi: 'स्ट्रीमिंग', es: 'Streaming', fr: 'Streaming', ar: 'البث المباشر', pt: 'Streaming' },
  '打字机效果速度': { en: 'Typewriter Speed', hi: 'टाइपराइटर गति', es: 'Velocidad de Escritura', fr: 'Vitesse de Frappe', ar: 'سرعة الكتابة', pt: 'Velocidade de Digitação' },
  '即时': { en: 'Instant', hi: 'तुरंत', es: 'Instantáneo', fr: 'Instantané', ar: 'فوري', pt: 'Instantâneo' },
  '快': { en: 'Fast', hi: 'तेज़', es: 'Rápido', fr: 'Rapide', ar: 'سريع', pt: 'Rápido' },
  '中': { en: 'Normal', hi: 'सामान्य', es: 'Normal', fr: 'Normal', ar: 'متوسط', pt: 'Normal' },
  '慢': { en: 'Slow', hi: 'धीमा', es: 'Lento', fr: 'Lent', ar: 'بطيء', pt: 'Lento' },
  '上下文记忆': { en: 'Context Memory', hi: 'कॉन्टेक्स्ट मेमोरी', es: 'Memoria de Contexto', fr: 'Mémoire Contextuelle', ar: 'ذاكرة السياق', pt: 'Memória de Contexto' },
  '长期记忆': { en: 'Long-term Memory', hi: 'दीर्घकालिक मेमोरी', es: 'Memoria a Largo Plazo', fr: 'Mémoire à Long Terme', ar: 'ذاكرة طويلة المدى', pt: 'Memória de Longo Prazo' },
  '快捷操作': { en: 'Quick Actions', hi: 'त्वरित कार्रवाइयाँ', es: 'Acciones Rápidas', fr: 'Actions Rapides', ar: 'إجراءات سريعة', pt: 'Ações Rápidas' },
  '快捷指令': { en: 'Quick Commands', hi: 'त्वरित कमांड', es: 'Comandos Rápidos', fr: 'Commandes Rapides', ar: 'أوامر سريعة', pt: 'Comandos Rápidos' },
  '高级参数': { en: 'Advanced Parameters', hi: 'उन्नत पैरामीटर', es: 'Parámetros Avanzados', fr: 'Paramètres Avancés', ar: 'معلمات متقدمة', pt: 'Parâmetros Avançados' },
  'JSON模式': { en: 'JSON Mode', hi: 'JSON मोड', es: 'Modo JSON', fr: 'Mode JSON', ar: 'وضع JSON', pt: 'Modo JSON' },
  'System Prompt前缀': { en: 'System Prompt Prefix', hi: 'सिस्टम प्रॉम्प्ट प्रीफ़िक्स', es: 'Prefijo del System Prompt', fr: 'Préfixe du System Prompt', ar: 'بادئة المطالبة النظامية', pt: 'Prefixo do System Prompt' },
  '自动发送': { en: 'Auto Send', hi: 'ऑटो सेंड', es: 'Envío Automático', fr: 'Envoi Automatique', ar: 'إرسال تلقائي', pt: 'Envio Automático' },
  '输入方式': { en: 'Input Method', hi: 'इनपुट विधि', es: 'Método de Entrada', fr: 'Méthode de Saisie', ar: 'طريقة الإدخال', pt: 'Método de Entrada' },
  '纯文字': { en: 'Text Only', hi: 'केवल टेक्स्ट', es: 'Solo Texto', fr: 'Texte Seulement', ar: 'نص فقط', pt: 'Apenas Texto' },
  '语音输入优先': { en: 'Voice First', hi: 'वॉइस प्राथमिकता', es: 'Voz Primero', fr: 'Voix Prioritaire', ar: 'الصوت أولاً', pt: 'Voz Primeiro' },
  '混合': { en: 'Mixed', hi: 'मिश्रित', es: 'Mixto', fr: 'Mixte', ar: 'مختلط', pt: 'Misto' },
  '消息气泡样式': { en: 'Bubble Style', hi: 'बबल शैली', es: 'Estilo de Burbuja', fr: 'Style de Bulle', ar: 'نمط الفقاعة', pt: 'Estilo de Balão' },
  '经典气泡': { en: 'Classic Bubbles', hi: 'क्लासिक बबल', es: 'Burbujas Clásicas', fr: 'Bulles Classiques', ar: 'فقاعات كلاسيكية', pt: 'Balões Clássicos' },
  '简洁模式': { en: 'Compact Mode', hi: 'कॉम्पैक्ट मोड', es: 'Modo Compacto', fr: 'Mode Compact', ar: 'وضع مضغوط', pt: 'Modo Compacto' },
  '角色扮演模式': { en: 'Roleplay Mode', hi: 'रोलप्ले मोड', es: 'Modo Rol', fr: 'Mode Jeu de Rôle', ar: 'وضع تمثيل الأدوار', pt: 'Modo RP' },
  '并发请求数': { en: 'Concurrent Requests', hi: 'समवर्ती अनुरोध', es: 'Solicitudes Simultáneas', fr: 'Requêtes Simultanées', ar: 'الطلبات المتزامنة', pt: 'Requisições Simultâneas' },
  '上下文窗口长度限制': { en: 'Context Window Limit', hi: 'कॉन्टेक्स्ट विंडो सीमा', es: 'Límite de Ventana de Contexto', fr: 'Limite de Fenêtre Contextuelle', ar: 'حد نافذة السياق', pt: 'Limite da Janela de Contexto' },
  '回溯功能': { en: 'Rewind', hi: 'रिवाइंड', es: 'Retroceder', fr: 'Revenir en Arrière', ar: 'تراجع', pt: 'Retroceder' },
  '上下文编辑': { en: 'Edit Context', hi: 'कॉन्टेक्स्ट संपादित करें', es: 'Editar Contexto', fr: 'Modifier le Contexte', ar: 'تحرير السياق', pt: 'Editar Contexto' },
  '快捷回复建议': { en: 'Quick Reply Suggestions', hi: 'त्वरित उत्तर सुझाव', es: 'Sugerencias de Respuesta', fr: 'Suggestions de Réponse', ar: 'اقتراحات الرد السريع', pt: 'Sugestões de Resposta' },
  '快捷角色切换': { en: 'Quick Character Switch', hi: 'त्वरित पात्र बदलें', es: 'Cambio Rápido de Personaje', fr: 'Changement Rapide de Personnage', ar: 'تبديل سريع للشخصية', pt: 'Troca Rápida de Personagem' },

  // ==================== 设置 - 大模型配置 ====================
  '文本': { en: 'Text', hi: 'टेक्स्ट', es: 'Texto', fr: 'Texte', ar: 'نص', pt: 'Texto' },
  '语音': { en: 'Voice', hi: 'वॉइस', es: 'Voz', fr: 'Voix', ar: 'صوت', pt: 'Voz' },
  '图片': { en: 'Image', hi: 'इमेज', es: 'Imagen', fr: 'Image', ar: 'صورة', pt: 'Imagem' },
  '动图': { en: 'Video', hi: 'वीडियो', es: 'Video', fr: 'Vidéo', ar: 'فيديو', pt: 'Vídeo' },
  '图片识别': { en: 'Image Recognition', hi: 'इमेज रिकग्निशन', es: 'Reconocimiento de Imagen', fr: "Reconnaissance d'Image", ar: 'التعرف على الصور', pt: 'Reconhecimento de Imagem' },
  '图片生成': { en: 'Image Generation', hi: 'इमेज जनरेशन', es: 'Generación de Imagen', fr: "Génération d'Image", ar: 'توليد الصور', pt: 'Geração de Imagem' },
  '配置名称': { en: 'Config Name', hi: 'कॉन्फ़िग नाम', es: 'Nombre de Config', fr: 'Nom de la Config', ar: 'اسم الإعداد', pt: 'Nome da Config' },
  '显示': { en: 'Show', hi: 'दिखाएँ', es: 'Mostrar', fr: 'Afficher', ar: 'إظهار', pt: 'Mostrar' },
  '隐藏': { en: 'Hide', hi: 'छिपाएँ', es: 'Ocultar', fr: 'Masquer', ar: 'إخفاء', pt: 'Ocultar' },
  '删除配置': { en: 'Delete Config', hi: 'कॉन्फ़िग हटाएँ', es: 'Eliminar Config', fr: 'Supprimer la Config', ar: 'حذف الإعداد', pt: 'Excluir Config' },
  '保存配置': { en: 'Save Config', hi: 'कॉन्फ़िग सहेजें', es: 'Guardar Config', fr: 'Enregistrer la Config', ar: 'حفظ الإعداد', pt: 'Salvar Config' },
  '模型': { en: 'Model', hi: 'मॉडल', es: 'Modelo', fr: 'Modèle', ar: 'نموذج', pt: 'Modelo' },
  '连接': { en: 'Connection', hi: 'कनेक्शन', es: 'Conexión', fr: 'Connexion', ar: 'اتصال', pt: 'Conexão' },
  '服务商状态检测': { en: 'Provider Status Check', hi: 'प्रोवाइडर स्थिति जाँच', es: 'Verificar Estado del Proveedor', fr: 'Vérification du Fournisseur', ar: 'فحص حالة المزود', pt: 'Verificar Status do Provedor' },
  '请选择模型': { en: 'Select a model', hi: 'मॉडल चुनें', es: 'Seleccionar modelo', fr: 'Sélectionner un modèle', ar: 'اختر نموذجاً', pt: 'Selecione um modelo' },
  '点击添加模型': { en: 'Tap to add model', hi: 'मॉडल जोड़ने के लिए टैप करें', es: 'Toca para añadir modelo', fr: 'Appuyez pour ajouter un modèle', ar: 'اضغط لإضافة نموذج', pt: 'Toque para adicionar modelo' },
  '设为当前': { en: 'Set as Current', hi: 'वर्तमान में सेट करें', es: 'Establecer como Actual', fr: 'Définir comme Actuel', ar: 'تعيين كحالي', pt: 'Definir como Atual' },
  '删除': { en: 'Delete', hi: 'हटाएँ', es: 'Eliminar', fr: 'Supprimer', ar: 'حذف', pt: 'Excluir' },
  '设为此类型默认配置': { en: 'Set as Default for This Type', hi: 'इस प्रकार के लिए डिफ़ॉल्ट सेट करें', es: 'Establecer como Predeterminado', fr: 'Définir comme Défaut pour ce Type', ar: 'تعيين كافتراضي لهذا النوع', pt: 'Definir como Padrão para Este Tipo' },
  '连通性检测结果': { en: 'Connectivity Test Result', hi: 'कनेक्टिविटी परीक्षण परिणाम', es: 'Resultado de Prueba de Conexión', fr: 'Résultat du Test de Connectivité', ar: 'نتيجة اختبار الاتصال', pt: 'Resultado do Teste de Conectividade' },
  '清除': { en: 'Clear', hi: 'साफ़ करें', es: 'Limpiar', fr: 'Effacer', ar: 'مسح', pt: 'Limpar' },
  'TTS 朗读设置': { en: 'TTS Read Aloud Settings', hi: 'TTS रीड अलाउड सेटिंग्स', es: 'Ajustes de Lectura TTS', fr: 'Paramètres de Lecture TTS', ar: 'إعدادات القراءة الصوتية TTS', pt: 'Configurações de Leitura TTS' },
  '语速': { en: 'Speed', hi: 'गति', es: 'Velocidad', fr: 'Vitesse', ar: 'السرعة', pt: 'Velocidade' },
  '音调': { en: 'Pitch', hi: 'पिच', es: 'Tono', fr: 'Tonalité', ar: 'النغمة', pt: 'Tom' },
  '音量': { en: 'Volume', hi: 'वॉल्यूम', es: 'Volumen', fr: 'Volume', ar: 'مستوى الصوت', pt: 'Volume' },
  '试听朗读效果': { en: 'Preview Reading', hi: 'पूर्वावलोकन सुनें', es: 'Probar Lectura', fr: 'Écouter un Aperçu', ar: 'معاينة القراءة', pt: 'Testar Leitura' },
  'STT 语音输入设置': { en: 'STT Voice Input Settings', hi: 'STT वॉइस इनपुट सेटिंग्स', es: 'Ajustes de Entrada de Voz STT', fr: 'Paramètres de Saisie Vocale STT', ar: 'إعدادات الإدخال الصوتي STT', pt: 'Configurações de Entrada de Voz STT' },
  '识别语言': { en: 'Recognition Language', hi: 'पहचान भाषा', es: 'Idioma de Reconocimiento', fr: 'Langue de Reconnaissance', ar: 'لغة التعرف', pt: 'Idioma de Reconhecimento' },
  '录音质量': { en: 'Recording Quality', hi: 'रिकॉर्डिंग गुणवत्ता', es: 'Calidad de Grabación', fr: "Qualité d'Enregistrement", ar: 'جودة التسجيل', pt: 'Qualidade de Gravação' },
  '录音结束后自动发送': { en: 'Auto-send after recording', hi: 'रिकॉर्डिंग के बाद ऑटो-सेंड', es: 'Enviar Automáticamente al Terminar', fr: 'Envoi Auto après Enregistrement', ar: 'إرسال تلقائي بعد التسجيل', pt: 'Enviar Automaticamente após Gravar' },
  '录音时显示波形动画': { en: 'Show waveform while recording', hi: 'रिकॉर्डिंग के दौरान वेवफ़ॉर्म दिखाएँ', es: 'Mostrar Onda al Grabar', fr: "Afficher l'Onde pendant l'Enregistrement", ar: 'إظهار الموجة أثناء التسجيل', pt: 'Mostrar Forma de Onda ao Gravar' },
  '重置': { en: 'Reset', hi: 'रीसेट', es: 'Restablecer', fr: 'Réinitialiser', ar: 'إعادة تعيين', pt: 'Redefinir' },
  '标准质量': { en: 'Standard', hi: 'स्टैंडर्ड', es: 'Estándar', fr: 'Standard', ar: 'قياسي', pt: 'Padrão' },
  '高质量': { en: 'High', hi: 'उच्च', es: 'Alta', fr: 'Haute', ar: 'عالي', pt: 'Alta' },
  '超高质量': { en: 'Ultra High', hi: 'अल्ट्रा हाई', es: 'Ultra Alta', fr: 'Ultra Haute', ar: 'فائق الجودة', pt: 'Ultra Alta' },
  '简体中文': { en: 'Simplified Chinese', hi: 'सरलीकृत चीनी', es: 'Chino Simplificado', fr: 'Chinois Simplifié', ar: 'الصينية المبسطة', pt: 'Chinês Simplificado' },
  '繁体中文': { en: 'Traditional Chinese', hi: 'पारंपरिक चीनी', es: 'Chino Tradicional', fr: 'Chinois Traditionnel', ar: 'الصينية التقليدية', pt: 'Chinês Tradicional' },

  // ==================== 设置 - 关于 ====================
  '新手指引': { en: 'Getting Started', hi: 'शुरुआती गाइड', es: 'Guía de Inicio', fr: 'Guide de Démarrage', ar: 'دليل البدء', pt: 'Guia de Início' },
  '常见问题': { en: 'FAQ', hi: 'सामान्य प्रश्न', es: 'Preguntas Frecuentes', fr: 'FAQ', ar: 'الأسئلة الشائعة', pt: 'Perguntas Frequentes' },
  '快捷键': { en: 'Shortcuts', hi: 'शॉर्टकट', es: 'Atajos', fr: 'Raccourcis', ar: 'اختصارات', pt: 'Atalhos' },
  '更新日志': { en: 'Changelog', hi: 'अपडेट लॉग', es: 'Registro de Cambios', fr: 'Journal des Modifications', ar: 'سجل التحديثات', pt: 'Registro de Alterações' },
  '开源协议': { en: 'Open Source License', hi: 'ओपन सोर्स लाइसेंस', es: 'Licencia de Código Abierto', fr: 'Licence Open Source', ar: 'ترخيص مفتوح المصدر', pt: 'Licença de Código Aberto' },
  '反馈渠道': { en: 'Feedback', hi: 'फ़ीडबैक', es: 'Comentarios', fr: 'Retours', ar: 'قنوات التواصل', pt: 'Feedback' },
  '开始对话': { en: 'Start Chat', hi: 'चैट शुरू करें', es: 'Iniciar Chat', fr: 'Démarrer le Chat', ar: 'بدء المحادثة', pt: 'Iniciar Chat' },
  '探索高级功能': { en: 'Explore Advanced Features', hi: 'उन्नत सुविधाएँ खोजें', es: 'Explorar Funciones Avanzadas', fr: 'Explorer les Fonctions Avancées', ar: 'استكشاف الميزات المتقدمة', pt: 'Explorar Recursos Avançados' },
  '发送消息': { en: 'Send Message', hi: 'संदेश भेजें', es: 'Enviar Mensaje', fr: 'Envoyer un Message', ar: 'إرسال رسالة', pt: 'Enviar Mensagem' },
  '换行': { en: 'New Line', hi: 'नई लाइन', es: 'Nueva Línea', fr: 'Nouvelle Ligne', ar: 'سطر جديد', pt: 'Nova Linha' },
  '重新生成最后一条回复': { en: 'Regenerate Last Reply', hi: 'अंतिम उत्तर पुनर्जीवित करें', es: 'Regenerar Última Respuesta', fr: 'Régénérer la Dernière Réponse', ar: 'إعادة إنشاء آخر رد', pt: 'Regenerar Última Resposta' },
  '关闭面板/弹窗': { en: 'Close Panel / Popup', hi: 'पैनल/पॉपअप बंद करें', es: 'Cerrar Panel / Ventana', fr: 'Fermer le Panneau / Popup', ar: 'إغلاق اللوحة / النافذة', pt: 'Fechar Painel / Pop-up' },
  '当前已是最新版本': { en: "You're on the latest version", hi: 'आप नवीनतम संस्करण पर हैं', es: 'Estás en la última versión', fr: 'Vous êtes à jour', ar: 'أنت تستخدم أحدث إصدار', pt: 'Você está na versão mais recente' },
  '检查失败请稍后重试': { en: 'Check failed. Try again later.', hi: 'जाँच विफल, बाद में पुनः प्रयास करें', es: 'Falló la verificación. Intenta más tarde.', fr: 'Échec de la vérification. Réessayez plus tard.', ar: 'فشل التحقق. حاول لاحقاً.', pt: 'Falha na verificação. Tente novamente mais tarde.' },
  '本项目采用 MIT 许可证开源': { en: 'Licensed under MIT', hi: 'MIT लाइसेंस के तहत ओपन सोर्स', es: 'Licenciado bajo MIT', fr: 'Sous Licence MIT', ar: 'مرخص بموجب MIT', pt: 'Licenciado sob a MIT' },
  '发送邮件反馈': { en: 'Send Email Feedback', hi: 'ईमेल फ़ीडबैक भेजें', es: 'Enviar Comentarios por Correo', fr: 'Envoyer un Retour par Email', ar: 'إرسال ملاحظات بالبريد الإلكتروني', pt: 'Enviar Feedback por Email' },
  'Enter发送消息': { en: 'Enter to send', hi: 'Enter से भेजें', es: 'Enter para Enviar', fr: 'Entrée pour Envoyer', ar: 'Enter للإرسال', pt: 'Enter para Enviar' },
  'Shift+Enter换行': { en: 'Shift+Enter for new line', hi: 'Shift+Enter से नई लाइन', es: 'Shift+Enter para Nueva Línea', fr: 'Maj+Entrée pour Nouvelle Ligne', ar: 'Shift+Enter لسطر جديد', pt: 'Shift+Enter para Nova Linha' },
  'Ctrl+R重新生成': { en: 'Ctrl+R to regenerate', hi: 'Ctrl+R से पुनर्जीवित करें', es: 'Ctrl+R para Regenerar', fr: 'Ctrl+R pour Régénérer', ar: 'Ctrl+R لإعادة الإنشاء', pt: 'Ctrl+R para Regenerar' },
  'Esc关闭面板': { en: 'Esc to close panel', hi: 'Esc से पैनल बंद करें', es: 'Esc para Cerrar Panel', fr: 'Échap pour Fermer le Panneau', ar: 'Esc لإغلاق اللوحة', pt: 'Esc para Fechar Painel' },
  '配置 API': { en: 'Configure API', hi: 'API कॉन्फ़िगर करें', es: 'Configurar API', fr: "Configurer l'API", ar: 'إعداد API', pt: 'Configurar API' },

  // ==================== 设置 - 存储管理 ====================
  '当前软件占用总空间': { en: 'Total Space Used', hi: 'कुल उपयोग स्थान', es: 'Espacio Total Usado', fr: 'Espace Total Utilisé', ar: 'إجمالي المساحة المستخدمة', pt: 'Espaço Total Usado' },
  '基于浏览器存储估算': { en: 'Based on browser storage estimate', hi: 'ब्राउज़र स्टोरेज अनुमान पर आधारित', es: 'Basado en estimación del navegador', fr: "Basé sur l'estimation du navigateur", ar: 'تقدير بناءً على تخزين المتصفح', pt: 'Com base na estimativa do navegador' },
  '存储分类': { en: 'Storage Categories', hi: 'स्टोरेज श्रेणियाँ', es: 'Categorías de Almacenamiento', fr: 'Catégories de Stockage', ar: 'فئات التخزين', pt: 'Categorias de Armazenamento' },
  '角色数据': { en: 'Character Data', hi: 'पात्र डेटा', es: 'Datos de Personajes', fr: 'Données des Personnages', ar: 'بيانات الشخصيات', pt: 'Dados de Personagens' },
  '会话与消息': { en: 'Sessions & Messages', hi: 'सत्र और संदेश', es: 'Sesiones y Mensajes', fr: 'Sessions & Messages', ar: 'الجلسات والرسائل', pt: 'Sessões & Mensagens' },
  '游戏数据': { en: 'Game Data', hi: 'गेम डेटा', es: 'Datos de Juegos', fr: 'Données de Jeu', ar: 'بيانات الألعاب', pt: 'Dados de Jogos' },
  '设置与配置': { en: 'Settings & Configs', hi: 'सेटिंग्स और कॉन्फ़िग', es: 'Ajustes y Configuraciones', fr: 'Paramètres & Configs', ar: 'الإعدادات والتكوينات', pt: 'Configurações & Ajustes' },
  '缓存': { en: 'Cache', hi: 'कैश', es: 'Caché', fr: 'Cache', ar: 'ذاكرة التخزين المؤقت', pt: 'Cache' },
  '其他': { en: 'Other', hi: 'अन्य', es: 'Otro', fr: 'Autre', ar: 'أخرى', pt: 'Outro' },
  '清除缓存': { en: 'Clear Cache', hi: 'कैश साफ़ करें', es: 'Limpiar Caché', fr: 'Vider le Cache', ar: 'مسح ذاكرة التخزين المؤقت', pt: 'Limpar Cache' },
  '清空所有数据': { en: 'Clear All Data', hi: 'सभी डेटा साफ़ करें', es: 'Borrar Todos los Datos', fr: 'Effacer Toutes les Données', ar: 'مسح جميع البيانات', pt: 'Limpar Todos os Dados' },

  // ==================== 设置 - 网络 ====================
  '代理设置': { en: 'Proxy Settings', hi: 'प्रॉक्सी सेटिंग्स', es: 'Configuración de Proxy', fr: 'Paramètres du Proxy', ar: 'إعدادات الوكيل', pt: 'Configurações de Proxy' },
  '启用代理': { en: 'Enable Proxy', hi: 'प्रॉक्सी सक्षम करें', es: 'Activar Proxy', fr: 'Activer le Proxy', ar: 'تفعيل الوكيل', pt: 'Ativar Proxy' },
  '代理类型': { en: 'Proxy Type', hi: 'प्रॉक्सी प्रकार', es: 'Tipo de Proxy', fr: 'Type de Proxy', ar: 'نوع الوكيل', pt: 'Tipo de Proxy' },
  '代理地址': { en: 'Proxy Address', hi: 'प्रॉक्सी पता', es: 'Dirección del Proxy', fr: 'Adresse du Proxy', ar: 'عنوان الوكيل', pt: 'Endereço do Proxy' },
  '代理端口': { en: 'Proxy Port', hi: 'प्रॉक्सी पोर्ट', es: 'Puerto del Proxy', fr: 'Port du Proxy', ar: 'منفذ الوكيل', pt: 'Porta do Proxy' },
  '用户名（可选）': { en: 'Username (optional)', hi: 'उपयोगकर्ता नाम (वैकल्पिक)', es: 'Usuario (opcional)', fr: "Nom d'utilisateur (optionnel)", ar: 'اسم المستخدم (اختياري)', pt: 'Usuário (opcional)' },
  '密码（可选）': { en: 'Password (optional)', hi: 'पासवर्ड (वैकल्पिक)', es: 'Contraseña (opcional)', fr: 'Mot de passe (optionnel)', ar: 'كلمة المرور (اختياري)', pt: 'Senha (opcional)' },
  '请求配置': { en: 'Request Settings', hi: 'अनुरोध सेटिंग्स', es: 'Configuración de Solicitudes', fr: 'Paramètres de Requête', ar: 'إعدادات الطلب', pt: 'Configurações de Requisição' },
  '请求超时时间': { en: 'Request Timeout', hi: 'अनुरोध टाइमआउट', es: 'Tiempo de Espera', fr: "Délai d'Expiration", ar: 'مهلة الطلب', pt: 'Tempo Limite de Requisição' },
  '并发请求限制': { en: 'Concurrent Request Limit', hi: 'समवर्ती अनुरोध सीमा', es: 'Límite de Solicitudes Simultáneas', fr: 'Limite de Requêtes Simultanées', ar: 'حد الطلبات المتزامنة', pt: 'Limite de Requisições Simultâneas' },
  '自定义 Header': { en: 'Custom Headers', hi: 'कस्टम हेडर', es: 'Encabezados Personalizados', fr: 'En-têtes Personnalisés', ar: 'رؤوس مخصصة', pt: 'Cabeçalhos Personalizados' },
  '请求重试策略': { en: 'Retry Policy', hi: 'पुनर्प्रयास नीति', es: 'Política de Reintento', fr: 'Politique de Réessai', ar: 'سياسة إعادة المحاولة', pt: 'Política de Repetição' },
  '失败重试次数': { en: 'Max Retries', hi: 'अधिकतम पुनर्प्रयास', es: 'Reintentos Máximos', fr: 'Tentatives Max', ar: 'الحد الأقصى لإعادة المحاولة', pt: 'Máximo de Tentativas' },
  '退避策略': { en: 'Backoff Strategy', hi: 'बैकऑफ़ रणनीति', es: 'Estrategia de Retroceso', fr: 'Stratégie de Backoff', ar: 'استراتيجية التراجع', pt: 'Estratégia de Backoff' },
  '固定间隔': { en: 'Fixed Interval', hi: 'निश्चित अंतराल', es: 'Intervalo Fijo', fr: 'Intervalle Fixe', ar: 'فاصل زمني ثابت', pt: 'Intervalo Fixo' },
  '指数退避': { en: 'Exponential Backoff', hi: 'एक्सपोनेंशियल बैकऑफ़', es: 'Retroceso Exponencial', fr: 'Backoff Exponentiel', ar: 'تراجع أسي', pt: 'Backoff Exponencial' },
  '线性退避': { en: 'Linear Backoff', hi: 'लीनियर बैकऑफ़', es: 'Retroceso Lineal', fr: 'Backoff Linéaire', ar: 'تراجع خطي', pt: 'Backoff Linear' },
  '初始退避间隔': { en: 'Initial Backoff Interval', hi: 'प्रारंभिक बैकऑफ़ अंतराल', es: 'Intervalo Inicial de Retroceso', fr: 'Intervalle de Backoff Initial', ar: 'الفاصل الزمني الأولي للتراجع', pt: 'Intervalo Inicial de Backoff' },

  // ==================== 设置 - 数据导入导出 ====================
  '导出': { en: 'Export', hi: 'निर्यात', es: 'Exportar', fr: 'Exporter', ar: 'تصدير', pt: 'Exportar' },
  '导入': { en: 'Import', hi: 'आयात', es: 'Importar', fr: 'Importer', ar: 'استيراد', pt: 'Importar' },
  '迁移': { en: 'Migrate', hi: 'माइग्रेट', es: 'Migrar', fr: 'Migrer', ar: 'ترحيل', pt: 'Migrar' },
  '角色数量': { en: 'Character Count', hi: 'पात्र संख्या', es: 'Número de Personajes', fr: 'Nombre de Personnages', ar: 'عدد الشخصيات', pt: 'Quantidade de Personagens' },
  '会话数量': { en: 'Session Count', hi: 'सत्र संख्या', es: 'Número de Sesiones', fr: 'Nombre de Sessions', ar: 'عدد الجلسات', pt: 'Quantidade de Sessões' },
  '消息数量': { en: 'Message Count', hi: 'संदेश संख्या', es: 'Número de Mensajes', fr: 'Nombre de Messages', ar: 'عدد الرسائل', pt: 'Quantidade de Mensagens' },
  '标准导出': { en: 'Standard Export', hi: 'मानक निर्यात', es: 'Exportación Estándar', fr: 'Export Standard', ar: 'تصدير قياسي', pt: 'Exportação Padrão' },
  '完整备份': { en: 'Full Backup', hi: 'पूर्ण बैकअप', es: 'Copia de Seguridad Completa', fr: 'Sauvegarde Complète', ar: 'نسخ احتياطي كامل', pt: 'Backup Completo' },
  '自定义导出': { en: 'Custom Export', hi: 'कस्टम निर्यात', es: 'Exportación Personalizada', fr: 'Export Personnalisé', ar: 'تصدير مخصص', pt: 'Exportação Personalizada' },
  '合并导入': { en: 'Merge Import', hi: 'मर्ज आयात', es: 'Importar Combinando', fr: 'Importation Fusionnée', ar: 'استيراد مدمج', pt: 'Importar Mesclando' },
  '替换恢复': { en: 'Replace & Restore', hi: 'बदलें और पुनर्स्थापित करें', es: 'Reemplazar y Restaurar', fr: 'Remplacer et Restaurer', ar: 'استبدال واستعادة', pt: 'Substituir e Restaurar' },
  '选择 JSON 文件': { en: 'Select JSON file', hi: 'JSON फ़ाइल चुनें', es: 'Seleccionar archivo JSON', fr: 'Sélectionner un fichier JSON', ar: 'اختر ملف JSON', pt: 'Selecionar arquivo JSON' },
  '生成二维码': { en: 'Generate QR Code', hi: 'QR कोड जनरेट करें', es: 'Generar Código QR', fr: 'Générer un QR Code', ar: 'إنشاء رمز QR', pt: 'Gerar QR Code' },
  '扫描二维码': { en: 'Scan QR Code', hi: 'QR कोड स्कैन करें', es: 'Escanear Código QR', fr: 'Scanner le QR Code', ar: 'مسح رمز QR', pt: 'Escanear QR Code' },

  // ==================== 设置 - 通知 ====================
  '通知': { en: 'Notifications', hi: 'सूचनाएँ', es: 'Notificaciones', fr: 'Notifications', ar: 'الإشعارات', pt: 'Notificações' },
  '消息': { en: 'Messages', hi: 'संदेश', es: 'Mensajes', fr: 'Messages', ar: 'الرسائل', pt: 'Mensagens' },

  // ==================== 设置 - 语音 ====================
  '调整朗读与录音偏好': { en: 'Adjust TTS & recording preferences', hi: 'TTS और रिकॉर्डिंग प्राथमिकताएँ समायोजित करें', es: 'Ajustar preferencias de TTS y grabación', fr: "Ajuster les préférences TTS et d'enregistrement", ar: 'ضبط تفضيلات القراءة والتسجيل', pt: 'Ajustar preferências de TTS e gravação' },
  '系统语音引擎': { en: 'System Voice Engine', hi: 'सिस्टम वॉइस इंजन', es: 'Motor de Voz del Sistema', fr: 'Moteur Vocal Système', ar: 'محرك الصوت النظامي', pt: 'Motor de Voz do Sistema' },
  'STT 可用': { en: 'STT Available', hi: 'STT उपलब्ध', es: 'STT Disponible', fr: 'STT Disponible', ar: 'STT متاح', pt: 'STT Disponível' },
  'STT 不可用': { en: 'STT Unavailable', hi: 'STT अनुपलब्ध', es: 'STT No Disponible', fr: 'STT Indisponible', ar: 'STT غير متاح', pt: 'STT Indisponível' },
  'TTS 可用': { en: 'TTS Available', hi: 'TTS उपलब्ध', es: 'TTS Disponible', fr: 'TTS Disponible', ar: 'TTS متاح', pt: 'TTS Disponível' },
  'TTS 不可用': { en: 'TTS Unavailable', hi: 'TTS अनुपलब्ध', es: 'TTS No Disponible', fr: 'TTS Indisponible', ar: 'TTS غير متاح', pt: 'TTS Indisponível' },

  // ==================== 设置 - 余额 ====================
  '最近聊天估值': { en: 'Recent Chat Estimate', hi: 'हालिया चैट अनुमान', es: 'Estimación de Chats Recientes', fr: 'Estimation des Chats Récents', ar: 'تقدير المحادثات الأخيرة', pt: 'Estimativa de Conversas Recentes' },
  '最近聊过的每一笔': { en: 'Each Recent Chat Turn', hi: 'हर हालिया चैट बारी', es: 'Cada Turno de Chat Reciente', fr: 'Chaque Tour de Chat Récent', ar: 'كل جولة محادثة حديثة', pt: 'Cada Rodada de Conversa Recente' },

  // ==================== 设置 - 全局提示词 ====================
  '配置全局提示词': { en: 'Configure Global Prompt', hi: 'ग्लोबल प्रॉम्प्ट कॉन्फ़िगर करें', es: 'Configurar Prompt Global', fr: 'Configurer le Prompt Global', ar: 'إعداد المطالبة العامة', pt: 'Configurar Prompt Global' },
  '保存提示词': { en: 'Save Prompt', hi: 'प्रॉम्प्ट सहेजें', es: 'Guardar Prompt', fr: 'Enregistrer le Prompt', ar: 'حفظ المطالبة', pt: 'Salvar Prompt' },

  // ==================== 设置 - 系统提示词管理 ====================
  '启用全部': { en: 'Enable All', hi: 'सभी सक्षम करें', es: 'Activar Todo', fr: 'Tout Activer', ar: 'تفعيل الكل', pt: 'Ativar Tudo' },
  '弃用全部': { en: 'Disable All', hi: 'सभी अक्षम करें', es: 'Desactivar Todo', fr: 'Tout Désactiver', ar: 'تعطيل الكل', pt: 'Desativar Tudo' },
  '高级模式': { en: 'Advanced Mode', hi: 'उन्नत मोड', es: 'Modo Avanzado', fr: 'Mode Avancé', ar: 'الوضع المتقدم', pt: 'Modo Avançado' },
  '普通模式': { en: 'Normal Mode', hi: 'सामान्य मोड', es: 'Modo Normal', fr: 'Mode Normal', ar: 'الوضع العادي', pt: 'Modo Normal' },
  '重置默认': { en: 'Reset to Default', hi: 'डिफ़ॉल्ट पर रीसेट करें', es: 'Restablecer Predeterminados', fr: 'Réinitialiser par Défaut', ar: 'إعادة التعيين إلى الافتراضي', pt: 'Redefinir para Padrão' },
  '导出配置': { en: 'Export Config', hi: 'कॉन्फ़िग निर्यात करें', es: 'Exportar Configuración', fr: 'Exporter la Configuration', ar: 'تصدير الإعداد', pt: 'Exportar Configuração' },
  '导入配置': { en: 'Import Config', hi: 'कॉन्फ़िग आयात करें', es: 'Importar Configuración', fr: 'Importer la Configuration', ar: 'استيراد الإعداد', pt: 'Importar Configuração' },
  '基础': { en: 'Basic', hi: 'बुनियादी', es: 'Básico', fr: 'Basique', ar: 'أساسي', pt: 'Básico' },
  '高级': { en: 'Advanced', hi: 'उन्नत', es: 'Avanzado', fr: 'Avancé', ar: 'متقدم', pt: 'Avançado' },
  '优先级': { en: 'Priority', hi: 'प्राथमिकता', es: 'Prioridad', fr: 'Priorité', ar: 'الأولوية', pt: 'Prioridade' },
  '位置': { en: 'Position', hi: 'स्थान', es: 'Posición', fr: 'Position', ar: 'الموضع', pt: 'Posição' },
  '触发': { en: 'Trigger', hi: 'ट्रिगर', es: 'Activador', fr: 'Déclencheur', ar: 'المحفز', pt: 'Gatilho' },
  '已启用': { en: 'Enabled', hi: 'सक्षम', es: 'Activado', fr: 'Activé', ar: 'مفعّل', pt: 'Ativado' },
  '收起': { en: 'Collapse', hi: 'समेटें', es: 'Contraer', fr: 'Réduire', ar: 'طي', pt: 'Recolher' },

  // ==================== 角色 - 列表 ====================
  '搜索感兴趣的内容': { en: 'Search characters…', hi: 'पात्र खोजें…', es: 'Buscar personajes…', fr: 'Rechercher des personnages…', ar: 'ابحث عن شخصيات…', pt: 'Buscar personagens…' },
  '导入角色': { en: 'Import Character', hi: 'पात्र आयात करें', es: 'Importar Personaje', fr: 'Importer un Personnage', ar: 'استيراد شخصية', pt: 'Importar Personagem' },
  '全部': { en: 'All', hi: 'सभी', es: 'Todos', fr: 'Tous', ar: 'الكل', pt: 'Todos' },
  '闯关式对话': { en: 'Challenge Chat', hi: 'चुनौती चैट', es: 'Chat Desafío', fr: 'Chat Défi', ar: 'محادثة التحدي', pt: 'Chat Desafio' },
  '群聊': { en: 'Group Chat', hi: 'ग्रुप चैट', es: 'Chat Grupal', fr: 'Chat de Groupe', ar: 'محادثة جماعية', pt: 'Chat em Grupo' },
  '群聊闯关': { en: 'Group Challenge', hi: 'ग्रुप चुनौती', es: 'Desafío Grupal', fr: 'Défi de Groupe', ar: 'تحدي جماعي', pt: 'Desafio em Grupo' },
  '内容为空': { en: 'No content', hi: 'कोई सामग्री नहीं', es: 'Sin contenido', fr: 'Aucun contenu', ar: 'لا يوجد محتوى', pt: 'Sem conteúdo' },
  '当前条件下还没有角色': { en: 'No characters found', hi: 'कोई पात्र नहीं मिला', es: 'No se encontraron personajes', fr: 'Aucun personnage trouvé', ar: 'لم يتم العثور على شخصيات', pt: 'Nenhum personagem encontrado' },
  '立即创建': { en: 'Create Now', hi: 'अभी बनाएँ', es: 'Crear Ahora', fr: 'Créer Maintenant', ar: 'أنشئ الآن', pt: 'Criar Agora' },
  '编辑': { en: 'Edit', hi: 'संपादित करें', es: 'Editar', fr: 'Modifier', ar: 'تعديل', pt: 'Editar' },
  '克隆': { en: 'Clone', hi: 'क्लोन', es: 'Clonar', fr: 'Cloner', ar: 'استنساخ', pt: 'Clonar' },
  '导入文件': { en: 'Import File', hi: 'फ़ाइल आयात करें', es: 'Importar Archivo', fr: 'Importer un Fichier', ar: 'استيراد ملف', pt: 'Importar Arquivo' },
  '导入文件夹': { en: 'Import Folder', hi: 'फ़ोल्डर आयात करें', es: 'Importar Carpeta', fr: 'Importer un Dossier', ar: 'استيراد مجلد', pt: 'Importar Pasta' },

  // ==================== 角色 - 详情 ====================
  '角色详情': { en: 'Character Details', hi: 'पात्र विवरण', es: 'Detalles del Personaje', fr: 'Détails du Personnage', ar: 'تفاصيل الشخصية', pt: 'Detalhes do Personagem' },
  '背景': { en: 'Background', hi: 'पृष्ठभूमि', es: 'Trasfondo', fr: 'Contexte', ar: 'الخلفية', pt: 'Antecedentes' },
  '描述': { en: 'Description', hi: 'विवरण', es: 'Descripción', fr: 'Description', ar: 'الوصف', pt: 'Descrição' },
  '开场白': { en: 'Opening Line', hi: 'पहला संवाद', es: 'Primera Línea', fr: "Phrase d'Accroche", ar: 'الجملة الافتتاحية', pt: 'Frase de Abertura' },
  '整体设定': { en: 'Overall Setting', hi: 'समग्र सेटिंग', es: 'Ambientación General', fr: 'Cadre Général', ar: 'الإعداد العام', pt: 'Configuração Geral' },
  '群聊公告': { en: 'Group Announcement', hi: 'ग्रुप घोषणा', es: 'Anuncio del Grupo', fr: 'Annonce du Groupe', ar: 'إعلان المجموعة', pt: 'Anúncio do Grupo' },
  '群聊描述': { en: 'Group Description', hi: 'ग्रुप विवरण', es: 'Descripción del Grupo', fr: 'Description du Groupe', ar: 'وصف المجموعة', pt: 'Descrição do Grupo' },
  '发言模式': { en: 'Speaking Mode', hi: 'बोलने का तरीका', es: 'Modo de Habla', fr: 'Mode de Parole', ar: 'نمط الكلام', pt: 'Modo de Fala' },
  '聊天背景': { en: 'Chat Background', hi: 'चैट पृष्ठभूमि', es: 'Fondo de Chat', fr: 'Fond de Chat', ar: 'خلفية المحادثة', pt: 'Plano de Fundo do Chat' },
  '全局背景': { en: 'Global Background', hi: 'ग्लोबल पृष्ठभूमि', es: 'Fondo Global', fr: 'Fond Global', ar: 'الخلفية العامة', pt: 'Plano de Fundo Global' },
  '切换动图': { en: 'Switch Animation', hi: 'एनिमेशन बदलें', es: 'Cambiar Animación', fr: "Changer l'Animation", ar: 'تبديل الرسوم المتحركة', pt: 'Trocar Animação' },
  '情感动图': { en: 'Emotion Animations', hi: 'भावना एनिमेशन', es: 'Animaciones de Emoción', fr: "Animations d'Émotion", ar: 'رسوم المشاعر المتحركة', pt: 'Animações de Emoção' },
  '开始聊天': { en: 'Start Chat', hi: 'चैट शुरू करें', es: 'Iniciar Chat', fr: 'Démarrer le Chat', ar: 'ابدأ المحادثة', pt: 'Iniciar Chat' },
  '删除角色': { en: 'Delete Character', hi: 'पात्र हटाएँ', es: 'Eliminar Personaje', fr: 'Supprimer le Personnage', ar: 'حذف الشخصية', pt: 'Excluir Personagem' },
  '加载中...': { en: 'Loading...', hi: 'लोड हो रहा है...', es: 'Cargando...', fr: 'Chargement...', ar: 'جارٍ التحميل...', pt: 'Carregando...' },
  '角色不存在': { en: 'Character not found', hi: 'पात्र मौजूद नहीं है', es: 'Personaje no encontrado', fr: 'Personnage introuvable', ar: 'الشخصية غير موجودة', pt: 'Personagem não encontrado' },

  // ==================== 角色 - 创建 ====================
  '创建新角色': { en: 'Create New Character', hi: 'नया पात्र बनाएँ', es: 'Crear Nuevo Personaje', fr: 'Créer un Nouveau Personnage', ar: 'إنشاء شخصية جديدة', pt: 'Criar Novo Personagem' },
  '快速开始': { en: 'Quick Start', hi: 'त्वरित शुरुआत', es: 'Inicio Rápido', fr: 'Démarrage Rapide', ar: 'بدء سريع', pt: 'Início Rápido' },
  '手动配置': { en: 'Manual Setup', hi: 'मैनुअल सेटअप', es: 'Configuración Manual', fr: 'Configuration Manuelle', ar: 'إعداد يدوي', pt: 'Configuração Manual' },
  '选择模板': { en: 'Choose Template', hi: 'टेम्पलेट चुनें', es: 'Elegir Plantilla', fr: 'Choisir un Modèle', ar: 'اختر قالباً', pt: 'Escolher Modelo' },
  'AI生成': { en: 'AI Generate', hi: 'AI जनरेट करें', es: 'Generar con IA', fr: 'Générer par IA', ar: 'توليد بالذكاء الاصطناعي', pt: 'Gerar com IA' },
  '互动类型': { en: 'Interaction Type', hi: 'इंटरैक्शन प्रकार', es: 'Tipo de Interacción', fr: "Type d'Interaction", ar: 'نوع التفاعل', pt: 'Tipo de Interação' },
  '高级选项': { en: 'Advanced Options', hi: 'उन्नत विकल्प', es: 'Opciones Avanzadas', fr: 'Options Avancées', ar: 'خيارات متقدمة', pt: 'Opções Avançadas' },
  '创意度': { en: 'Creativity', hi: 'रचनात्मकता', es: 'Creatividad', fr: 'Créativité', ar: 'الإبداع', pt: 'Criatividade' },
  '详细度': { en: 'Detail Level', hi: 'विस्तार स्तर', es: 'Nivel de Detalle', fr: 'Niveau de Détail', ar: 'مستوى التفصيل', pt: 'Nível de Detalhe' },
  '分类标签': { en: 'Tags', hi: 'टैग', es: 'Etiquetas', fr: 'Tags', ar: 'الوسوم', pt: 'Tags' },
  '结构化人设': { en: 'Structured Persona', hi: 'संरचित व्यक्तित्व', es: 'Personalidad Estructurada', fr: 'Personnalité Structurée', ar: 'شخصية منظمة', pt: 'Persona Estruturada' },
  '身份锁': { en: 'Identity Lock', hi: 'पहचान लॉक', es: 'Bloqueo de Identidad', fr: "Verrouillage d'Identité", ar: 'قفل الهوية', pt: 'Bloqueio de Identidade' },
  '性格特质': { en: 'Personality Traits', hi: 'व्यक्तित्व गुण', es: 'Rasgos de Personalidad', fr: 'Traits de Personnalité', ar: 'سمات الشخصية', pt: 'Traços de Personalidade' },
  '交流风格': { en: 'Communication Style', hi: 'संवाद शैली', es: 'Estilo de Comunicación', fr: 'Style de Communication', ar: 'أسلوب التواصل', pt: 'Estilo de Comunicação' },
  '媒体设定': { en: 'Media Settings', hi: 'मीडिया सेटिंग्स', es: 'Ajustes Multimedia', fr: 'Paramètres Médias', ar: 'إعدادات الوسائط', pt: 'Configurações de Mídia' },
  '角色名称': { en: 'Character Name', hi: 'पात्र का नाम', es: 'Nombre del Personaje', fr: 'Nom du Personnage', ar: 'اسم الشخصية', pt: 'Nome do Personagem' },
  '一句话描述': { en: 'One-line Description', hi: 'एक-पंक्ति विवरण', es: 'Descripción en Una Línea', fr: 'Description en Une Phrase', ar: 'وصف من سطر واحد', pt: 'Descrição em Uma Linha' },

  // ==================== 角色 - 编辑 ====================
  '基础信息': { en: 'Basic Info', hi: 'बुनियादी जानकारी', es: 'Información Básica', fr: 'Infos de Base', ar: 'المعلومات الأساسية', pt: 'Informações Básicas' },
  '提示词核心': { en: 'Core Prompt', hi: 'मुख्य प्रॉम्प्ट', es: 'Prompt Central', fr: 'Prompt Central', ar: 'المطالبة الأساسية', pt: 'Prompt Central' },
  '深度提示': { en: 'Deep Prompt', hi: 'गहरा प्रॉम्प्ट', es: 'Prompt Profundo', fr: 'Prompt Profond', ar: 'مطالبة عميقة', pt: 'Prompt Profundo' },
  '备选开场白': { en: 'Alternate Greetings', hi: 'वैकल्पिक अभिवादन', es: 'Saludos Alternativos', fr: 'Salutations Alternatives', ar: 'تحيات بديلة', pt: 'Saudações Alternativas' },

  // ==================== 角色 - 预览 ====================
  '预览模式': { en: 'Preview Mode', hi: 'पूर्वावलोकन मोड', es: 'Modo Vista Previa', fr: 'Mode Aperçu', ar: 'وضع المعاينة', pt: 'Modo de Pré-visualização' },
  '发送消息开始预览对话': { en: 'Send a message to preview', hi: 'पूर्वावलोकन के लिए संदेश भेजें', es: 'Envía un mensaje para previsualizar', fr: 'Envoyez un message pour prévisualiser', ar: 'أرسل رسالة للمعاينة', pt: 'Envie uma mensagem para pré-visualizar' },
  '输入消息…': { en: 'Type a message…', hi: 'संदेश लिखें…', es: 'Escribe un mensaje…', fr: 'Écrivez un message…', ar: 'اكتب رسالة…', pt: 'Digite uma mensagem…' },
  '预览轮次已达上限，请保存角色后继续对话': { en: 'Preview limit reached. Save character to continue.', hi: 'पूर्वावलोकन सीमा तक पहुँच गए। जारी रखने के लिए पात्र सहेजें।', es: 'Límite de vista previa alcanzado. Guarda el personaje para continuar.', fr: "Limite d'aperçu atteinte. Enregistrez le personnage pour continuer.", ar: 'تم الوصول إلى حد المعاينة. احفظ الشخصية للمتابعة.', pt: 'Limite de pré-visualização atingido. Salve o personagem para continuar.' },
  '预览模式：对话不会被保存': { en: 'Preview mode: chat will not be saved', hi: 'पूर्वावलोकन मोड: चैट सहेजी नहीं जाएगी', es: 'Modo vista previa: el chat no se guardará', fr: "Mode aperçu : le chat ne sera pas enregistré", ar: 'وضع المعاينة: لن يتم حفظ المحادثة', pt: 'Modo pré-visualização: o chat não será salvo' },

  // ==================== 聊天 ====================
  '正在线': { en: 'Online', hi: 'ऑनलाइन', es: 'En línea', fr: 'En ligne', ar: 'متصل', pt: 'Online' },
  '暂无角色': { en: 'No characters yet', hi: 'अभी कोई पात्र नहीं', es: 'Sin personajes aún', fr: "Aucun personnage pour l'instant", ar: 'لا توجد شخصيات بعد', pt: 'Nenhum personagem ainda' },
  '还没有消息': { en: 'No messages yet', hi: 'अभी कोई संदेश नहीं', es: 'Sin mensajes aún', fr: "Aucun message pour l'instant", ar: 'لا توجد رسائل بعد', pt: 'Nenhuma mensagem ainda' },
  '正在录音': { en: 'Recording…', hi: 'रिकॉर्डिंग हो रही है…', es: 'Grabando…', fr: 'Enregistrement…', ar: 'جارٍ التسجيل…', pt: 'Gravando…' },
  '正在转写': { en: 'Transcribing…', hi: 'ट्रांसक्राइब हो रहा है…', es: 'Transcribiendo…', fr: 'Transcription…', ar: 'جارٍ النسخ…', pt: 'Transcrevendo…' },
  '按住说话': { en: 'Hold to talk', hi: 'बोलने के लिए दबाए रखें', es: 'Mantén para hablar', fr: 'Maintenez pour parler', ar: 'اضغط مع الاستمرار للتحدث', pt: 'Segure para falar' },
  '插入括号': { en: 'Insert Parentheses', hi: 'कोष्ठक डालें', es: 'Insertir Paréntesis', fr: 'Insérer des Parenthèses', ar: 'إدراج أقواس', pt: 'Inserir Parênteses' },
  '发送': { en: 'Send', hi: 'भेजें', es: 'Enviar', fr: 'Envoyer', ar: 'إرسال', pt: 'Enviar' },
  '更多': { en: 'More', hi: 'अधिक', es: 'Más', fr: 'Plus', ar: 'المزيد', pt: 'Mais' },
  '回滚': { en: 'Rollback', hi: 'रोलबैक', es: 'Retroceder', fr: 'Revenir', ar: 'تراجع', pt: 'Reverter' },
  '清空聊天记录': { en: 'Clear Chat History', hi: 'चैट इतिहास साफ़ करें', es: 'Borrar Historial de Chat', fr: "Effacer l'Historique", ar: 'مسح سجل المحادثة', pt: 'Limpar Histórico de Chat' },
  '取消好友': { en: 'Unfriend', hi: 'मित्रता हटाएँ', es: 'Eliminar Amigo', fr: "Retirer l'Ami", ar: 'إلغاء الصداقة', pt: 'Desfazer Amizade' },
  '添加好友': { en: 'Add Friend', hi: 'मित्र जोड़ें', es: 'Añadir Amigo', fr: 'Ajouter un Ami', ar: 'إضافة صديق', pt: 'Adicionar Amigo' },
  '取消点赞': { en: 'Unlike', hi: 'लाइक हटाएँ', es: 'Quitar Me Gusta', fr: 'Retirer le Like', ar: 'إلغاء الإعجاب', pt: 'Remover Curtida' },
  '点赞': { en: 'Like', hi: 'लाइक', es: 'Me Gusta', fr: 'Like', ar: 'إعجاب', pt: 'Curtir' },
  '会话设置': { en: 'Session Settings', hi: 'सत्र सेटिंग्स', es: 'Ajustes de Sesión', fr: 'Paramètres de Session', ar: 'إعدادات الجلسة', pt: 'Configurações da Sessão' },
  '用户': { en: 'User', hi: 'उपयोगकर्ता', es: 'Usuario', fr: 'Utilisateur', ar: 'المستخدم', pt: 'Usuário' },
  'AI': { en: 'AI', hi: 'AI', es: 'IA', fr: 'IA', ar: 'AI', pt: 'IA' },
  '角色简介': { en: 'Character Bio', hi: 'पात्र परिचय', es: 'Biografía del Personaje', fr: 'Bio du Personnage', ar: 'نبذة عن الشخصية', pt: 'Biografia do Personagem' },
  '记忆摘要': { en: 'Memory Summary', hi: 'मेमोरी सारांश', es: 'Resumen de Memoria', fr: 'Résumé de Mémoire', ar: 'ملخص الذاكرة', pt: 'Resumo da Memória' },
  '偏好标签': { en: 'Preference Tags', hi: 'प्राथमिकता टैग', es: 'Etiquetas de Preferencia', fr: 'Tags de Préférence', ar: 'وسوم التفضيلات', pt: 'Tags de Preferência' },
  '清空记录': { en: 'Clear Records', hi: 'रिकॉर्ड साफ़ करें', es: 'Borrar Registros', fr: 'Effacer les Enregistrements', ar: 'مسح السجلات', pt: 'Limpar Registros' },

  // ==================== 历史/社交 ====================
  '好友': { en: 'Friends', hi: 'मित्र', es: 'Amigos', fr: 'Amis', ar: 'الأصدقاء', pt: 'Amigos' },
  '联系人': { en: 'Contacts', hi: 'संपर्क', es: 'Contactos', fr: 'Contacts', ar: 'جهات الاتصال', pt: 'Contatos' },
  '赞过': { en: 'Liked', hi: 'लाइक किया', es: 'Me Gusta', fr: 'Aimés', ar: 'أعجبني', pt: 'Curtidas' },
  '聊过': { en: 'Chatted', hi: 'चैट किया', es: 'Chateado', fr: 'Discuté', ar: 'تمت المحادثة', pt: 'Conversas' },
  '搜索用户/群聊': { en: 'Search users & groups', hi: 'उपयोगकर्ता और ग्रुप खोजें', es: 'Buscar usuarios y grupos', fr: 'Rechercher utilisateurs et groupes', ar: 'ابحث عن مستخدمين ومجموعات', pt: 'Buscar usuários e grupos' },
  '创建群聊': { en: 'Create Group', hi: 'ग्रुप बनाएँ', es: 'Crear Grupo', fr: 'Créer un Groupe', ar: 'إنشاء مجموعة', pt: 'Criar Grupo' },
  '申请加入': { en: 'Request to Join', hi: 'शामिल होने का अनुरोध', es: 'Solicitar Unirse', fr: 'Demander à Rejoindre', ar: 'طلب الانضمام', pt: 'Solicitar Entrada' },
  '通过': { en: 'Accept', hi: 'स्वीकार करें', es: 'Aceptar', fr: 'Accepter', ar: 'قبول', pt: 'Aceitar' },
  '暂无联系人': { en: 'No contacts yet', hi: 'अभी कोई संपर्क नहीं', es: 'Sin contactos aún', fr: "Aucun contact pour l'instant", ar: 'لا توجد جهات اتصال بعد', pt: 'Nenhum contato ainda' },
  '暂无点赞': { en: 'No likes yet', hi: 'अभी कोई लाइक नहीं', es: 'Sin Me Gusta aún', fr: "Aucun like pour l'instant", ar: 'لا توجد إعجابات بعد', pt: 'Nenhuma curtida ainda' },
  '暂无会话': { en: 'No chats yet', hi: 'अभी कोई चैट नहीं', es: 'Sin chats aún', fr: "Aucun chat pour l'instant", ar: 'لا توجد محادثات بعد', pt: 'Nenhum chat ainda' },
  '去主页看看': { en: 'Go to Home', hi: 'होम पर जाएँ', es: 'Ir a Inicio', fr: "Aller à l'Accueil", ar: 'اذهب إلى الرئيسية', pt: 'Ir para o Início' },
  '举报': { en: 'Report', hi: 'रिपोर्ट', es: 'Reportar', fr: 'Signaler', ar: 'إبلاغ', pt: 'Denunciar' },

  // ==================== 朋友圈 ====================
  '还没有好友': { en: 'No friends yet', hi: 'अभी कोई मित्र नहीं', es: 'Sin amigos aún', fr: "Aucun ami pour l'instant", ar: 'لا يوجد أصدقاء بعد', pt: 'Nenhum amigo ainda' },
  '去认识角色': { en: 'Meet Characters', hi: 'पात्रों से मिलें', es: 'Conocer Personajes', fr: 'Rencontrer des Personnages', ar: 'تعرف على الشخصيات', pt: 'Conhecer Personagens' },
  '收藏': { en: 'Favorite', hi: 'पसंदीदा', es: 'Favorito', fr: 'Favori', ar: 'المفضلة', pt: 'Favorito' },
  '转发': { en: 'Share', hi: 'शेयर', es: 'Compartir', fr: 'Partager', ar: 'مشاركة', pt: 'Compartilhar' },
  '刚刚': { en: 'Just now', hi: 'अभी-अभी', es: 'Ahora mismo', fr: "À l'instant", ar: 'الآن', pt: 'Agora mesmo' },
  '分钟前': { en: 'min ago', hi: 'मिनट पहले', es: 'min', fr: 'min', ar: 'منذ دقائق', pt: 'min atrás' },
  '小时前': { en: 'hr ago', hi: 'घंटे पहले', es: 'h', fr: 'h', ar: 'منذ ساعات', pt: 'h atrás' },
  '天前': { en: 'days ago', hi: 'दिन पहले', es: 'días', fr: 'j', ar: 'منذ أيام', pt: 'dias atrás' },
  '月': { en: 'month', hi: 'माह', es: 'mes', fr: 'mois', ar: 'شهر', pt: 'mês' },
  '日': { en: 'day', hi: 'दिन', es: 'día', fr: 'jour', ar: 'يوم', pt: 'dia' },
  '留言…': { en: 'Comment…', hi: 'टिप्पणी…', es: 'Comentar…', fr: 'Commenter…', ar: 'تعليق…', pt: 'Comentar…' },
  '正在生成新动态…': { en: 'Generating new moments…', hi: 'नए मोमेंट्स जनरेट हो रहे हैं…', es: 'Generando nuevos momentos…', fr: 'Génération de nouveaux moments…', ar: 'جارٍ إنشاء لحظات جديدة…', pt: 'Gerando novos moments…' },
  '当前好友暂未发布朋友圈': { en: 'No moments from friends yet', hi: 'अभी मित्रों के मोमेंट्स नहीं हैं', es: 'Tus amigos no han publicado momentos aún', fr: "Vos amis n'ont pas encore publié de moments", ar: 'لم ينشر أصدقاؤك لحظات بعد', pt: 'Seus amigos ainda não publicaram moments' },

  // ==================== 收藏夹 ====================
  '收藏夹': { en: 'Favorites', hi: 'पसंदीदा', es: 'Favoritos', fr: 'Favoris', ar: 'المفضلة', pt: 'Favoritos' },
  '当前收藏': { en: 'Current Favorites', hi: 'वर्तमान पसंदीदा', es: 'Favoritos Actuales', fr: 'Favoris Actuels', ar: 'المفضلة الحالية', pt: 'Favoritos Atuais' },
  '搜索收藏角色': { en: 'Search favorites…', hi: 'पसंदीदा खोजें…', es: 'Buscar en favoritos…', fr: 'Rechercher dans les favoris…', ar: 'ابحث في المفضلة…', pt: 'Buscar nos favoritos…' },
  '已收藏': { en: 'Favorited', hi: 'पसंदीदा में जोड़ा', es: 'En Favoritos', fr: 'Mis en Favoris', ar: 'في المفضلة', pt: 'Favoritado' },
  '取消收藏': { en: 'Unfavorite', hi: 'पसंदीदा से हटाएँ', es: 'Quitar de Favoritos', fr: 'Retirer des Favoris', ar: 'إزالة من المفضلة', pt: 'Remover dos Favoritos' },
  '继续聊天': { en: 'Continue Chat', hi: 'चैट जारी रखें', es: 'Seguir Chat', fr: 'Continuer le Chat', ar: 'متابعة المحادثة', pt: 'Continuar Chat' },
  '还没有收藏': { en: 'No favorites yet', hi: 'अभी कोई पसंदीदा नहीं', es: 'Sin favoritos aún', fr: "Aucun favori pour l'instant", ar: 'لا توجد مفضلة بعد', pt: 'Nenhum favorito ainda' },

  // ==================== 对话/剧情 ====================
  '场景图': { en: 'Scene Image', hi: 'दृश्य छवि', es: 'Imagen de Escena', fr: 'Image de Scène', ar: 'صورة المشهد', pt: 'Imagem da Cena' },
  '对方': { en: 'Them', hi: 'वे', es: 'Ellos', fr: 'Eux', ar: 'الطرف الآخر', pt: 'Outro' },
  '你': { en: 'You', hi: 'आप', es: 'Tú', fr: 'Vous', ar: 'أنت', pt: 'Você' },
  '暂无可用角色': { en: 'No characters available', hi: 'कोई पात्र उपलब्ध नहीं', es: 'Sin personajes disponibles', fr: 'Aucun personnage disponible', ar: 'لا توجد شخصيات متاحة', pt: 'Nenhum personagem disponível' },
  '角色已死亡': { en: 'Character has died', hi: 'पात्र की मृत्यु हो गई', es: 'El personaje ha muerto', fr: 'Le personnage est mort', ar: 'الشخصية ماتت', pt: 'O personagem morreu' },
  '回溯': { en: 'Rewind', hi: 'रिवाइंड', es: 'Retroceder', fr: 'Revenir', ar: 'تراجع', pt: 'Voltar' },
  '重新开始': { en: 'Restart', hi: 'पुनः आरंभ करें', es: 'Reiniciar', fr: 'Recommencer', ar: 'إعادة البدء', pt: 'Reiniciar' },
  '信息': { en: 'Info', hi: 'जानकारी', es: 'Información', fr: 'Infos', ar: 'معلومات', pt: 'Informações' },
  '当前对话': { en: 'Current Dialogue', hi: 'वर्तमान संवाद', es: 'Diálogo Actual', fr: 'Dialogue Actuel', ar: 'الحوار الحالي', pt: 'Diálogo Atual' },
  '笔记': { en: 'Notes', hi: 'नोट्स', es: 'Notas', fr: 'Notes', ar: 'ملاحظات', pt: 'Notas' },
  '自动保存到本地': { en: 'Auto-saved locally', hi: 'स्थानीय रूप से ऑटो-सेव', es: 'Guardado automáticamente local', fr: 'Sauvegardé automatiquement en local', ar: 'حفظ تلقائي محلياً', pt: 'Salvo automaticamente localmente' },
  '图鉴': { en: 'Codex', hi: 'कोडेक्स', es: 'Códice', fr: 'Codex', ar: 'الموسوعة', pt: 'Codex' },

  // ==================== 游戏相关 (精选) ====================
  '新增游戏': { en: 'Add Game', hi: 'गेम जोड़ें', es: 'Añadir Juego', fr: 'Ajouter un Jeu', ar: 'إضافة لعبة', pt: 'Adicionar Jogo' },
  '菜单': { en: 'Menu', hi: 'मेनू', es: 'Menú', fr: 'Menu', ar: 'القائمة', pt: 'Menu' },
  '角色扮演': { en: 'RPG', hi: 'RPG', es: 'RPG', fr: 'RPG', ar: 'RPG', pt: 'RPG' },
  '进入': { en: 'Enter', hi: 'प्रवेश करें', es: 'Entrar', fr: 'Entrer', ar: 'دخول', pt: 'Entrar' },
  '创建游戏': { en: 'Create Game', hi: 'गेम बनाएँ', es: 'Crear Juego', fr: 'Créer un Jeu', ar: 'إنشاء لعبة', pt: 'Criar Jogo' },
  '导入游戏': { en: 'Import Game', hi: 'गेम आयात करें', es: 'Importar Juego', fr: 'Importer un Jeu', ar: 'استيراد لعبة', pt: 'Importar Jogo' },
  '选择文件': { en: 'Select File', hi: 'फ़ाइल चुनें', es: 'Seleccionar Archivo', fr: 'Sélectionner un Fichier', ar: 'اختر ملفاً', pt: 'Selecionar Arquivo' },
  '选择文件夹': { en: 'Select Folder', hi: 'फ़ोल्डर चुनें', es: 'Seleccionar Carpeta', fr: 'Sélectionner un Dossier', ar: 'اختر مجلداً', pt: 'Selecionar Pasta' },
  '返回': { en: 'Back', hi: 'वापस', es: 'Volver', fr: 'Retour', ar: 'عودة', pt: 'Voltar' },
  '游戏资源加载中…': { en: 'Loading game assets…', hi: 'गेम संसाधन लोड हो रहे हैं…', es: 'Cargando recursos del juego…', fr: 'Chargement des ressources du jeu…', ar: 'جارٍ تحميل موارد اللعبة…', pt: 'Carregando recursos do jogo…' },
  '游戏加载中…': { en: 'Loading game…', hi: 'गेम लोड हो रहा है…', es: 'Cargando juego…', fr: 'Chargement du jeu…', ar: 'جارٍ تحميل اللعبة…', pt: 'Carregando jogo…' },
  '保存当前进度': { en: 'Save Progress', hi: 'प्रगति सहेजें', es: 'Guardar Progreso', fr: 'Sauvegarder la Progression', ar: 'حفظ التقدم', pt: 'Salvar Progresso' },
  '游戏': { en: 'Game', hi: 'गेम', es: 'Juego', fr: 'Jeu', ar: 'لعبة', pt: 'Jogo' },
  '设置': { en: 'Settings', hi: 'सेटिंग्स', es: 'Ajustes', fr: 'Paramètres', ar: 'الإعدادات', pt: 'Configurações' },
  '生成中': { en: 'Generating', hi: 'जनरेट हो रहा है', es: 'Generando', fr: 'Génération en Cours', ar: 'جارٍ التوليد', pt: 'Gerando' },
  '取消': { en: 'Cancel', hi: 'रद्द करें', es: 'Cancelar', fr: 'Annuler', ar: 'إلغاء', pt: 'Cancelar' },
  '预览': { en: 'Preview', hi: 'पूर्वावलोकन', es: 'Vista Previa', fr: 'Aperçu', ar: 'معاينة', pt: 'Pré-visualizar' },
  '保存': { en: 'Save', hi: 'सहेजें', es: 'Guardar', fr: 'Enregistrer', ar: 'حفظ', pt: 'Salvar' },
  '已完成': { en: 'Completed', hi: 'पूर्ण', es: 'Completado', fr: 'Terminé', ar: 'مكتمل', pt: 'Concluído' },
  '失败': { en: 'Failed', hi: 'विफल', es: 'Fallido', fr: 'Échoué', ar: 'فشل', pt: 'Falhou' },
  '新建': { en: 'New', hi: 'नया', es: 'Nuevo', fr: 'Nouveau', ar: 'جديد', pt: 'Novo' },
  '保存修改': { en: 'Save Changes', hi: 'बदलाव सहेजें', es: 'Guardar Cambios', fr: 'Enregistrer les Modifications', ar: 'حفظ التغييرات', pt: 'Salvar Alterações' },
  '保存成功': { en: 'Saved successfully', hi: 'सफलतापूर्वक सहेजा गया', es: 'Guardado correctamente', fr: 'Enregistré avec succès', ar: 'تم الحفظ بنجاح', pt: 'Salvo com sucesso' },
  '保存失败': { en: 'Save failed', hi: 'सहेजना विफल', es: 'Error al guardar', fr: "Échec de l'enregistrement", ar: 'فشل الحفظ', pt: 'Falha ao salvar' },
  '导入成功': { en: 'Import successful', hi: 'आयात सफल', es: 'Importación exitosa', fr: 'Importation réussie', ar: 'تم الاستيراد بنجاح', pt: 'Importação bem-sucedida' },
  '导入失败': { en: 'Import failed', hi: 'आयात विफल', es: 'Falló la importación', fr: "Échec de l'importation", ar: 'فشل الاستيراد', pt: 'Falha na importação' },
  '导出成功': { en: 'Export successful', hi: 'निर्यात सफल', es: 'Exportación exitosa', fr: 'Exportation réussie', ar: 'تم التصدير بنجاح', pt: 'Exportação bem-sucedida' },
  '导出失败': { en: 'Export failed', hi: 'निर्यात विफल', es: 'Falló la exportación', fr: "Échec de l'exportation", ar: 'فشل التصدير', pt: 'Falha na exportação' },
  '确认删除': { en: 'Confirm Delete', hi: 'हटाने की पुष्टि करें', es: 'Confirmar Eliminación', fr: 'Confirmer la Suppression', ar: 'تأكيد الحذف', pt: 'Confirmar Exclusão' },
  '删除成功': { en: 'Deleted successfully', hi: 'सफलतापूर्वक हटाया गया', es: 'Eliminado correctamente', fr: 'Supprimé avec succès', ar: 'تم الحذف بنجاح', pt: 'Excluído com sucesso' },
  '删除失败': { en: 'Delete failed', hi: 'हटाना विफल', es: 'Error al eliminar', fr: 'Échec de la suppression', ar: 'فشل الحذف', pt: 'Falha ao excluir' },
  '复制成功': { en: 'Copied successfully', hi: 'कॉपी सफल', es: 'Copiado correctamente', fr: 'Copié avec succès', ar: 'تم النسخ بنجاح', pt: 'Copiado com sucesso' },
  '复制失败': { en: 'Copy failed', hi: 'कॉपी विफल', es: 'Error al copiar', fr: 'Échec de la copie', ar: 'فشل النسخ', pt: 'Falha ao copiar' },
  '复制角色': { en: 'Clone Character', hi: 'पात्र क्लोन करें', es: 'Clonar Personaje', fr: 'Cloner le Personnage', ar: 'استنساخ الشخصية', pt: 'Clonar Personagem' },
  '确认导入': { en: 'Confirm Import', hi: 'आयात की पुष्टि करें', es: 'Confirmar Importación', fr: "Confirmer l'Importation", ar: 'تأكيد الاستيراد', pt: 'Confirmar Importação' },
  '文件格式无效': { en: 'Invalid file format', hi: 'अमान्य फ़ाइल प्रारूप', es: 'Formato de archivo no válido', fr: 'Format de fichier invalide', ar: 'تنسيق ملف غير صالح', pt: 'Formato de arquivo inválido' },
  '语言': { en: 'Language', hi: 'भाषा', es: 'Idioma', fr: 'Langue', ar: 'اللغة', pt: 'Idioma' },
  '选择语言': { en: 'Select Language', hi: 'भाषा चुनें', es: 'Seleccionar Idioma', fr: 'Sélectionner la Langue', ar: 'اختر اللغة', pt: 'Selecionar Idioma' },
}

/**
 * 翻译函数
 * @param key 中文原文
 * @param lang 目标语言代码，不传则使用当前语言
 * @returns 翻译后的文本
 */
export function t(key: string, lang?: SupportedLanguage | string): string {
  if (!key) return key

  // 如果是中文且目标是中文，直接返回
  if (!lang || lang === 'zh-CN') return key

  const entry = translations[key]
  if (!entry) return key

  const translated = entry[lang as SupportedLanguage]
  if (translated) return translated

  return key
}

/**
 * 检测当前系统语言
 * 使用 uni.getSystemInfoSync() 获取系统语言并映射到支持的语言
 */
export function detectSystemLanguage(): SupportedLanguage {
  try {
    // 尝试使用 uni-app API 获取系统语言
    const sysInfo = uni.getSystemInfoSync?.()
    if (sysInfo?.language) {
      const sysLang = sysInfo.language
      // 先精确匹配
      if (SYSTEM_LANGUAGE_MAP[sysLang]) {
        return SYSTEM_LANGUAGE_MAP[sysLang]
      }
      // 尝试只匹配前缀 (如 'zh-Hans-CN' → 'zh')
      const prefix = sysLang.split('-')[0]
      if (SYSTEM_LANGUAGE_MAP[prefix]) {
        return SYSTEM_LANGUAGE_MAP[prefix]
      }
    }
  } catch {
    // uni API 不可用时回退到浏览器
  }

  // 浏览器环境回退
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language
    if (SYSTEM_LANGUAGE_MAP[browserLang]) {
      return SYSTEM_LANGUAGE_MAP[browserLang]
    }
    const prefix = browserLang.split('-')[0]
    if (SYSTEM_LANGUAGE_MAP[prefix]) {
      return SYSTEM_LANGUAGE_MAP[prefix]
    }
  }

  return FALLBACK_LANGUAGE
}

/**
 * 获取语言的原生名称
 */
export function getLanguageNativeName(code: SupportedLanguage): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
  return lang?.nativeName ?? code
}

/**
 * 检查语言代码是否被支持
 */
export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some(l => l.code === code)
}
