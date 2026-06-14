import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Building2, 
  Users, 
  Settings, 
  FileCode, 
  Plus, 
  Download, 
  Search, 
  Filter, 
  Bell, 
  Smartphone, 
  Mail, 
  Volume2, 
  Trash2, 
  CheckSquare,
  ExternalLink, 
  Clipboard, 
  Check, 
  RefreshCw, 
  Clock, 
  Sparkles,
  Bot,
  Send, 
  Laptop, 
  X, 
  Edit3, 
  AlertCircle,
  Megaphone,
  CheckCircle2,
  Code2,
  Terminal,
  Briefcase,
  DollarSign,
  UserCheck,
  Percent,
  TrendingUp,
  UserPlus,
  User,
  Image,
  LayoutGrid,
  Kanban,
  ShieldCheck,
  Calendar,
  Wrench,
  MapPin,
  Phone,
  ChevronRight,
  MessageSquare,
  MoreVertical,
  ArrowLeft,
  Smile,
  Mic,
  Inbox,
  Key,
  LogOut,
  Star,
  CheckCircle
} from "lucide-react";
import { Lead, Template, AlertConfig, Professional, ProfitRecord, WhatsAppTemplate } from "./types";
import SuccessScreen from "./components/SuccessScreen";
import LeadCountdown from "./components/LeadCountdown";
import { Button } from "./components/Button";
import { Input } from "./components/Input";
import { TextArea } from "./components/TextArea";
import { Card } from "./components/Card";
import { ChartContainer } from "./components/ChartContainer";
import { WebhookLogsTable } from "./components/WebhookLogsTable";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from "recharts";

export default function App() {
  // Sidebar navigation tabs
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "kanban" | "templates" | "embed" | "notifications" | "professionals" | "design-system" | "webhook-logs">("overview");
  const [draggedOverColId, setDraggedOverColId] = useState<string | null>(null);

  // Main data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    emailEnabled: true,
    emailAddress: "",
    whatsappEnabled: true,
    whatsappNumber: "",
    soundEnabled: true,
    osNotificationEnabled: true
  });

  // Evolution API Connection Status State
  const [evolutionStatus, setEvolutionStatus] = useState<{
    connected: boolean;
    exists: boolean;
    qrcode: string;
    jid: string;
    instanceName: string;
    error?: string;
  } | null>(null);
  const [loadingEvolution, setLoadingEvolution] = useState(false);
  const [triggeringEvolutionConnect, setTriggeringEvolutionConnect] = useState(false);

  // Professionals & Financial state
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  // Modals & fields for professional registration / edit
  const [showAddEditProfModal, setShowAddEditProfModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [profName, setProfName] = useState("");
  const [profSpecialty, setProfSpecialty] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profPhotoUrl, setProfPhotoUrl] = useState("");
  const [profTemplateId, setProfTemplateId] = useState("");
  const [profUsername, setProfUsername] = useState("");
  const [profPassword, setProfPassword] = useState("");

  // Custom non-blocking modal replacement for alert/confirm in cross-origin iframe sandboxes
  const [appAlert, setAppAlert] = useState<{ show: boolean; title: string; message: string; type: "success" | "error" | "info" } | null>(null);
  const [appConfirm, setAppConfirm] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const triggerAppAlert = (message: string, type: "success" | "error" | "info" = "info", title: string = "Aviso") => {
    setAppAlert({ show: true, title, message, type });
  };

  const triggerAppConfirm = (message: string, onConfirm: () => void, title: string = "Confirmar Ação") => {
    setAppConfirm({ show: true, title, message, onConfirm });
  };

  // Professional independent authenticated portal states
  const [loggedInProf, setLoggedInProf] = useState<Professional | null>(null);
  const [showProfLoginScreen, setShowProfLoginScreen] = useState(false);
  const [profLoginUser, setProfLoginUser] = useState("");
  const [profLoginPass, setProfLoginPass] = useState("");
  const [profLoginErr, setProfLoginErr] = useState("");
  const [profPortalActiveTab, setProfPortalActiveTab] = useState<"leads" | "finances" | "profile">("leads");
  const [profPortalSelectedLead, setProfPortalSelectedLead] = useState<Lead | null>(null);

  // Form fields for adding profit record
  const [recordDate, setRecordDate] = useState("");
  const [recordDescription, setRecordDescription] = useState("");
  const [recordValue, setRecordValue] = useState("");
  const [addingProfitRecord, setAddingProfitRecord] = useState(false);
  const [profPeriodFilter, setProfPeriodFilter] = useState("7d");

  // UI state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  
  // Real-time new lead alerts display state
  const [recentLiveLead, setRecentLiveLead] = useState<Lead | null>(null);
  const [showRecentToast, setShowRecentToast] = useState(false);

  // Detail Modal for selected lead
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);

  // Batch selection state for leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Keep track of viewed lead IDs in client localStorage
  const [viewedLeadIds, setViewedLeadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("viewed_lead_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markLeadAsViewed = (id: string) => {
    if (!viewedLeadIds.includes(id)) {
      const updated = [...viewedLeadIds, id];
      setViewedLeadIds(updated);
      localStorage.setItem("viewed_lead_ids", JSON.stringify(updated));
    }
  };

  // Template creation dialog state
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateUrl, setNewTemplateUrl] = useState("");
  const [newTemplateFields, setNewTemplateFields] = useState([
    { name: "name", label: "Nome Completo", type: "text", required: true },
    { name: "phone", label: "Telefone / WhatsApp", type: "tel", required: true },
    { name: "email", label: "E-mail de Contato", type: "email", required: false }
  ]);

  // Embed copy widget generator selector
  const [selectedEmbedTemplateId, setSelectedEmbedTemplateId] = useState("");
  const [embedWidgetTitle, setEmbedWidgetTitle] = useState("Fale Conosco");
  const [embedBtnColor, setEmbedBtnColor] = useState("#4f46e5");
  const [embedBtnText, setEmbedBtnText] = useState("Enviar Mensagem");
  const [copiedScript, setCopiedScript] = useState(false);

  // Quick Lead Simulator input panel
  const [simName, setSimName] = useState("");
  const [simPhone, setSimPhone] = useState("");
  const [simAddress, setSimAddress] = useState("");
  const [simCity, setSimCity] = useState("");
  const [simDescription, setSimDescription] = useState("");
  const [simTemplateId, setSimTemplateId] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);

  // Load backend host configurations
  const [apiHost, setApiHost] = useState("");

  // Real-time synchronization date timestamp tracking
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // --- START OF PROFESSIONAL FORWARDING STATES ---
  const [activeProfessionalToken, setActiveProfessionalToken] = useState<string | null>(null);
  const [profPortalPhase, setProfPortalPhase] = useState<"loading" | "auth" | "service_detail" | "success" | "recused" | "error">("loading");
  const [profPortalError, setProfPortalError] = useState<string | null>(null);
  const [profPortalLead, setProfPortalLead] = useState<Lead | null>(null);
  const [profPortalProfessional, setProfPortalProfessional] = useState<any | null>(null);
  const [profPortalLeadOverview, setProfPortalLeadOverview] = useState<any | null>(null);
  const [profPortalPhoneInput, setProfPortalPhoneInput] = useState("");
  const [profPortalUsernameInput, setProfPortalUsernameInput] = useState("");
  const [profPortalPasswordInput, setProfPortalPasswordInput] = useState("");
  const [profPortalRememberSession, setProfPortalRememberSession] = useState<"remember" | "session">("remember");
  const [profPortalExpiresAt, setProfPortalExpiresAt] = useState<string | null>(null);
  const [profPortalRecuseReason, setProfPortalRecuseReason] = useState("");
  const [profPortalEstimatedValue, setProfPortalEstimatedValue] = useState("");
  const [showRecuseModal, setShowRecuseModal] = useState(false);
  const [copiedTokenUrl, setCopiedTokenUrl] = useState(false);

  // Operator panel forward state controllers
  const [forwardingProfessionalId, setForwardingProfessionalId] = useState("");
  const [forwardingLocation, setForwardingLocation] = useState("");
  const [forwardingValidityHours, setForwardingValidityHours] = useState(24);
  const [submittingForward, setSubmittingForward] = useState(false);
  const [forwardSuccessResult, setForwardSuccessResult] = useState<{
    lead: Lead;
    token: string;
    whatsappMessageSimulated: string;
  } | null>(null);
  const [showForwardModalFromKanban, setShowForwardModalFromKanban] = useState(false);
  // --- END OF PROFESSIONAL FORWARDING STATES ---

  // --- START OF PUBLIC CLIENT REVIEWS STATE FLOW ---
  const [activeReviewLeadId, setActiveReviewLeadId] = useState<string | null>(null);
  const [activeReviewToken, setActiveReviewToken] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewInfo, setReviewInfo] = useState<{ professionalName: string; specialty: string; templateName: string } | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewClientName, setReviewClientName] = useState<string>("");
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // States for manual resending rating reviews by operators
  const [resendingReviewId, setResendingReviewId] = useState<string | null>(null);
  const [resendReviewSuccessMsg, setResendReviewSuccessMsg] = useState<string | null>(null);
  const [resendReviewErrorMsg, setResendReviewErrorMsg] = useState<string | null>(null);

  const handleResendReviewLink = async (leadId: string) => {
    setResendingReviewId(leadId);
    setResendReviewSuccessMsg(null);
    setResendReviewErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/resend-review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResendReviewErrorMsg(data.error || "Ocorreu um erro ao reenviar o link.");
      } else {
        setResendReviewSuccessMsg(`Link de avaliação reenviado com sucesso!`);
        // Refresh local memory database state
        loadData(true);
      }
    } catch (err) {
      setResendReviewErrorMsg("Erro de comunicação com o servidor.");
    } finally {
      setResendingReviewId(null);
    }
  };
  const [selectedProfReviews, setSelectedProfReviews] = useState<any[]>([]);

  useEffect(() => {
    if (selectedProfessionalId) {
      fetch(`/api/professionals/${selectedProfessionalId}/reviews`)
        .then((res) => {
          if (res.ok) return res.json();
          return [];
        })
        .then((data) => {
          setSelectedProfReviews(data);
        })
        .catch(() => {
          setSelectedProfReviews([]);
        });
    } else {
      setSelectedProfReviews([]);
    }
  }, [selectedProfessionalId]);

  // --- END OF PUBLIC CLIENT REVIEWS STATE FLOW ---

  // --- START OF WHATSAPP TEMPLATE STATES ---
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [showAddEditTmplModal, setShowAddEditTmplModal] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<WhatsAppTemplate | null>(null);
  const [tmplName, setTmplName] = useState("");
  const [tmplContent, setTmplContent] = useState("");
  const [tmplIsDefault, setTmplIsDefault] = useState(false);
  const [savingTmpl, setSavingTmpl] = useState(false);
  const [deletingTmplId, setDeletingTmplId] = useState<string | null>(null);
  const [forwardingTemplateId, setForwardingTemplateId] = useState("");
  // --- END OF WHATSAPP TEMPLATE STATES ---

  // --- CHATBOT IA EMBED WIDGET SIMULATOR STATES ---
  const [embedTabSubMode, setEmbedTabSubMode] = useState<"form" | "chatbot">("form");
  const [activeChatSubTab, setActiveChatSubTab] = useState("personalizacao");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isTestChatbotModalOpen, setIsTestChatbotModalOpen] = useState(false);
  const [chatbotWidgetTitle, setChatbotWidgetTitle] = useState("Assistente Virtual Inteligente");
  const [chatbotAvatarColor, setChatbotAvatarColor] = useState("#4f46e5");
  const [chatbotAvatarUrl, setChatbotAvatarUrl] = useState<string>("");
  const [chatbotWelcomeMsg, setChatbotWelcomeMsg] = useState("Olá! Como posso te ajudar hoje? Para começarmos, qual o seu nome completo?");
  const [chatbotToneOfVoice, setChatbotToneOfVoice] = useState("amigavel-casual");
  const [chatbotPersonaDescription, setChatbotPersonaDescription] = useState("Você é Sofia, atendente virtual simpática. Responda de forma curta e objetiva e priorize coletar o Nome e Telefone/WhatsApp de forma sutil.");
  const [chatbotSystemRules, setChatbotSystemRules] = useState("1. Nunca dê informações falsas de preços mínimos.\n2. Lembre-se de perguntar o tipo de conserto ou serviço necessário.");
  const [chatbotResponseDelay, setChatbotResponseDelay] = useState(1000); // in ms
  
  // Chat History & Inputs
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: "user" | "bot"; text: string; timestamp: Date }>>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [chatIsTyping, setChatIsTyping] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(`conv-${Date.now()}`);
  
  // Textarea references for auto-resize
  const textareaRef1 = useRef<HTMLTextAreaElement>(null);
  const textareaRef2 = useRef<HTMLTextAreaElement>(null);

  const resetTextareaHeights = () => {
    if (textareaRef1.current) {
      textareaRef1.current.style.height = "auto";
    }
    if (textareaRef2.current) {
      textareaRef2.current.style.height = "auto";
    }
  };

  // Context-aware clickable quick replies
  const computedQuickReplies = useMemo(() => {
    const activeTemplate = templates.find(t => t.id === selectedEmbedTemplateId) || templates[0];
    const nameLower = (activeTemplate?.name || "").toLowerCase();

    if (nameLower.includes("eletricista") || nameLower.includes("conserto") || nameLower.includes("reparo") || nameLower.includes("casa")) {
      return [
        "Quero um Orçamento 💰",
        "Qual o valor da visita técnica? 🛠️",
        "É uma Urgência! 🚨",
        "Falar com atendente de plantão 👥"
      ];
    }
    if (nameLower.includes("advocacia") || nameLower.includes("jurid") || nameLower.includes("lei")) {
      return [
        "Preciso de uma Consulta ⚖️",
        "Como funciona o contrato? 📝",
        "Falar com advogado especialista 💼",
        "Valores de assessoria 💰"
      ];
    }
    if (nameLower.includes("suporte") || nameLower.includes("ajuda") || nameLower.includes("atend")) {
      return [
        "Dúvida sobre meu cadastro 🔑",
        "Falar com Atendimento Humano 👥",
        "Relatar problema técnico ⚠️",
        "Ver planos disponíveis 📊"
      ];
    }
    if (nameLower.includes("venda") || nameLower.includes("comercial") || nameLower.includes("preco") || nameLower.includes("produto")) {
      return [
        "Garantir cupom de desconto 🎟️",
        "Quais as formas de pagamento? 💳",
        "Falar com um Vendedor 👥",
        "Ver ofertas especiais 🏷️"
      ];
    }
    return [
      "Quero saber mais sobre os serviços 🌟",
      "Gostaria de solicitar um Orçamento 📊",
      "Qual o horário de funcionamento? 🕒",
      "Falar com equipe de atendimento 👤"
    ];
  }, [selectedEmbedTemplateId, templates]);

  // Extracted Data indicators state
  const [chatExtractedData, setChatExtractedData] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    description?: string;
  }>({});
  const [chatHasCompleteBasicInfo, setChatHasCompleteBasicInfo] = useState(false);
  const [chatLeadSaved, setChatLeadSaved] = useState(false);
  const [chatSavedLeadId, setChatSavedLeadId] = useState("");

  const handleResetChatbot = () => {
    const freshConvId = `conv-${Date.now()}`;
    setChatConversationId(freshConvId);
    setChatMessages([
      {
        id: "msg-init",
        sender: "bot",
        text: chatbotWelcomeMsg || "Olá! Como posso te ajudar hoje? Para começarmos, qual o seu nome completo?",
        timestamp: new Date()
      }
    ]);
    setChatInputText("");
    resetTextareaHeights();
    setChatExtractedData({});
    setChatHasCompleteBasicInfo(false);
    setChatLeadSaved(false);
    setChatSavedLeadId("");
  };

  useEffect(() => {
    if (activeTab === "embed" && embedTabSubMode === "chatbot") {
      handleResetChatbot();
    }
  }, [selectedEmbedTemplateId, embedTabSubMode, chatbotWelcomeMsg, activeTab]);

  const sendUserMessage = async (userText: string) => {
    if (!userText.trim() || chatIsTyping) return;

    // Append user message immediately
    const userMsgId = `msg-user-${Date.now()}`;
    const newUserMsg = {
      id: userMsgId,
      sender: "user" as const,
      text: userText,
      timestamp: new Date()
    };
    
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setChatIsTyping(true);

    try {
      // Call server API route
      const response = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: updatedMessages.map(m => ({ sender: m.sender, text: m.text })),
          templateId: selectedEmbedTemplateId || templates[0]?.id || "conserto-em-casa",
          conversationId: chatConversationId,
          extractedState: chatExtractedData,
          toneOfVoice: chatbotToneOfVoice,
          personaDescription: chatbotPersonaDescription,
          systemRules: chatbotSystemRules
        })
      });

      if (!response.ok) {
        throw new Error("Falha ao comunicar com o Chatbot");
      }

      const resData = await response.json();
      
      // Update extracted values and replies
      if (resData.extractedData) {
        setChatExtractedData(resData.extractedData);
      }
      if (resData.hasCompleteBasicInfo) {
        setChatHasCompleteBasicInfo(true);
      }
      if (resData.leadSaved) {
        setChatLeadSaved(true);
        setChatSavedLeadId(resData.leadId);
        // Refresh leads list so the CRM updates instantly!
        loadData(true);
      }

      // Add typing delay feel
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-bot-${Date.now()}`,
            sender: "bot" as const,
            text: resData.reply || "Desculpe, não consegui processar essa informação.",
            timestamp: new Date()
          }
        ]);
        setChatIsTyping(false);
      }, chatbotResponseDelay);

    } catch (error) {
      console.error("Chatbot Error:", error);
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-bot-err-${Date.now()}`,
            sender: "bot" as const,
            text: "Ocorreu um erro de conexão temporário. Por favor, digite novamente ou tente resetar nosso chat.",
            timestamp: new Date()
          }
        ]);
        setChatIsTyping(false);
      }, chatbotResponseDelay);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || chatIsTyping) return;
    const userText = chatInputText.trim();
    setChatInputText("");
    resetTextareaHeights();
    await sendUserMessage(userText);
  };

  useEffect(() => {
    // Dynamically retrieve base host for the embed script
    setApiHost(window.location.origin);

    // Check for 'review' and 'token' in query string
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("p") || urlParams.get("token");
    const reviewId = urlParams.get("review");

    if (reviewId && tokenParam) {
      setActiveReviewLeadId(reviewId);
      setActiveReviewToken(tokenParam);
    } else if (tokenParam) {
      setActiveProfessionalToken(tokenParam);
    }
  }, []);

  // Effect to load public review details
  useEffect(() => {
    if (activeReviewLeadId && activeReviewToken) {
      setReviewLoading(true);
      setReviewError(null);
      fetch(`/api/review/${activeReviewLeadId}?token=${activeReviewToken}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            setReviewError(data.error || "O link de avaliação é inválido ou já expirou.");
          } else {
            setReviewInfo(data);
          }
        })
        .catch((err) => {
          setReviewError("Erro de comunicação com o servidor. Verifique sua conexão.");
        })
        .finally(() => {
          setReviewLoading(false);
        });
    }
  }, [activeReviewLeadId, activeReviewToken]);

  // Handler to submit public client review
  const handleSubmitReview = async () => {
    if (!activeReviewLeadId || !activeReviewToken) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/review/${activeReviewLeadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeReviewToken,
          rating: ratingValue,
          comment: reviewComment,
          clientName: reviewClientName
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Ocorreu um erro ao enviar sua avaliação.");
      } else {
        setReviewSubmitted(true);
      }
    } catch (err) {
      setReviewError("Erro ao enviar a avaliação. Verifique sua conexão.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Effect to load public forward details whenever activeProfessionalToken changes
  useEffect(() => {
    if (activeProfessionalToken) {
      setProfPortalPhase("loading");
      setProfPortalError(null);
      fetch(`/api/public/forward/${activeProfessionalToken}`, {
        headers: {
          "x-session-token": localStorage.getItem("prof_session_token") || ""
        }
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            setProfPortalError(data.error || "Este link de serviço é inválido ou já expirou.");
            setProfPortalPhase("error");
          } else {
            setProfPortalLeadOverview(data.leadOverview);
            setProfPortalProfessional(data.professional);
            setProfPortalExpiresAt(data.expiresAt);
            if (data.authenticated) {
              setProfPortalLead(data.lead);
              if (data.professional && data.professional.phone) {
                setProfPortalPhoneInput(data.professional.phone);
              }
              setProfPortalPhase("service_detail");
            } else {
              if (data.isDifferentProfessional) {
                setProfPortalError("Você está autenticado com outra conta profissional. Por favor, insira o usuário correto para esta oportunidade.");
              }
              setProfPortalPhase("auth");
            }
          }
        })
        .catch((err) => {
          console.error("Error loading forward info:", err);
          setProfPortalError("Não foi possível conectar ao servidor.");
          setProfPortalPhase("error");
        });
    }
  }, [activeProfessionalToken]);

  // Auth gate submit (username/password login with remember choice)
  const handleProfPortalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfessionalToken) return;

    if (!profPortalUsernameInput.trim() || !profPortalPasswordInput.trim()) {
      setProfPortalError("Por favor, preencha o seu nome de usuário e senha.");
      return;
    }

    setProfPortalError(null);
    try {
      const res = await fetch(`/api/public/forward/${activeProfessionalToken}/auth`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-session-token": localStorage.getItem("prof_session_token") || ""
        },
        body: JSON.stringify({ 
          username: profPortalUsernameInput.trim(), 
          password: profPortalPasswordInput,
          rememberMe: profPortalRememberSession === "remember"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setProfPortalError(data.error || "Acesso negado. Credenciais inválidas.");
      } else {
        if (data.sessionToken) {
          localStorage.setItem("prof_session_token", data.sessionToken);
        }
        setProfPortalLead(data.lead);
        setProfPortalProfessional(data.professional);
        if (data.professional && data.professional.phone) {
          setProfPortalPhoneInput(data.professional.phone);
        }
        setProfPortalPhase("service_detail");
      }
    } catch (err) {
      setProfPortalError("Erro de comunicação com o servidor.");
    }
  };

  // Professional username & password login submit handler
  const handleProfessionalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfLoginErr("");
    if (!profLoginUser.trim() || !profLoginPass.trim()) {
      setProfLoginErr("Por favor, preencha o usuário e a senha.");
      return;
    }

    try {
      const res = await fetch("/api/public/professional/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profLoginUser.trim(),
          password: profLoginPass,
          rememberMe: true // default remember when logging in inside the panel
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setProfLoginErr(data.error || "Usuário ou senha inválidos.");
      } else {
        if (data.sessionToken) {
          localStorage.setItem("prof_session_token", data.sessionToken);
        }
        setLoggedInProf(data.professional);
        setShowProfLoginScreen(false);
        setProfPortalActiveTab("leads");
        setProfPortalSelectedLead(null);
        setProfLoginUser("");
        setProfLoginPass("");
        alert(`Bem-vindo, ${data.professional.name}!`);
      }
    } catch (err) {
      console.error(err);
      setProfLoginErr("Erro de conexão.");
    }
  };

  // Accept Call API trigger
  const handleProfPortalAccept = async () => {
    if (!activeProfessionalToken) return;

    if (!profPortalEstimatedValue.trim()) {
      setProfPortalError("Por favor, preencha o valor estimado do serviço.");
      return;
    }

    const val = parseFloat(profPortalEstimatedValue);
    if (isNaN(val) || val < 0) {
      setProfPortalError("Por favor, insira um valor estimado válido (maior ou igual a zero).");
      return;
    }

    setProfPortalError(null);
    try {
      const res = await fetch(`/api/public/forward/${activeProfessionalToken}/accept`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-session-token": localStorage.getItem("prof_session_token") || ""
        },
        body: JSON.stringify({ 
          estimatedValue: val
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setProfPortalError(data.error || "Erro ao aceitar.");
      } else {
        setProfPortalLead(data.lead);
        setProfPortalPhase("success");
        loadData(true);
      }
    } catch (err) {
      setProfPortalError("Erro ao processar aceitação.");
    }
  };

  // Recuse Call API trigger
  const handleProfPortalRecuse = async () => {
    if (!activeProfessionalToken) return;

    setProfPortalError(null);
    try {
      const res = await fetch(`/api/public/forward/${activeProfessionalToken}/recuse`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-session-token": localStorage.getItem("prof_session_token") || ""
        },
        body: JSON.stringify({
          reason: profPortalRecuseReason
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setProfPortalError(data.error || "Erro ao recusar.");
      } else {
        setProfPortalPhase("recused");
        setShowRecuseModal(false);
        loadData(true);
      }
    } catch (err) {
      setProfPortalError("Erro ao processar recusa.");
    }
  };

  // Operator submits assignment/forward
  const submitLeadForward = async (leadId: string) => {
    if (!forwardingProfessionalId) {
      alert("Por favor, selecione um profissional parceiro.");
      return;
    }
    setSubmittingForward(true);
    setForwardSuccessResult(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: forwardingProfessionalId,
          location: forwardingLocation,
          validityHours: forwardingValidityHours,
          templateId: forwardingTemplateId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Falha ao encaminhar lead.");
      } else {
        setForwardSuccessResult({
          lead: data.lead,
          token: data.token,
          whatsappMessageSimulated: data.whatsappMessageSimulated
        });
        // Select updated lead in details sidebar
        setSelectedLeadForDetail(data.lead);
        loadData(true);
        setShowForwardModalFromKanban(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao encaminhar chamado.");
    } finally {
      setSubmittingForward(false);
    }
  };

  // Operator acknowledges acceptance alert
  const acknowledgeLeadAcceptance = async (leadId: string) => {
    try {
      await fetch(`/api/leads/${leadId}/acknowledge-acceptance`, { method: "POST" });
      loadData(true);
    } catch (err) {
      console.error("Error acknowledging acceptance:", err);
    }
  };

  // Fetch all initial data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [leadsRes, templatesRes, configRes, professionalsRes, wtRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/templates"),
        fetch("/api/alerts/config"),
        fetch("/api/professionals"),
        fetch("/api/whatsapp-templates")
      ]);

      const leadsData = await leadsRes.json();
      const templatesData = await templatesRes.json();
      const configData = await configRes.json();
      const professionalsData = await professionalsRes.json();
      const wtData = await wtRes.json();

      // Check for any NEW unnotified leads to trigger sound/visual alerts
      setLeads((prevLeads) => {
        if (prevLeads.length > 0 && leadsData.length > prevLeads.length) {
          const diff = leadsData.filter((newL: Lead) => !prevLeads.some((oldL) => oldL.id === newL.id));
          if (diff.length > 0) {
            const newest = diff[0];
            triggerLiveAlert(newest);
          }
        }
        return leadsData;
      });

      setSelectedLeadForDetail((prev) => {
        if (!prev) return prev;
        const fresh = leadsData.find((l: Lead) => l.id === prev.id);
        return fresh || prev;
      });
      setTemplates(templatesData);
      setAlertConfig(configData);
      setProfessionals(professionalsData);
      setWhatsappTemplates(wtData);

      // Pre-select default forwarding template
      if (wtData.length > 0) {
        setForwardingTemplateId((prev) => {
          if (prev) return prev;
          const def = wtData.find((w: any) => w.isDefault) || wtData[0];
          return def?.id || "";
        });
      }

      // Pre-select default template for simulation and embed widget builder
      if (templatesData.length > 0) {
        setSelectedEmbedTemplateId((prev) => prev || templatesData[0].id);
        setSimTemplateId((prev) => prev || templatesData[0].id);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading mock database data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up regular pooling of 4 seconds to simulate real-time webhook arrivals
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedLeadForDetail) {
      setForwardingLocation(selectedLeadForDetail.address || selectedLeadForDetail.location || "");
      
      // Auto-select recommended professional (same channel/templateId) if exists, otherwise first available
      const recommendedProf = professionals.find((p) => p.templateId === selectedLeadForDetail.templateId);
      if (recommendedProf) {
        setForwardingProfessionalId(recommendedProf.id);
      } else if (professionals.length > 0) {
        setForwardingProfessionalId(professionals[0].id);
      } else {
        setForwardingProfessionalId("");
      }

      // Auto-select template
      if (whatsappTemplates.length > 0) {
        const def = whatsappTemplates.find((w) => w.isDefault) || whatsappTemplates[0];
        setForwardingTemplateId(def.id);
      }

      setForwardSuccessResult(null);
      markLeadAsViewed(selectedLeadForDetail.id);
    } else {
      setForwardingLocation("");
      setForwardingProfessionalId("");
      setForwardSuccessResult(null);
    }
  }, [selectedLeadForDetail, professionals, whatsappTemplates]);

  // Handle playing alert sound and toast
  const triggerLiveAlert = (lead: Lead) => {
    setRecentLiveLead(lead);
    setShowRecentToast(true);

    if (alertConfig.soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Play sweet responsive ding beep notification
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.24); // D6
        
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch (e) {
        console.warn("Audio Context beep block from browser permissions.", e);
      }
    }

    // Standard HTML5 Notification API if active
    if (alertConfig.osNotificationEnabled && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`Lead: ${lead.name}`, {
          body: `Novo lead capturado no template ${lead.templateName}. Tel: ${lead.phone}`,
          tag: "new-lead"
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(`Lead: ${lead.name}`, {
              body: `Novo lead de ${lead.templateName}`,
            });
          }
        });
      }
    }
  };

  // Change lead status
  const updateLeadStatus = async (id: string, newStatus: Lead["status"]) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        const updated = await response.json();
        setLeads(leads.map(l => l.id === id ? updated : l));
        if (selectedLeadForDetail?.id === id) {
          setSelectedLeadForDetail(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save follow-up notes of lead
  const updateLeadNotes = async (id: string, notes: string) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (response.ok) {
        const updated = await response.json();
        setLeads(leads.map(l => l.id === id ? updated : l));
        if (selectedLeadForDetail?.id === id) {
          setSelectedLeadForDetail(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete lead
  const deleteLead = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Lead",
      message: "Tem certeza que deseja excluir permanentemente este lead de suas listas?",
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/leads/${id}`, { method: "DELETE" });
          if (response.ok) {
            setLeads(prevLeads => prevLeads.filter(l => l.id !== id));
            setSelectedLeadIds(prev => prev.filter(selectedId => selectedId !== id));
            setSelectedLeadForDetail(null);
          }
        } catch (err) {
          console.error(err);
        }
        setConfirmModal(null);
      }
    });
  };

  // Batch delete leads
  const deleteMultipleLeads = (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Excluir Vários Leads",
      message: `Tem certeza que deseja excluir permanentemente os ${ids.length} leads selecionados?`,
      confirmText: `Sim, Excluir ${ids.length} Leads`,
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/leads/batch-delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids })
          });
          if (response.ok) {
            setLeads(prevLeads => prevLeads.filter(l => !ids.includes(l.id)));
            setSelectedLeadIds([]);
            if (selectedLeadForDetail && ids.includes(selectedLeadForDetail.id)) {
              setSelectedLeadForDetail(null);
            }
          }
        } catch (err) {
          console.error(err);
        }
        setConfirmModal(null);
      }
    });
  };

  // Toggle template active status
  const toggleTemplateActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentStatus })
      });
      if (response.ok) {
        const updated = await response.json();
        setTemplates(templates.map(t => t.id === id ? updated : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateChannelModal = () => {
    setEditingChannel(null);
    setNewTemplateName("");
    setNewTemplateUrl("");
    setShowCreateTemplateModal(true);
  };

  const openEditChannelModal = (theme: Template) => {
    setEditingChannel(theme);
    setNewTemplateName(theme.name);
    setNewTemplateUrl(theme.siteUrl);
    setShowCreateTemplateModal(true);
  };

  // Create or update template
  const handleCreateOrUpdateChannelTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateUrl.trim()) {
      triggerAppAlert("Preencha todos os campos básicos.", "error");
      return;
    }

    try {
      const url = editingChannel ? `/api/templates/${editingChannel.id}` : "/api/templates";
      const method = editingChannel ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName,
          siteUrl: newTemplateUrl,
          ...(editingChannel ? {} : { fields: newTemplateFields })
        })
      });
      if (response.ok) {
        const saved = await response.json();
        if (editingChannel) {
          setTemplates(templates.map(t => t.id === editingChannel.id ? saved : t));
          triggerAppAlert("Canal de captura atualizado com sucesso!", "success");
        } else {
          setTemplates([...templates, saved]);
          triggerAppAlert("Canal de captura adicionado com sucesso!", "success");
        }
        setShowCreateTemplateModal(false);
        setEditingChannel(null);
        setNewTemplateName("");
        setNewTemplateUrl("");
      } else {
        const errData = await response.json();
        triggerAppAlert(errData.error || "Erro ao salvar canal de captura.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerAppAlert("Erro de rede ao salvar canal de captura.", "error");
    }
  };

  const fetchEvolutionStatus = async (silent = false) => {
    if (!silent) setLoadingEvolution(true);
    try {
      const res = await fetch("/api/evolution/status");
      if (res.ok) {
        const data = await res.json();
        setEvolutionStatus({
          connected: !!data.connected,
          exists: !!data.exists,
          qrcode: data.qrcode || "",
          jid: data.jid || "",
          instanceName: data.instanceName || "crm",
          error: data.error || ""
        });
      } else {
        const errText = await res.text();
        setEvolutionStatus({
          connected: false,
          exists: false,
          qrcode: "",
          jid: "",
          instanceName: "crm",
          error: `Erro HTTP ${res.status}: ${errText}`
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch Evolution status:", err);
      setEvolutionStatus({
        connected: false,
        exists: false,
        qrcode: "",
        jid: "",
        instanceName: "crm",
        error: err.message || "Erro de conexão ao obter status da Evolution"
      });
    } finally {
      if (!silent) setLoadingEvolution(false);
    }
  };

  const triggerEvolutionConnect = async () => {
    setTriggeringEvolutionConnect(true);
    try {
      const res = await fetch("/api/evolution/connect", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setEvolutionStatus({
          connected: !!data.connected,
          exists: true,
          qrcode: data.qrcode || "",
          jid: data.jid || "",
          instanceName: "crm",
          error: data.error || ""
        });
      } else {
        const errText = await res.text();
        setEvolutionStatus({
          connected: false,
          exists: false,
          qrcode: "",
          jid: "",
          instanceName: "crm",
          error: `Erro HTTP ${res.status}: ${errText}`
        });
      }
    } catch (err: any) {
      console.error("Failed to connect Evolution:", err);
      setEvolutionStatus({
        connected: false,
        exists: false,
        qrcode: "",
        jid: "",
        instanceName: "crm",
        error: err.message || "Falha ao requisitar sessão de conexão"
      });
    } finally {
      setTriggeringEvolutionConnect(false);
    }
  };

  // Poll Evolution status when in Notifications tab
  useEffect(() => {
    if (activeTab === "notifications") {
      fetchEvolutionStatus();
      const interval = setInterval(() => {
        fetchEvolutionStatus(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Save alert configuration
  const handleSaveAlertConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/alerts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertConfig)
      });
      if (response.ok) {
        const updated = await response.json();
        setAlertConfig(updated);
        alert("Configurações de notificações atualizadas com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manual Sandbox Live Simulator Submit (Simulates Webhook call from embed code)
  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log the address and other fields to help debug/verify values
    console.log("[SIMULATION FORM SUBMIT] Adress field (#sim-input-address) value:", simAddress);
    console.log("[SIMULATION FORM SUBMIT] City field (#sim-input-city) value:", simCity);
    console.log("[SIMULATION FORM SUBMIT] Other fields:", { name: simName, phone: simPhone, description: simDescription, templateId: simTemplateId });

    if (!simName.trim() || !simPhone.trim() || !simAddress.trim() || !simCity.trim() || !simDescription.trim()) {
      alert("Por favor preencha todos os campos obrigatórios do formulário.");
      return;
    }

    setSimulating(true);
    setSimSuccess(false);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: simName.trim(),
          phone: simPhone.trim(),
          address: simAddress.trim(),
          city: simCity.trim(),
          description: simDescription.trim(),
          templateId: simTemplateId || templates[0]?.id,
          referrer: `https://test-sandbox.leadcapture.io/simulador-embed-test`,
          browserInfo: "Simulador Interno Dashboard (v2.4)"
        })
      });

      if (response.ok) {
        setSimSuccess(true);
        // Clear simulator fields
        setSimName("");
        setSimPhone("");
        setSimAddress("");
        setSimCity("");
        setSimDescription("");
        
        // Reload dashboard instantly
        loadData(true);
      } else {
        const errData = await response.json();
        alert(`Erro na simulação: ${errData.error || "A captação falhou."}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  // Reset database state to mock initial
  const handleResetData = async () => {
    if (!confirm("Isso redefinirá todos os leads e templates do seu SaaS para a demonstração limpa padrão de fábrica. Continuar?")) return;
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (response.ok) {
        alert("Banco de dados resetado com sucesso!");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // For Professionals CRUD and financial tracking:
  const handleOpenAddProfessionalModal = () => {
    setEditingProfessional(null);
    setProfName("");
    setProfSpecialty("");
    setProfPhone("");
    setProfEmail("");
    setProfPhotoUrl("");
    setProfTemplateId(templates[0]?.id || "");
    setProfUsername("");
    setProfPassword("");
    setShowAddEditProfModal(true);
  };

  const handleOpenEditProfessionalModal = (prof: Professional) => {
    setEditingProfessional(prof);
    setProfName(prof.name);
    setProfSpecialty(prof.specialty);
    setProfPhone(prof.phone);
    setProfEmail(prof.email);
    setProfPhotoUrl(prof.photoUrl);
    setProfTemplateId(prof.templateId);
    setProfUsername(prof.username || "");
    setProfPassword(prof.password || "");
    setShowAddEditProfModal(true);
  };

  const handleCreateOrUpdateProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profName.trim() || !profSpecialty.trim()) {
      triggerAppAlert("Por favor, preencha Nome Completo e Especialidade.", "error");
      return;
    }

    const payload = {
      name: profName,
      specialty: profSpecialty,
      phone: profPhone,
      email: profEmail,
      photoUrl: profPhotoUrl || undefined,
      templateId: profTemplateId,
      username: profUsername.trim(),
      password: profPassword
    };

    try {
      const url = editingProfessional 
        ? `/api/professionals/${editingProfessional.id}` 
        : "/api/professionals";
      
      const method = editingProfessional ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        loadData(true);
        setShowAddEditProfModal(false);
        triggerAppAlert(
          editingProfessional ? "Cadastro de profissional atualizado!" : "Profissional adicionado com sucesso!",
          "success"
        );
      } else {
        const err = await res.json();
        triggerAppAlert(`Erro: ${err.error || "Não foi possível salvar profissional"}`, "error");
      }
    } catch (err) {
      console.error("Error saving professional:", err);
      triggerAppAlert("Erro ao salvar cadastro do profissional.", "error");
    }
  };

  const executeDeleteProfessional = async (id: string) => {
    try {
      const res = await fetch(`/api/professionals/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedProfessionalId === id) {
          setSelectedProfessionalId(null);
        }
        loadData(true);
        triggerAppAlert("Profissional removido com sucesso!", "success");
      } else {
        triggerAppAlert("Não foi possível excluir o profissional no momento.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerAppAlert("Erro de rede ao remover profissional.", "error");
    }
  };

  const handleDeleteProfessional = (id: string) => {
    triggerAppConfirm(
      "Tem certeza de que deseja remover este profissional? Todos os seus registros financeiros vinculados serão deletados.",
      () => {
        executeDeleteProfessional(id);
      },
      "Confirmar Exclusão"
    );
  };

  // --- START OF WHATSAPP TEMPLATE HELPER SUBMITTERS ---
  const handleCreateOrUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim() || !tmplContent.trim()) {
      alert("Nome e conteúdo são obrigatórios.");
      return;
    }
    setSavingTmpl(true);
    try {
      const url = editingTmpl ? `/api/whatsapp-templates/${editingTmpl.id}` : "/api/whatsapp-templates";
      const method = editingTmpl ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tmplName,
          content: tmplContent,
          isDefault: tmplIsDefault
        })
      });
      if (!res.ok) {
        const d = await res.json();
        triggerAppAlert(d.error || "Erro ao salvar template.", "error");
      } else {
        setShowAddEditTmplModal(false);
        setEditingTmpl(null);
        setTmplName("");
        setTmplContent("");
        setTmplIsDefault(false);
        await loadData(true);
        triggerAppAlert("Template de mensagem salvo com sucesso!", "success");
      }
    } catch (err) {
      console.error(err);
      triggerAppAlert("Erro de conexão ao salvar modelo.", "error");
    } finally {
      setSavingTmpl(false);
    }
  };

  const executeDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/whatsapp-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData(true);
        triggerAppAlert("Template de mensagem excluído com sucesso!", "success");
      } else {
        triggerAppAlert("Não foi possível excluir o modelo.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerAppAlert("Erro ao excluir modelo de mensagem.", "error");
    }
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    triggerAppConfirm(
      `Tem certeza que deseja excluir o modelo "${name}"?`,
      () => {
        executeDeleteTemplate(id);
      },
      "Confirmar Exclusão"
    );
  };

  const executeDeleteChannelTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData(true);
        triggerAppAlert("Canal de captura excluído com sucesso!", "success");
      } else {
        const errData = await res.json();
        triggerAppAlert(errData.error || "Não foi possível excluir o canal.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerAppAlert("Erro de rede ao excluir canal de captura.", "error");
    }
  };

  const handleDeleteChannelTemplate = (id: string, name: string) => {
    triggerAppConfirm(
      `Tem certeza que deseja excluir o canal de captura "${name}"? Todos os leads deste canal de origem serão mantidos.`,
      () => {
        executeDeleteChannelTemplate(id);
      },
      "Confirmar Exclusão"
    );
  };

  const handleSetDefaultTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/whatsapp-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true })
      });
      if (res.ok) {
        await loadData(true);
      } else {
        alert("Erro ao definir como padrão.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditTmplModal = (tmpl: WhatsAppTemplate) => {
    setEditingTmpl(tmpl);
    setTmplName(tmpl.name);
    setTmplContent(tmpl.content);
    setTmplIsDefault(tmpl.isDefault);
    setShowAddEditTmplModal(true);
  };

  const openCreateTmplModal = () => {
    setEditingTmpl(null);
    setTmplName("");
    setTmplContent("Olá, *{nome_profissional}*! Nova captação de serviço disponível [LeadCapture]:\n👤 *Cliente:* {nome_cliente}\n📞 *WhatsApp:* {fone_cliente}\n📍 *Local de Atendimento:* {endereco_cliente}\n🛠️ *Serviço:* {nome_servico}\n📝 *Detalhes:* {descricao_servico}\n\n👉 Acesse o link seguro para aceitar o chamado:\n🔗 {link_unico}\n\n⚠️ Este link expira em {validade_horas} horas.");
    setTmplIsDefault(false);
    setShowAddEditTmplModal(true);
  };
  // --- END OF WHATSAPP TEMPLATE HELPER SUBMITTERS ---

  const handleAddProfitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfessionalId) return;
    if (!recordDescription.trim() || !recordValue.trim()) {
      alert("Favor inserir descrição e valor de lucro.");
      return;
    }

    setAddingProfitRecord(true);
    try {
      const res = await fetch(`/api/professionals/${selectedProfessionalId}/profit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: recordDate || new Date().toISOString().split("T")[0],
          description: recordDescription,
          value: parseFloat(recordValue)
        })
      });

      if (res.ok) {
        loadData(true);
        setRecordDescription("");
        setRecordValue("");
        setRecordDate("");
        alert("Novo lucro registrado!");
      } else {
        alert("Erro ao adicionar lucro.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingProfitRecord(false);
    }
  };

  // Filter logic
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // search
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        lead.name.toLowerCase().includes(query) ||
        lead.phone.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        (lead.notes && lead.notes.toLowerCase().includes(query));

      // template filter
      const matchesTemplate = selectedTemplateFilter === "all" || lead.templateId === selectedTemplateFilter;

      // Status filter
      const matchesStatus = selectedStatusFilter === "all" || lead.status === selectedStatusFilter;

      return matchesSearch && matchesTemplate && matchesStatus;
    });
  }, [leads, searchTerm, selectedTemplateFilter, selectedStatusFilter]);

  // Compute metrics statistics dynamically based on current leads state
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const thisMonthPrefix = new Date().toISOString().substring(0, 7); // YYYY-MM

    const todayLeadsCount = leads.filter(l => l.createdAt.startsWith(today)).length;
    const thisMonthLeadsCount = leads.filter(l => l.createdAt.startsWith(thisMonthPrefix)).length;
    const activeTemplatesCount = templates.filter(t => t.active).length;

    // Rate of answered leads
    const answeredCheckedLeads = leads.filter(l => l.status === "Em Atendimento" || l.status === "Concluído").length;
    const responseRate = leads.length > 0 ? Math.round((answeredCheckedLeads / leads.length) * 100) : 100;

    return {
      todayLeads: todayLeadsCount,
      monthLeads: thisMonthLeadsCount,
      activeTemplatesCount,
      responseRate
    };
  }, [leads, templates]);

  // Template lists stats for dynamic sidebar indicators
  const templatesPerformance = useMemo(() => {
    return templates.map(t => {
      const count = leads.filter(l => l.templateId === t.id).length;
      return {
        ...t,
        count
      };
    }).sort((a,b) => b.count - a.count);
  }, [templates, leads]);

  // Compute distribution of incoming leads by template source over the last 7 days for the Recharts bar chart
  const last7DaysChartData = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Initialize counts for all known templates
    const counts: Record<string, number> = {};
    templates.forEach(t => {
      counts[t.name] = 0;
    });

    // Populate from leads created in the active cutoff period
    leads.forEach(l => {
      const leadDate = new Date(l.createdAt);
      if (leadDate >= sevenDaysAgo) {
        const name = l.templateName || "Outros";
        counts[name] = (counts[name] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, leadsCount]) => ({
      name,
      leads: leadsCount,
    }));
  }, [leads, templates]);

  // Find selected professional details
  const selectedProf = useMemo(() => {
    return professionals.find(p => p.id === selectedProfessionalId) || null;
  }, [professionals, selectedProfessionalId]);

  // Lead filtering for the active professional
  const profLeads = useMemo(() => {
    if (!selectedProf) return [];
    return leads.filter(l => l.templateId === selectedProf.templateId);
  }, [leads, selectedProf]);

  // Metric calculation: Total leads, converted leads, conversion rate
  const profMetrics = useMemo(() => {
    const total = profLeads.length;
    const converted = profLeads.filter(l => l.status === "Concluído").length;
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return { total, converted, rate };
  }, [profLeads]);

  // Referral / Campaign Source distribution helper for selected details
  const sourceDistributionData = useMemo(() => {
    let organic = 0;
    let paid = 0;
    let referral = 0;

    profLeads.forEach(l => {
      const ref = (l.metadata?.referrer || "").toLowerCase();
      if (ref.includes("ads") || ref.includes("campanha") || ref.includes("pago") || ref.includes("promo")) {
        paid++;
      } else if (ref.includes("google") || ref.includes("search") || ref.includes("facebook") || ref.includes("instagram") || ref.includes("org")) {
        organic++;
      } else {
        referral++;
      }
    });

    // Fallbacks if no leads yet
    if (profLeads.length === 0) {
      return [
        { name: "Orgânico", value: 3 },
        { name: "Tráfego Pago", value: 2 },
        { name: "Indicação", value: 1 },
      ];
    }

    return [
      { name: "Orgânico", value: organic },
      { name: "Tráfego Pago", value: paid },
      { name: "Indicação", value: referral },
    ].filter(s => s.value > 0);
  }, [profLeads]);

  // Chronological monthly/daily received leads for active professional
  const profReceivedLeadsTimeline = useMemo(() => {
    // Generate dates for the last 7 days
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      days[str] = 0;
    }

    profLeads.forEach(l => {
      const str = new Date(l.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      if (days[str] !== undefined) {
        days[str]++;
      }
    });

    return Object.entries(days).map(([day, count]) => ({
      name: day,
      leads: count
    }));
  }, [profLeads]);

  // Generate dynamic Embed HTML snippet
  const embedCodeSnippet = useMemo(() => {
    const targetId = selectedEmbedTemplateId || templates[0]?.id || "conserto-em-casa";
    return `<script 
  src="${apiHost || "https://leadcapture.io"}/embed.js" 
  data-template="${targetId}"
  data-title="${embedWidgetTitle}"
  data-placeholder-name="Qual o seu nome?"
  data-placeholder-phone="WhatsApp com DDD"
  data-button-text="${embedBtnText}"
  data-button-color="${embedBtnColor}"
  data-bg-color="#ffffff"
></script>`;
  }, [selectedEmbedTemplateId, templates, embedWidgetTitle, embedBtnText, embedBtnColor, apiHost]);

  // Copy code utility
  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // CSV Generator/Exporter based on current filtered table list
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      alert("Nenhum lead encontrado para exportar.");
      return;
    }

    // Header
    const headers = ["ID", "Nome", "WhatsApp/Telefone", "Endereço", "Cidade", "Descrição", "E-mail", "Data de Entrada", "Template de Origem", "Status", "Anotações / Histórico de Conversa", "Referência da Campanha (URL)", "Dispositivo do Lead"];
    
    // Rows
    const rows = filteredLeads.map(l => [
      `"${l.id}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.phone.replace(/"/g, '""')}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${(l.city || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.email.replace(/"/g, '""')}"`,
      `"${l.createdAt}"`,
      `"${l.templateName.replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      `"${(l.metadata?.referrer || '').replace(/"/g, '""')}"`,
      `"${(l.metadata?.browser || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Leads_LeadCapture_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manual Trigger to simulate a dummy external capture
  const handleQuickAddRandomDemoLead = async () => {
    const firstNames = ["Camila", "Bruno", "Patricia", "Eduardo", "Helena", "Guilherme", "Renata", "Arthur"];
    const lastNames = ["Almeida", "Nascimento", "Barbosa", "Cardoso", "Rezende", "Frota", "Vargas", "Teixeira"];
    const emails = ["camila.nasc@uol.com.br", "bruno@gmail.com", "paty.barbosa@outlook.com", "edu.cardoso@yahoo.com", "contato.helena@vargas.com.br"];
    
    const locationsByCity = [
      { city: "São Paulo", address: "Av. Paulista, 2100, Bela Vista", phone: "(11) 98112-2200" },
      { city: "Rio de Janeiro", address: "Av. Atlântica, 1500, Copacabana", phone: "(21) 97415-3040" },
      { city: "Belo Horizonte", address: "Av. Afonso Pena, 1050, Centro", phone: "(31) 98877-6655" },
      { city: "Campinas", address: "Rua Maria Monteiro, 450, Cambuí", phone: "(19) 97116-2030" },
      { city: "Curitiba", address: "Rua XV de Novembro, 800, Centro", phone: "(41) 99341-2099" },
      { city: "Porto Alegre", address: "Rua dos Andradas, 1220, Centro Histórico", phone: "(51) 99188-7711" },
      { city: "Salvador", address: "Av. Sete de Setembro, 2050, Barra", phone: "(71) 98222-3030" },
      { city: "Brasília", address: "SCLS Quadra 302, Bloco B, Asa Sul", phone: "(61) 99111-4455" }
    ];

    const descriptions = ["Preciso de instalação rápida de ar condicionado residencial.", "Solicito reparo de vazamento na pia do banheiro.", "Gostaria de agendar ensaio de newborn com urgência.", "Preciso de assessoria jurídica tributária para a minha empresa.", "Orçamento para reforma elétrica em apartamento antigo."];

    const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const randomEmail = emails[Math.floor(Math.random() * emails.length)];
    const loc = locationsByCity[Math.floor(Math.random() * locationsByCity.length)];
    const randomPhone = loc.phone;
    const randomAddress = loc.address;
    const randomCity = loc.city;
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)] || { id: "conserto-em-casa", name: "Conserto em Casa" };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: randomName,
          phone: randomPhone,
          email: randomEmail,
          address: randomAddress,
          city: randomCity,
          description: randomDescription,
          templateId: randomTemplate.id,
          referrer: `https://${randomTemplate.id}.co/lead-prospect-landing`,
          browserInfo: "Simulador Automático de webhook"
        })
      });
      if (response.ok) {
        loadData(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // PROFESSIONAL PORTAL INTERCEPT
  if (showProfLoginScreen) {
    return (
      <div className="bg-gradient-to-b from-[#0b0c1e] via-[#050614] to-[#020309] min-h-screen text-slate-100 flex flex-col font-sans justify-center items-center py-6 px-4 relative select-none">
        {/* Ambient Blur */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0e1022]/95 border border-indigo-950/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
              <Key className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white font-sans">Portal do Profissional</h2>
            <p className="text-xs text-slate-400">Entre com seu nome de usuário e de senha fornecidos pelo administrador.</p>
          </div>

          <form onSubmit={handleProfessionalLoginSubmit} className="space-y-4">
            {profLoginErr && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs py-2.5 px-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{profLoginErr}</span>
              </div>
            )}

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Nome de Usuário</label>
              <input
                type="text"
                required
                value={profLoginUser}
                onChange={(e) => setProfLoginUser(e.target.value)}
                placeholder="Ex: anderson.consultor"
                className="w-full bg-[#050614]/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors tracking-tight text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Senha Secreta</label>
              <input
                type="password"
                required
                value={profLoginPass}
                onChange={(e) => setProfLoginPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#050614]/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors tracking-tight text-slate-100 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg active:scale-[0.98] cursor-pointer"
            >
              Confirmar Credenciais e Entrar
            </button>
          </form>

          <div className="pt-2 border-t border-slate-850 text-center">
            <button
              type="button"
              onClick={() => {
                setShowProfLoginScreen(false);
                setProfLoginErr("");
              }}
              className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 font-semibold"
            >
              ← Painel Admin (Demonstração)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loggedInProf) {
    const targetLeads = leads.filter(l => l.templateId === loggedInProf.templateId);

    return (
      <div className="bg-[#050610] min-h-screen text-slate-100 flex flex-col font-sans select-none relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none" />
        
        {/* NAV BAR HEADER */}
        <header className="border-b border-[#141632] bg-[#090b1c]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-md relative">
          <div className="flex items-center gap-3">
            <img
              src={loggedInProf.photoUrl}
              alt={loggedInProf.name}
              className="w-9 h-9 rounded-full border border-indigo-500/30 object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${loggedInProf.name}`;
              }}
            />
            <div>
              <span className="font-bold text-slate-100 block text-xs">{loggedInProf.name}</span>
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide">{loggedInProf.specialty}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setLoggedInProf(null);
              setProfPortalSelectedLead(null);
              localStorage.removeItem("prof_session_token");
            }}
            className="text-xs bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 text-rose-300 font-semibold py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        </header>

        {/* SUBHEADER TABS */}
        <nav className="bg-[#070920] border-b border-[#12142e] px-4 py-2 flex items-center justify-start sm:justify-center gap-1.5 text-xs shrink-0 overflow-x-auto relative scrollbar-none">
          <button
            onClick={() => { setProfPortalActiveTab("leads"); setProfPortalSelectedLead(null); }}
            className={`px-3 py-1.5 rounded-lg font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              profPortalActiveTab === "leads" 
                ? "bg-indigo-600/15 text-[#818cf8] border border-indigo-500/20" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              <span className="hidden sm:inline">Oportunidades Disponíveis</span>
              <span className="inline sm:hidden">Oportunidades</span> ({targetLeads.length})
            </span>
          </button>
          
          <button
            onClick={() => { setProfPortalActiveTab("finances"); setProfPortalSelectedLead(null); }}
            className={`px-3 py-1.5 rounded-lg font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              profPortalActiveTab === "finances" 
                ? "bg-indigo-600/15 text-[#818cf8] border border-indigo-500/20" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>
              <span className="hidden sm:inline">Extrato Financeiro</span>
              <span className="inline sm:hidden">Financeiro</span>
            </span>
          </button>

          <button
            onClick={() => { setProfPortalActiveTab("profile"); setProfPortalSelectedLead(null); }}
            className={`px-3 py-1.5 rounded-lg font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              profPortalActiveTab === "profile" 
                ? "bg-indigo-600/15 text-[#818cf8] border border-indigo-500/20" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>
              <span className="hidden sm:inline">Meus Dados</span>
              <span className="inline sm:hidden font-sans">Meus Dados</span>
            </span>
          </button>
        </nav>

        {/* CONTAINER VIEW */}
        <main className="flex-1 w-full max-w-4xl mx-auto p-4 space-y-4 relative z-10">
          
          {profPortalActiveTab === "leads" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              
              {/* LEADS LIST PANEL */}
              <div className={`bg-[#0e1022]/90 border border-slate-800/60 rounded-2xl p-4 space-y-3 shadow-lg ${profPortalSelectedLead ? "hidden md:block" : "block"}`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                  <h3 className="font-bold text-xs text-slate-200 flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-indigo-400" />
                    <span>Seus Leads Recebidos</span>
                  </h3>
                  <span className="text-[9px] uppercase tracking-wider bg-indigo-950/80 border border-indigo-900/50 px-2 py-0.5 rounded-md font-bold text-indigo-300 font-mono">
                    Canal Ativo
                  </span>
                </div>

                {targetLeads.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-800/60 rounded-xl space-y-2">
                    <p className="text-xs text-slate-400">Nenhum lead recebido por este canal.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {targetLeads.map((ld) => (
                      <div
                        key={ld.id}
                        onClick={() => setProfPortalSelectedLead(ld)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          profPortalSelectedLead?.id === ld.id
                            ? "bg-indigo-950/40 border-indigo-500 text-white"
                            : "bg-[#090b1c]/80 border-slate-900/80 hover:border-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-xs truncate">{ld.name}</span>
                          <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            ld.status === "Novo" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                            ld.status === "Em Atendimento" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            ld.status === "Concluído" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}>
                            {ld.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-mono">{new Date(ld.createdAt).toLocaleDateString("pt-BR")} às {new Date(ld.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SELECTED LEAD DETAIL BOARD */}
              <div className={`space-y-4 ${profPortalSelectedLead ? "block" : "hidden md:block"}`}>
                {profPortalSelectedLead ? (
                  <div className="bg-[#0e1022]/95 border border-slate-800/60 rounded-2xl p-4 space-y-4 shadow-lg text-xs animate-scale-in">
                    
                    {/* Return arrow for mobile view */}
                    <button
                      onClick={() => setProfPortalSelectedLead(null)}
                      className="md:hidden w-full flex items-center justify-center gap-2 text-indigo-300 hover:text-[#818cf8] font-bold text-xs py-2.5 px-3 bg-[#131735]/60 hover:bg-[#1a1f49] border border-indigo-800/30 rounded-xl mb-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-indigo-400" />
                      <span>← Voltar para Oportunidades</span>
                    </button>

                    <div className="pb-3 border-b border-slate-800/50 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{profPortalSelectedLead.name}</h4>
                        <span className="text-[10px] text-slate-450 font-mono">Lead ID: {profPortalSelectedLead.id}</span>
                      </div>
                      <span className="text-indigo-400 text-xs font-mono bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/30">
                        {new Date(profPortalSelectedLead.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Telefone / E-mail</span>
                        <p className="text-slate-100 mt-0.5 font-bold font-mono text-sm">{profPortalSelectedLead.phone || "Não informado"}</p>
                        {profPortalSelectedLead.email && (
                          <p className="text-slate-400 font-mono mt-0.5">{profPortalSelectedLead.email}</p>
                        )}
                      </div>

                      {profPortalSelectedLead.location && (
                        <div>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Endereço de Atendimento</span>
                          <p className="text-slate-200 mt-0.5">{profPortalSelectedLead.location}</p>
                        </div>
                      )}

                      {profPortalSelectedLead.notes && (
                        <div>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Mensagem / Demanda do Lead</span>
                          <p className="text-slate-300 mt-0.5 bg-[#050614]/80 p-2.5 rounded-lg border border-slate-900 max-h-32 overflow-y-auto font-sans leading-relaxed text-[11px] whitespace-pre-wrap">{profPortalSelectedLead.notes}</p>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-850 space-y-2.5">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">Mudar Status de Atendimento</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/leads/${profPortalSelectedLead.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "Em Atendimento" })
                                });
                                if (response.ok) {
                                  const updated = await response.json();
                                  setProfPortalSelectedLead(updated.lead);
                                  loadData(true);
                                  alert("Status atualizado: Em Atendimento");
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                          >
                            Atender Lead
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/leads/${profPortalSelectedLead.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "Concluído" })
                                });
                                if (response.ok) {
                                  const updated = await response.json();
                                  setProfPortalSelectedLead(updated.lead);
                                  loadData(true);
                                  alert("Status updated: Concluído");
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                          >
                            Concluir Atendimento
                          </button>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/leads/${profPortalSelectedLead.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "Recusado" })
                                });
                                if (response.ok) {
                                  const updated = await response.json();
                                  setProfPortalSelectedLead(updated.lead);
                                  loadData(true);
                                  alert("Status de oportunidade alterado para Recusado");
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-350 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                          >
                            Dispensar Oportunidade
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0e1022]/40 border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-400 text-xs">
                      Selecione uma oportunidade na listagem esquerda para examinar os dados e coordenar o atendimento.
                    </div>
                  )}
                </div>
              </div>
            )}

          {profPortalActiveTab === "finances" && (
            <div className="bg-[#0e1022]/90 border border-slate-800/60 rounded-2xl p-5 space-y-4 shadow-lg text-xs leading-normal">
              <div className="flex items-center justify-between border-b border-indigo-950 pb-2">
                <h3 className="font-bold text-xs text-slate-200 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Seu Financeiro</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Ganhos Gerais</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/35 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider">Fechamentos Acumulados</span>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">
                    R$ {(loggedInProf.profitRecords || []).reduce((acc, r) => acc + r.value, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 bg-indigo-950/20 border border-indigo-900/35 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-indigo-455 block tracking-wider">Serviços Consolidados</span>
                  <p className="text-2xl font-bold text-indigo-300 font-mono">
                    {(loggedInProf.profitRecords || []).length}
                  </p>
                </div>
              </div>

              {/* REPORT PROFIT FORM */}
              <div className="bg-[#050614]/80 p-4 rounded-xl border border-slate-900 space-y-3">
                <span className="font-bold text-[10px] text-indigo-400 uppercase tracking-widest block">Lançar Novo Ganho faturado</span>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!recordDescription.trim() || !recordValue.trim() || !recordDate.trim()) {
                      alert("Preencha todos os campos.");
                      return;
                    }
                    const valParsed = parseFloat(recordValue);
                    if (isNaN(valParsed) || valParsed <= 0) {
                      alert("Insira um valor maior que zero.");
                      return;
                    }
                    try {
                      const response = await fetch(`/api/professionals/${loggedInProf.id}/profit`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          date: recordDate,
                          description: recordDescription.trim(),
                          value: valParsed
                        })
                      });
                      if (response.ok) {
                        const updatedProf = await response.json();
                        setLoggedInProf(updatedProf);
                        setRecordDescription("");
                        setRecordValue("");
                        setRecordDate("");
                        loadData(true);
                        alert("Parabéns pelo faturamento! Lançado com sucesso.");
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <input
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="bg-[#0e1022]/90 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Descrição do serviço fechado"
                    value={recordDescription}
                    onChange={(e) => setRecordDescription(e.target.value)}
                    className="bg-[#0e1022]/90 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Valor R$"
                      value={recordValue}
                      onChange={(e) => setRecordValue(e.target.value)}
                      className="flex-1 bg-[#0e1022]/90 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer inline-flex items-center"
                    >
                      Registrar
                    </button>
                  </div>
                </form>
              </div>

              {/* LIST PROFIT RECORDS */}
              <div className="space-y-2">
                <span className="font-bold text-[10px] text-slate-400 block uppercase tracking-widest">Histórico de Lançamentos</span>
                {(!loggedInProf.profitRecords || loggedInProf.profitRecords.length === 0) ? (
                  <p className="text-slate-500 italic py-3 text-center">Nenhum faturamento registrado até o momento.</p>
                ) : (
                  <div className="border border-slate-900 rounded-xl overflow-hidden">
                    <table className="w-full text-left bg-[#08091a]">
                      <thead>
                        <tr className="bg-[#050614] text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                          <th className="p-3">Data</th>
                          <th className="p-3">Descrição do Serviço</th>
                          <th className="p-3 text-right">Faturamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-medium">
                        {loggedInProf.profitRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-900/30">
                            <td className="p-3 font-mono text-slate-455">{rec.date}</td>
                            <td className="p-3 text-slate-200">{rec.description}</td>
                            <td className="p-3 text-right text-emerald-400 font-mono font-bold">R$ {rec.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {profPortalActiveTab === "profile" && (
            <div className="bg-[#0e1022]/90 border border-slate-800/60 rounded-2xl p-5 space-y-4 shadow-lg text-xs leading-normal">
              <div className="flex items-center justify-between border-b border-indigo-950 pb-2">
                <h3 className="font-bold text-xs text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Sua Conta de Profissional</span>
                </h3>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const response = await fetch(`/api/professionals/${loggedInProf.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: loggedInProf.name,
                        specialty: loggedInProf.specialty,
                        phone: loggedInProf.phone,
                        email: loggedInProf.email,
                        username: loggedInProf.username,
                        password: loggedInProf.password
                      })
                    });
                    if (response.ok) {
                      const updated = await response.json();
                      setLoggedInProf(updated);
                      loadData(true);
                      alert("Seus dados cadastrais foram atualizados perfeitamente!");
                    } else {
                      const errData = await response.json();
                      alert(errData.error || "Erro ao salvar.");
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="space-y-4 text-left"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-widest">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={loggedInProf.name}
                      onChange={(e) => setLoggedInProf({ ...loggedInProf, name: e.target.value })}
                      className="w-full bg-[#050614]/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-[#585ff1]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-widest">Especialidade</label>
                    <input
                      type="text"
                      required
                      value={loggedInProf.specialty}
                      onChange={(e) => setLoggedInProf({ ...loggedInProf, specialty: e.target.value })}
                      className="w-full bg-[#050614]/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-[#585ff1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-widest font-sans">Seu WhatsApp</label>
                    <input
                      type="text"
                      required
                      value={loggedInProf.phone}
                      onChange={(e) => setLoggedInProf({ ...loggedInProf, phone: e.target.value })}
                      className="w-full bg-[#050614]/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-[#585ff1]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-widest">E-mail Cadastrado</label>
                    <input
                      type="email"
                      required
                      value={loggedInProf.email}
                      onChange={(e) => setLoggedInProf({ ...loggedInProf, email: e.target.value })}
                      className="w-full bg-[#050614]/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-[#585ff1]"
                    />
                  </div>
                </div>

                <div className="bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-900/35 space-y-3">
                  <span className="font-bold text-[9px] text-indigo-400 uppercase tracking-widest block">🔑 Credenciais de Logon</span>
                  
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="space-y-1">
                      <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-widest">Usuário (Username)</label>
                      <input
                        type="text"
                        required
                        value={loggedInProf.username || ""}
                        onChange={(e) => setLoggedInProf({ ...loggedInProf, username: e.target.value })}
                        className="w-full bg-[#050614]/80 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-widest">Senha de Acesso</label>
                      <input
                        type="text"
                        required
                        value={loggedInProf.password || ""}
                        onChange={(e) => setLoggedInProf({ ...loggedInProf, password: e.target.value })}
                        className="w-full bg-[#050614]/80 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-lg text-xs cursor-pointer"
                >
                  Salvar Dados Cadastrais
                </button>
              </form>
            </div>
          )}

        </main>
      </div>
    );
  }

  // CLIENT REVIEW INTERCEPT PUBLIC PAGE
  if (activeReviewLeadId && activeReviewToken) {
    return (
      <div className="bg-gradient-to-b from-[#0b0c1e] via-[#050614] to-[#020309] min-h-screen text-slate-100 flex flex-col font-sans relative justify-start sm:justify-center items-center py-8 px-4 select-none">
        {/* Ambient lavender light in the background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-lg mb-6 text-center z-10 px-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 bg-slate-900/60 border border-slate-800/40 py-2.5 px-5 rounded-full shadow-inner">
            <Star className="w-3.5 h-3.5 text-yellow-450 fill-yellow-450 shrink-0 animate-pulse animate-duration-1000" />
            <span>Avaliação de Atendimento</span>
          </div>
        </div>

        <div className="w-full max-w-lg bg-[#0e1022]/90 border border-slate-800/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
          {reviewLoading && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-violet-500 animate-spin mx-auto" strokeWidth={2.5} />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200">Buscando detalhes do atendimento...</p>
                <p className="text-xs text-slate-400">Verificando tokens de segurança</p>
              </div>
            </div>
          )}

          {!reviewLoading && reviewError && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5">
                <span className="text-2xl font-bold">⚠️</span>
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-white text-lg font-sans">Não foi possível carregar a avaliação</h3>
                <p className="text-xs text-rose-300 leading-relaxed max-w-xs mx-auto font-medium">
                  {reviewError}
                </p>
              </div>
            </div>
          )}

          {!reviewLoading && !reviewError && reviewSubmitted && (
            <div className="text-center py-8 space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 bg-[#00bd70]/10 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-full border-4 border-[#00e676] flex items-center justify-center shadow-[0_0_25px_rgba(0,230,118,0.25)] bg-[#041a12]/30">
                  <Check className="w-10 h-10 text-[#00e676]" strokeWidth={4} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-extrabold text-white text-xl font-sans">
                  Avaliação <span className="text-[#00e676]">Enviada!</span>
                </h3>
                <p className="text-xs text-slate-350 leading-relaxed max-w-sm mx-auto font-medium">
                  Sua pontuação de <strong className="text-white font-bold">{ratingValue} estrelas</strong> e comentários foram arquivados e publicados com sucesso.
                </p>
                <div className="inline-block mt-3 text-[11px] text-indigo-300 font-semibold bg-indigo-950/40 border border-indigo-900/40 rounded-lg py-2 px-3">
                  Agradecemos muito por compartilhar sua experiência!
                </div>
              </div>
            </div>
          )}

          {!reviewLoading && !reviewError && !reviewSubmitted && reviewInfo && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-extrabold text-white text-xl tracking-tight font-sans">Como foi seu atendimento?</h3>
                <p className="text-xs text-slate-400">
                  Sua opinião sincera ajuda a manter a qualidade dos nossos profissionais parceiros.
                </p>
              </div>

              {/* Informações do Profissional */}
              <div className="bg-[#050410]/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{reviewInfo.professionalName}</h4>
                  <p className="text-xs text-slate-405">{reviewInfo.specialty}</p>
                  <span className="inline-block mt-1 text-[9px] font-bold text-violet-400 bg-violet-950/30 border border-violet-900/30 rounded py-0.5 px-1.5 uppercase font-mono tracking-wider">
                    {reviewInfo.templateName}
                  </span>
                </div>
              </div>

              {/* Seleção de Estrelas */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider text-center">
                  Sua Nota: <span className="text-yellow-400 font-extrabold text-sm">{ratingValue} de 5</span>
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRatingValue(starValue)}
                      onMouseEnter={() => setRatingValue(starValue)}
                      className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          starValue <= ratingValue
                            ? "text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.25)]"
                            : "text-slate-700 hover:text-slate-500"
                        }`}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulário de Campos */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Seu Nome (opcional)</label>
                  <input
                    type="text"
                    value={reviewClientName}
                    onChange={(e) => setReviewClientName(e.target.value)}
                    placeholder="Ex: Maria Araújo"
                    className="w-full bg-[#050410]/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Seu Comentário (opcional)</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value.slice(0, 500))}
                    placeholder="Conte resumidamente como foi sua experiência com este serviço..."
                    rows={4}
                    className="w-full bg-[#050410]/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Máximo 500 caracteres</span>
                    <span>{reviewComment.length}/500</span>
                  </div>
                </div>
              </div>

              {reviewError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 rounded-xl text-xs leading-relaxed text-center font-bold">
                  ❌ {reviewError}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2"
              >
                {reviewSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando avaliação...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <span>Confirmar e Enviar Avaliação</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PROFESSIONAL PORTAL INTERCEPT
  if (activeProfessionalToken) {
    return (
      <div className="bg-gradient-to-b from-[#0b0c1e] via-[#050614] to-[#020309] min-h-screen text-slate-100 flex flex-col font-sans relative justify-start sm:justify-center items-center py-6 px-3 sm:py-12 sm:px-4 select-none">
        {/* Subtle glowing blurred ambient lavender light in the background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Portal majestic outer brand header */}
        <div className="w-full max-w-lg mb-4 text-center z-10 px-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 bg-slate-900/60 border border-slate-800/40 py-2 px-4 rounded-full shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Validação Segura de Oportunidades</span>
          </div>
        </div>
        
        {/* Main interactive portal glass card context */}
        <div className="w-full max-w-lg bg-[#0e1022]/90 border border-slate-800/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative z-10 space-y-5 sm:space-y-6">
          <div className="p-0">
            {profPortalPhase === "loading" && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="w-10 h-10 text-violet-500 animate-spin mx-auto" strokeWidth={2.5} />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-200">Consultando integridade do convite...</p>
                  <p className="text-xs text-slate-400">Verificando tokens e validade de atendimento</p>
                </div>
              </div>
            )}

            {profPortalPhase === "error" && (
              <div className="py-6 text-center space-y-5">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500 border border-rose-500/20 shadow-lg">
                  <AlertCircle className="w-9 h-9 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-white text-base">Acesso Inválido</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto text-center font-medium">
                    {profPortalError || "Este link de serviço é inválido ou expirou. Por favor, solicite um novo envio ao operador do sistema."}
                  </p>
                </div>
              </div>
            )}

            {/* Phase AUTH: Username and password verification gate */}
            {profPortalPhase === "auth" && profPortalProfessional && (
              <form onSubmit={handleProfPortalAuth} className="space-y-5 sm:space-y-6">
                <div className="text-center space-y-2 pb-4 border-b border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-extrabold tracking-widest text-[10px] sm:text-xs">Profissional Parceiro</p>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{profPortalProfessional.name}</h3>
                  <span className="inline-block text-[10px] sm:text-[11px] bg-indigo-500/10 border border-indigo-400/20 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-indigo-300 font-extrabold uppercase tracking-widest">
                    {profPortalProfessional.specialty}
                  </span>
                </div>

                <LeadCountdown 
                  forwardedAt={profPortalLeadOverview?.forwardedAt || profPortalLeadOverview?.createdAt}
                  onExpire={() => {
                    setProfPortalError("Esta oportunidade expirou. Você tem no máximo 15 minutos para aceitar novos leads após o encaminhamento.");
                    setProfPortalPhase("error");
                  }}
                />

                <div className="space-y-4 pt-2 text-left">
                  <label className="text-xs text-slate-200 font-bold block uppercase tracking-wider">
                    Confirmação de Acesso Seguro
                  </label>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Efetue login com suas credenciais de parceiro associadas ao usuário <span className="font-mono text-indigo-300 font-bold">@{profPortalProfessional.username || "cadastrado"}</span> para receber os detalhes do lead:
                  </p>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block">
                      Usuário
                    </label>
                    <input
                      type="text"
                      placeholder="Seu usuário"
                      required
                      value={profPortalUsernameInput}
                      onChange={(e) => setProfPortalUsernameInput(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl text-left text-xs sm:text-sm focus:outline-hidden text-white font-medium shadow-inner transition-all placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block">
                      Senha
                    </label>
                    <input
                      type="password"
                      placeholder="Sua senha"
                      required
                      value={profPortalPasswordInput}
                      onChange={(e) => setProfPortalPasswordInput(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl text-left text-xs sm:text-sm focus:outline-hidden text-white font-medium shadow-inner transition-all placeholder:text-slate-700 font-mono tracking-wider"
                    />
                  </div>

                  <div className="space-y-2 pt-1 text-left">
                    <label className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block">Sessão Ativa</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setProfPortalRememberSession("remember")}
                        className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                          profPortalRememberSession === "remember"
                            ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                        }`}
                      >
                        Lembrar neste dispositivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfPortalRememberSession("session")}
                        className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                          profPortalRememberSession === "session"
                            ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                        }`}
                      >
                        Não salvar
                      </button>
                    </div>
                  </div>
                </div>

                {profPortalError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 rounded-xl text-xs leading-relaxed text-center font-bold">
                    ❌ {profPortalError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-violet-600/20 active:scale-95 cursor-pointer text-xs sm:text-sm tracking-wide"
                >
                  Autenticar e Revelar Oportunidade
                </button>
              </form>
            )}

            {/* Phase SERVICE_DETAIL: Accept or Recuse controls */}
            {profPortalPhase === "service_detail" && profPortalLead && (
              <div className="space-y-5 sm:space-y-6">
                {/* PROMINENT TOP HIGHLIGHT: Countdown & Action Buttons */}
                <div className="p-3.5 sm:p-4 md:p-5 bg-gradient-to-r from-slate-950 via-[#120e2e]/60 to-slate-950 border border-violet-500/35 rounded-2xl shadow-xl space-y-4">
                  {/* Lead countdown bar at the very top of highlight */}
                  <LeadCountdown 
                    forwardedAt={profPortalLead.forwardedAt || profPortalLead.createdAt} 
                    onExpire={() => {
                      setProfPortalError("Esta oportunidade expirou. O limite de 15 minutos foi excedido.");
                      setProfPortalPhase("error");
                    }}
                  />

                  {/* Valor Estimado Input Block */}
                  <div className="space-y-1.5 text-left border-y border-slate-800/40 py-3 mt-1">
                    <label className="text-[10px] font-bold text-violet-300 uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-violet-400" />
                      Valor Estimado do Serviço (R$)
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 150.00"
                        value={profPortalEstimatedValue}
                        onChange={(e) => setProfPortalEstimatedValue(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 bg-slate-950 border border-slate-800/85 text-white font-mono font-bold text-sm rounded-xl outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-600"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal font-medium">
                      Informe o valor estimado do serviço para que seja contabilizado na sua receita final de lucro corrente.
                    </p>
                  </div>

                  {/* Accept & Decline Buttons in highlight immediately below countdown */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                    <button
                      onClick={() => setShowRecuseModal(true)}
                      className="bg-[#0e0c24] hover:bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold py-3.5 sm:py-4 px-2 sm:px-3 rounded-xl text-center text-[10px] sm:text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm active:scale-95 uppercase tracking-wider"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-black pb-0.5 shrink-0 text-[10px]">✕</span>
                      Recusar Chamado
                    </button>
                    <button
                      onClick={handleProfPortalAccept}
                      className="bg-[#04bd70] hover:bg-[#03b067] text-white font-extrabold py-3.5 sm:py-4 px-2 sm:px-3 rounded-xl text-center text-[10px] sm:text-xs transition-all shadow-[0_4px_15px_rgba(4,189,112,0.25)] border border-emerald-500/30 font-sans flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 uppercase tracking-wider"
                    >
                      <Check className="w-3.5 h-3.5 bg-white/20 rounded-full p-0.5 shrink-0 text-white font-extrabold" strokeWidth={3.5} />
                      Aceitar Chamado
                    </button>
                  </div>
                </div>

                {/* Status active indication and Entry Date */}
                <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[#00e676] bg-[#00e676]/10 px-2.5 py-1 rounded-xl border border-[#00e676]/20 font-extrabold text-[10px] sm:text-[11px] tracking-wider uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
                    Chamado Ativo
                  </div>
                  <span className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1.5 font-semibold font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Entrada: {new Date(profPortalLead.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {/* Lead request card */}
                <div className="space-y-4sm:space-y-5">
                  <div className="pb-3 border-b border-slate-800/60">
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1 font-sans">
                      Confirmação de Oportunidade
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Revise as informações de solicitação abaixo e confirme ou decline o atendimento deste lead.
                    </p>
                  </div>

                  {/* Row: Cliente */}
                  <div className="flex items-center gap-3 sm:gap-4 py-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-violet-400 tracking-wider block mb-0.5">Cliente</span>
                      <span className="text-base sm:text-lg font-bold text-white block tracking-tight truncate">{profPortalLead.name}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-800/60" />

                  {/* Row: Endereço */}
                  <div className="flex items-center gap-3 sm:gap-4 py-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-500/10 border border-sky-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/5">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-sky-400 tracking-wider block mb-0.5">Endereço Completo</span>
                      <span className="text-sm sm:text-lg font-bold text-white leading-relaxed block break-words whitespace-normal" title={profPortalLead.address || profPortalLead.location}>
                        {profPortalLead.address || profPortalLead.location || "Não Informado"}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-800/60" />

                  {/* Row: Serviço Solicitado */}
                  <div className="flex items-center gap-3 sm:gap-4 py-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/5">
                      <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-0.5">Serviço Solicitado</span>
                      <span className="text-sm sm:text-lg font-bold text-white block tracking-tight leading-normal break-words whitespace-normal">
                        {profPortalLead.description || profPortalLead.notes || "Não detalhado"}
                      </span>
                    </div>
                  </div>

                </div>

                {profPortalError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 rounded-xl text-xs text-center font-bold">
                    ❌ {profPortalError}
                  </div>
                )}
              </div>
            )}

            {/* Recuse Modal */}
            {showRecuseModal && (
              <div className="fixed inset-0 z-50 bg-[#020309]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                <div className="w-full max-w-sm bg-[#0a081a] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-205">
                  <div className="text-center space-y-1.5">
                    <h4 className="font-bold text-white text-base">Recusar oportunidade?</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Ao confirmar a recusa, o lead retornará para a triagem geral de oportunidades do painel.</p>
                  </div>
                  
                  <div className="space-y-1.55">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Motivo da Recusa
                    </label>
                    <select
                      value={profPortalRecuseReason}
                      onChange={(e) => setProfPortalRecuseReason(e.target.value)}
                      className="w-full p-2.5 sm:p-3 bg-slate-950 border border-slate-850 text-xs rounded-xl outline-hidden focus:border-violet-500 text-slate-200 font-medium"
                    >
                      <option value="">Selecione o motivo descritivo...</option>
                      <option value="Sem disponibilidade de agenda">Sem disponibilidade de agenda esta semana</option>
                      <option value="Fora da minha área de atendimento">Fora da minha área de atendimento</option>
                      <option value="Orçamento inadequado para o serviço">Proposta de orçamento inadequada</option>
                      <option value="Outros">Outros motivos técnicos</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                    <button
                      onClick={() => setShowRecuseModal(false)}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-center font-bold cursor-pointer transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleProfPortalRecuse}
                      disabled={!profPortalRecuseReason}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-center font-extrabold cursor-pointer transition-colors"
                    >
                      Confirmar Recusa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Phase SUCCESS: Lead Accepted */}
            {profPortalPhase === "success" && profPortalLead && (
              <div className="text-center py-2 sm:py-4 space-y-5 sm:space-y-6">
                
                {/* Glowing custom Check Ring Visual Header */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto flex items-center justify-center mt-2">
                  <div className="absolute inset-0 bg-[#00bd70]/10 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-18 h-18 sm:w-24 sm:h-24 rounded-full border-[3px] sm:border-[4px] border-[#00e676] flex items-center justify-center shadow-[0_0_30px_rgba(0,230,118,0.35)] bg-[#041a12]/30 active:scale-95 transition-transform duration-200">
                    <Check className="w-10 h-10 sm:w-12 sm:h-12 text-[#00e676]" strokeWidth={4} />
                  </div>
                </div>
                
                {/* Visual Headings and Typography */}
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-white text-xl sm:text-2xl tracking-normal font-sans">
                    Atendimento <span className="text-[#00e676]">Confirmado!</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-350 leading-relaxed max-w-sm mx-auto font-medium">
                    Parabéns! O lead foi registrado com sucesso em seu perfil.<br />
                    O status foi atualizado para <span className="text-[#00e676] font-extrabold">"Em Atendimento"</span>.
                  </p>
                </div>

                {/* Structured Details Box exactly styled like image */}
                <div className="bg-[#050410]/90 border border-slate-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-left divide-y divide-slate-800/40 shadow-inner">
                  
                  {/* Row 1: CLIENTE PARA ATENDER */}
                  <div className="flex items-center gap-3 sm:gap-4 pb-3">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Cliente para Atender</span>
                      <span className="text-sm sm:text-base font-extrabold text-white block mt-0.5 tracking-tight truncate">{profPortalLead.name}</span>
                    </div>
                  </div>

                  {/* Row 2: TELEFONE PRINCIPAL */}
                  <div className="flex items-center gap-3 sm:gap-4 py-3">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5">
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Telefone Principal</span>
                      <span className="font-mono text-sm sm:text-base font-bold text-slate-100 block mt-0.5 tracking-wide select-all">{profPortalLead.phone}</span>
                    </div>
                  </div>

                  {/* Row 3: DATA DE CONFIRMAÇÃO */}
                  <div className="flex items-center gap-3 sm:gap-4 py-3">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#818cf8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Data de Confirmação</span>
                      <span className="text-sm sm:text-base font-bold text-slate-100 block mt-0.5 select-all">
                        {new Date(profPortalLead.acceptedAt || new Date()).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  {/* Row 4: VALOR REGISTRADO NO PERFIL */}
                  {profPortalLead.estimatedValue !== undefined && profPortalLead.estimatedValue >= 0 && (
                    <div className="flex items-center gap-3 sm:gap-4 pt-3">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-emerald-550/10 border border-emerald-500/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/5">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 font-extrabold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Lucro Corrente Registrado</span>
                        <span className="text-sm sm:text-base font-bold text-[#00bd70] block mt-0.5 font-mono select-all">
                          R$ {Number(profPortalLead.estimatedValue).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Primary CTA and secondary Navigation Links */}
                <div className="space-y-4 pt-1">
                  <a
                    href={`https://wa.me/${profPortalLead.phone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(profPortalLead.name)},%20sou%20o%20profissional%20focado%20no%20seu%20atendimento.%20Acabei%20de%20receber%20sua%20solicitação.%20Como%20posso%20ajudar?`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-between bg-gradient-to-r from-[#00bd70] to-[#00b06c] hover:from-[#00cc88] hover:to-[#00bd7e] text-white font-extrabold py-3.5 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl transition-all animate-neon-pulse active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0 fill-current animate-bounce" viewBox="0 0 24 24">
                        <path d="M12.003 2c-5.522 0-9.997 4.477-9.997 10 0 1.764.459 3.42 1.264 4.868L2.006 22l5.344-1.258A9.957 9.957 0 0012.003 22c5.524 0 10-4.478 10-10s-4.476-10-10-10zM12 20.393c-1.608 0-3.115-.42-4.437-1.15l-.317-.18-3.153.743.757-3.048-.204-.326A8.349 8.349 0 013.606 12C3.606 7.37 7.37 3.606 12 3.606S20.394 7.37 20.394 12 16.63 20.393 12 20.393zm4.586-6.237c-.251-.125-1.488-.734-1.718-.817-.23-.083-.396-.125-.563.125-.167.25-.646.817-.792.983-.146.166-.292.187-.542.062a6.837 6.837 0 01-2-.132A7.545 7.545 0 018.73 12c.395-.395.076-.6-.176-.75-.229-.136-.54-.351-.71-.527-.166-.175-.224-.3-.328-.5-.104-.2-.052-.375.026-.525.078-.15.563-1.354.771-1.854.204-.488.407-.422.563-.43l.47-.008c.166 0 .437.062.666.312c.23.25.875.854 1.073 1.25.198.396.198.688.099.886-.099.198-.433.563-.625.75-.192.188-.41.393-.166.813a6.002 6.002 0 002.323 2.02c.49.231.875.375 1.177.472a2.85 2.85 0 001.312.083c.4-.06 1.229-.5 1.402-.98.173-.478.173-.889.122-.98-.052-.09-.193-.14-.443-.265z" />
                      </svg>
                      <span className="text-xs sm:text-sm font-extrabold tracking-normal font-sans">CHAMAR CLIENTE</span>
                    </div>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" strokeWidth={3} />
                  </a>
                </div>
              </div>
            )}

            {/* Phase RECUSED */}
            {profPortalPhase === "recused" && (
              <div className="text-center py-6 space-y-6">
                <div className="w-20 h-20 bg-slate-850 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-800 animate-pulse">
                  <X className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-extrabold text-white text-lg tracking-tight">Atendimento Recusado</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Entendido! Esta oportunidade foi recusada com sucesso por você e já retornou à fila principal. Agradecemos pelo seu feedback rápido!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#060814] w-full min-h-screen flex text-slate-100 font-sans border-none m-0 p-0 overflow-x-hidden antialiased selection:bg-indigo-500/30">
      <div className="flex w-full min-h-screen">
        
        {/* SIDEBAR NAVIGATION - Dark theme style */}
        <nav className="w-64 bg-[#03040b] flex flex-col min-h-screen border-r border-slate-900 shrink-0 select-none">
          
          {/* Logo Brand area */}
          <div className="p-5 border-b border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-tr from-[#4118a1] to-[#6366f1] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 transition-transform hover:scale-105">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-white tracking-tight">LeadCapture</span>
                  <span className="text-[9px] bg-blue-600 text-white font-extrabold px-1 rounded-md tracking-wider">PRO</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></span>
                  <span className="text-[9px] text-[#10b981] font-bold tracking-widest uppercase">LIVE PLATFORM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Applet Navigation Menu */}
          <div className="flex-1 py-4 px-3 space-y-1 text-slate-400">
            
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Painel de Controle
            </div>

            <button 
              id="sidebar-btn-overview"
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "overview" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-[#818cf8]" />
                Visão Geral
              </span>
              <span className="bg-[#10b981]/15 text-[#10b981] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90">
                Live
              </span>
            </button>

            <button 
              id="sidebar-btn-leads"
              onClick={() => setActiveTab("leads")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "leads" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#818cf8]" />
                Leads Centralizados
              </span>
              <span className="bg-[#151939] text-[#818cf8] border border-indigo-500/10 text-[9px] px-1.5 py-0.5 rounded-md font-bold scale-90">
                {leads.length}
              </span>
            </button>

            <button 
              id="sidebar-btn-kanban"
              onClick={() => setActiveTab("kanban")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "kanban" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Kanban className="w-4 h-4 text-[#818cf8]" />
                Painel Kanban
              </span>
              <span className="bg-[#151939] text-[#818cf8] border border-indigo-500/10 text-[9px] px-1.5 py-0.5 rounded-md font-bold scale-90">
                {leads.filter(l => l.status !== "Arquivado").length}
              </span>
            </button>

            <button 
              id="sidebar-btn-professionals"
              onClick={() => { setActiveTab("professionals"); setSelectedProfessionalId(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "professionals" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-[#818cf8]" />
                Profissionais & Finanças
              </span>
              <span className="bg-[#151939] text-[#818cf8] border border-indigo-500/10 text-[9px] px-1.5 py-0.5 rounded-md font-bold scale-90">
                {professionals.length}
              </span>
            </button>

            <button 
              id="sidebar-btn-templates"
              onClick={() => setActiveTab("templates")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "templates" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-[#818cf8]" />
                Canais & Templates
              </span>
              <span className="bg-[#151939] text-[#818cf8] border border-indigo-500/10 text-[9px] px-1.5 py-0.5 rounded-md font-bold scale-90">
                {templates.length}
              </span>
            </button>

            <div className="px-3 pt-6 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Configurações & Embed
            </div>

            <button 
              id="sidebar-btn-embed"
              onClick={() => setActiveTab("embed")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "embed" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <Code2 className="w-4 h-4 text-[#818cf8]" />
              Script de Embed
            </button>

            <button 
              id="sidebar-btn-notifications"
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "notifications" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <Settings className="w-4 h-4 text-[#818cf8]" />
              Notificações SaaS
            </button>

            <button 
              id="sidebar-btn-design-system"
              onClick={() => setActiveTab("design-system")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "design-system" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              Design System & Tokens
            </button>

            <button 
              id="sidebar-btn-webhook-logs"
              onClick={() => setActiveTab("webhook-logs")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                activeTab === "webhook-logs" 
                  ? "bg-[#131635] text-white border-l-2 border-[#585ff1] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]" 
                  : "hover:bg-[#0c0f24]/50 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-4 h-4 text-indigo-400" />
              Logs de Webhook
            </button>

            <div className="px-3 pt-6 pb-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Acesso do Profissional
            </div>

            <button 
              id="sidebar-btn-portal-login"
              onClick={() => {
                setShowProfLoginScreen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer text-[#a5b4fc] bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-900/40 hover:border-indigo-500/40 shadow-sm"
            >
              <span className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-indigo-400" />
                Portal do Parceiro
              </span>
              <span className="bg-indigo-500/10 text-indigo-300 text-[8px] px-2 py-0.5 rounded-full font-extrabold uppercase scale-90 border border-indigo-500/20">
                Logon
              </span>
            </button>

            {/* Quick Demo Simulator Section in sidebar */}
            <div className="pt-6 px-2">
              <div className="p-3 bg-[#0c0f24] border border-slate-900 rounded-2xl space-y-2">
                <p className="text-[10px] text-slate-400 leading-normal font-medium">
                  Seus canais externos estão conectados e funcionando normalmente.
                </p>
                <button
                  id="btn-simulate-rand-lead"
                  type="button"
                  onClick={handleQuickAddRandomDemoLead}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#4f46e5] hover:bg-[#5a52ff] shadow-[0_0_15px_rgba(79,70,229,0.2)] text-white text-[10px] font-bold py-2 px-2 rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Simular Lead Externo
                </button>
              </div>
            </div>

          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800 text-slate-500 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span>SaaS Host: {loading ? "Carregando..." : "Ligado"}</span>
              <button 
                onClick={loadData}
                title="Sincronizar dados"
                className="hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="text-[10px] text-slate-600">v2.4.0 High-Density Cloud</p>
          </div>
        </nav>

        {/* MAIN BODY AREA */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* HEADER BAR - Dark space high density styling */}
          <header className="h-16 bg-[#060814]/85 backdrop-blur-md border-b border-slate-900/60 flex items-center justify-between px-8 shrink-0 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-white font-sans uppercase">
                {activeTab === "overview" && "Dashboard Geral"}
                {activeTab === "leads" && "Central de Leads Capturados"}
                {activeTab === "kanban" && "Quadro Kanban de Leads"}
                {activeTab === "professionals" && "Profissionais & Finanças"}
                {activeTab === "templates" && "Gerenciar Templates HTML"}
                {activeTab === "embed" && "Script de Embed"}
                {activeTab === "notifications" && "Configurações de Alertas"}
                {activeTab === "design-system" && "Design System & Tokens"}
                {activeTab === "webhook-logs" && "Logs de Webhook e Capturas"}
              </h1>
              <span className="text-slate-700">/</span>
              <span className="text-[10px] text-slate-300 font-extrabold bg-[#151939] border border-indigo-500/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                {activeTab}
              </span>
            </div>

            <div className="flex items-center gap-3">
              
              {/* Reset database option */}
              <button
                id="btn-reset-demo"
                onClick={handleResetData}
                className="bg-[#0e1330] border border-slate-900 text-rose-400 px-3 py-1.5 rounded-xl text-[11px] font-bold hover:bg-[#1c1328] hover:border-rose-900/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Redefinir banco de dados para estado de demonstração"
              >
                <RefreshCw className="w-3 h-3 text-rose-400" />
                Reset Demo
              </button>

              <button
                id="btn-export-top"
                onClick={handleExportCSV}
                className="bg-[#0e1330] border border-slate-900 text-slate-300 px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-[#13193c] hover:border-slate-800 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Exportar CSV ({filteredLeads.length})
              </button>

              <button
                id="btn-create-template-top"
                onClick={() => {
                  setActiveTab("templates");
                  openCreateChannelModal();
                }}
                className="bg-[#4f46e5] text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold hover:bg-[#5a52ff] shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Template
              </button>

              <div className="h-6 w-px bg-slate-900 hidden md:block"></div>
              
              {/* Profile info simulated */}
              <div className="flex items-center gap-2.5 select-none pl-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3b1275]/50 to-[#6366f1]/50 border border-indigo-500/30 text-white font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                  AF
                </div>
                <div className="text-left leading-none hidden xl:block">
                  <span className="text-[11px] font-bold block text-slate-200">Anderson</span>
                  <span className="text-[9px] text-slate-500 block font-mono">Administrador</span>
                </div>
              </div>
            </div>
          </header>

          {/* MAIN PAGE DATA CONTAINER */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">

            {/* REAL-TIME NOTIFICATION TOAST BAR */}
            {showRecentToast && recentLiveLead && (
              <div 
                id="live-lead-toast-banner"
                className="bg-[#064e3b]/35 border border-emerald-500/25 p-3.5 rounded-xl flex items-center justify-between animate-pulse shadow-md"
              >
                <div className="flex items-center gap-3 text-emerald-100 text-xs font-semibold">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block animate-ping"></span>
                  <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-[9px] px-2 py-0.5 rounded border border-emerald-500/25 tracking-widest">
                    CAPTURADO
                  </span>
                  <span>
                    {recentLiveLead.name} preencheu {recentLiveLead.templateName}! WhatsApp: {recentLiveLead.phone}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setSelectedLeadForDetail(recentLiveLead);
                      setActiveTab("leads");
                    }}
                    className="text-xs font-extrabold text-emerald-300 hover:text-emerald-100 underline decoration-emerald-500/30 cursor-pointer"
                  >
                    Atender agora →
                  </button>
                  <button 
                    onClick={() => setShowRecentToast(false)} 
                    className="text-emerald-500 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* REAL-TIME SYNC STATUS BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c0f24]/80 border border-slate-900 rounded-2xl px-5 py-3.5 text-xs text-slate-300 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
                </span>
                <span className="font-bold text-slate-200 tracking-tight font-display">Escuta Ativa de Webhooks Externos</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-slate-500">
                <div className="flex items-center gap-1.5 bg-[#0e1330] px-3 py-1 rounded-xl border border-slate-900">
                  <Clock className="w-3.5 h-3.5 text-[#818cf8] animate-pulse" />
                  <span className="text-slate-400">Última atualização:</span>
                  <span className="font-mono text-slate-100 font-bold">
                    {lastUpdated ? lastUpdated.toLocaleTimeString("pt-BR") : "--:--:--"}
                  </span>
                </div>
                <span className="text-slate-850 hidden sm:inline">|</span>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest border border-indigo-500/20">
                  Polling reativo: 4s
                </span>
              </div>
            </div>

            {/* HIGH-DENSITY KPI METRIC GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[#0e1330] p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all group relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      Leads Hoje
                    </div>
                    <span className="p-1.5 bg-[#4f46e5]/10 rounded-lg group-hover:bg-[#4f46e5]/20 transition-colors">
                      <Clock className="w-4 h-4 text-[#818cf8]" />
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between mt-1">
                    <div className="text-3xl font-extrabold text-white font-display">
                      {metrics.todayLeads}
                    </div>
                    <div className="w-24 h-10 select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[{v: 40}, {v: 45}, {v: 42}, {v: 50}, {v: 48}, {v: 60}, {v: 58}, {v: 72}]}>
                          <defs>
                            <linearGradient id="glowPurple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#glowPurple)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#10b981] font-semibold mt-2.5 flex items-center gap-1.5 bg-[#10b981]/15 px-2 py-0.5 rounded-md self-start">
                  <span>↑ 12% vs ontem</span>
                  <span className="text-slate-300 font-normal">| {metrics.todayLeads} centralizados</span>
                </div>
              </div>

              <div className="bg-[#0e1330] p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all group relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-350 text-[11px] font-bold uppercase tracking-wider">
                      Leads Este Mês
                    </div>
                    <span className="p-1.5 bg-[#10b981]/10 rounded-lg group-hover:bg-[#10b981]/20 transition-colors">
                      <Users className="w-4 h-4 text-[#34d399]" />
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between mt-1">
                    <div className="text-3xl font-extrabold text-white font-display">
                      {metrics.monthLeads}
                    </div>
                    <div className="w-24 h-10 select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[{v: 30}, {v: 35}, {v: 32}, {v: 45}, {v: 40}, {v: 55}, {v: 48}, {v: 64}]}>
                          <defs>
                            <linearGradient id="glowGreen" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#glowGreen)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#10b981] font-semibold mt-2.5 flex items-center gap-1.5 bg-[#10b981]/15 px-2 py-0.5 rounded-md self-start">
                  <span>↑ 8.4% vs meta</span>
                  <span className="text-slate-300 font-normal">| Meta: 2.800</span>
                </div>
              </div>

              <div className="bg-[#0e1330] p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all group relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-350 text-[11px] font-bold uppercase tracking-wider">
                      Canais / Formulários Ativos
                    </div>
                    <span className="p-1.5 bg-[#3b82f6]/10 rounded-lg group-hover:bg-[#3b82f6]/20 transition-colors">
                      <FileCode className="w-4 h-4 text-[#38bdf8]" />
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between mt-1">
                    <div className="text-3xl font-extrabold text-white font-display">
                      {metrics.activeTemplatesCount} / {templates.length}
                    </div>
                    <div className="w-24 h-10 select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[{v: 10}, {v: 15}, {v: 12}, {v: 24}, {v: 20}, {v: 30}, {v: 28}, {v: 35}]}>
                          <defs>
                            <linearGradient id="glowBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#glowBlue)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 font-semibold mt-2.5 flex items-center gap-1.5 bg-[#38bdf8]/15 px-2 py-0.5 rounded-md self-start">
                  <span className="text-[#38bdf8]">{templates.filter(t => t.leadsCount > 0).length} sites ativos</span>
                  <span className="text-slate-300 font-normal">com conversões</span>
                </div>
              </div>

              <div className="bg-[#0e1330] p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all group relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-350 text-[11px] font-bold uppercase tracking-wider">
                      Taxa de Resposta
                    </div>
                    <span className="p-1.5 bg-[#f59e0b]/10 rounded-lg group-hover:bg-[#f59e0b]/20 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-[#fb923c]" />
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between mt-1">
                    <div className="text-3xl font-extrabold text-white font-display">
                      {metrics.responseRate}%
                    </div>
                    <div className="w-24 h-10 select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[{v: 20}, {v: 24}, {v: 22}, {v: 28}, {v: 26}, {v: 35}, {v: 31}, {v: 38}]}>
                          <defs>
                            <linearGradient id="glowOrange" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#fb923c" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="#fb923c" strokeWidth={2} fillOpacity={1} fill="url(#glowOrange)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#fb923c] font-semibold mt-2.5 flex items-center gap-1.5 bg-[#fb923c]/15 px-2 py-0.5 rounded-md self-start">
                  <span>Média -4.2 min</span>
                  <span className="text-slate-300 font-normal">para 1º contato</span>
                </div>
              </div>

            </div>

            {/* TAB CONTENT: 1. OVERVIEW (Dashboard Geral) */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
                 {/* 7-DAY LEADS DISTRIBUTION AREA CHART */}
                <div className="bg-[#0e1330] rounded-2xl border border-slate-800/80 p-5 mt-2 relative overflow-hidden shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h3 className="font-extrabold text-white text-sm flex items-center gap-2 font-display uppercase tracking-wide">
                        <span className="w-2.5 h-2.5 bg-[#4f46e5] rounded-full shadow-[0_0_8px_rgba(79,70,229,0.7)] animate-pulse"></span>
                        Distribuição de Leads nos Últimos 7 Dias por Canal
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Gráfico integrativo mostrando o total de leads capturados em todos os canais e templates integrados.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] bg-[#0c0f24] px-3 py-1.5 rounded-xl border border-slate-900 select-none">
                      <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></span>
                      <span className="text-slate-300 font-bold uppercase tracking-wider">Altamente Reativo</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono">
                    <ChartContainer height={256}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={last7DaysChartData}
                          margin={{ top: 10, right: 15, left: -25, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="mainGlowPurple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#13193c" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                          />
                          <YAxis 
                            stroke="#64748b"
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                          />
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: '#0c0f24', 
                              borderRadius: '12px', 
                              border: '1px solid #1e293b', 
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '8px 12px'
                            }}
                            itemStyle={{ color: '#818cf8' }}
                            labelClassName="font-extrabold text-[#c084fc] mb-1 font-mono"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="leads" 
                            name="Leads Capturados"
                            stroke="#6366f1" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#mainGlowPurple)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Recent Leads inside Overview */}
                  <div className="lg:col-span-2 bg-[#0e1330] rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-slate-900/60 flex items-center justify-between bg-[#0e1330]">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-white text-sm">Controle de Atendimento Recente</h2>
                        <span className="bg-[#151939] text-[#818cf8] border border-indigo-500/15 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Últimos leads recebidos
                        </span>
                      </div>
                      <button 
                        onClick={() => setActiveTab("leads")} 
                        className="text-xs text-[#818cf8] font-bold hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        Ver todos os leads →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0c0f24]/60 border-b border-slate-950 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                          <tr>
                            <th className="px-4 py-3">Lead</th>
                            <th className="px-4 py-3">Contato</th>
                            <th className="px-4 py-3">Origem</th>
                            <th className="px-4 py-3">Horário</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/50">
                          {leads.slice(0, 5).map((l) => (
                            <tr key={l.id} className="hover:bg-[#13193c]/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-bold text-white">{l.name}</div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {l.email || "Sem e-mail"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-slate-300 font-semibold">{l.phone}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-0.5 rounded text-[10px] bg-[#151939]/80 text-[#818cf8] border border-indigo-500/15 font-semibold">
                                  {l.templateName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 font-medium font-mono">
                                {new Date(l.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                  l.status === "Novo" ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" :
                                  l.status === "Em Atendimento" ? "bg-[#f59e0b]/10 text-[#fb923c] border border-[#fb923c]/20" :
                                  l.status === "Concluído" ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" :
                                  "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setSelectedLeadForDetail(l)}
                                    className="px-2.5 py-1 bg-[#13193c] text-slate-300 border border-slate-800 rounded-lg hover:bg-slate-850 hover:text-white transition-all text-[10px] font-bold cursor-pointer"
                                  >
                                    Anotar
                                  </button>
                                  <a 
                                    href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 border border-[#25d366]/25 rounded-lg transition-all text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {leads.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center p-8 text-slate-500 text-xs">
                                Nenhum lead capturado até o momento. Tente usar o botão de simulador no menu lateral.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Performance and Origins stat block */}
                  <div className="space-y-6">
                    
                    {/* Source Performance panel */}
                    <div className="bg-[#0e1330] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-xl">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-white text-sm">Canais Campeões</h3>
                          <span className="text-[9px] text-[#818cf8] font-bold uppercase tracking-wider bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/15">Últimas Coletas</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                          Percentual de Leads gerados de acordo com a landing page integrada.
                        </p>

                        <div className="space-y-4">
                          {templatesPerformance.map((t, index) => {
                            const totalLeads = leads.length || 1;
                            const percentage = Math.round((t.count / totalLeads) * 100);
                            
                            // Visual color bar gradients based on entry index to make it highly premium
                            const barGradients = [
                              "from-indigo-600 to-[#4f46e5]",
                              "from-sky-500 to-indigo-500",
                              "from-emerald-500 to-teal-400",
                              "from-amber-500 to-orange-400"
                            ];
                            const currentGradient = barGradients[index % barGradients.length];

                            return (
                              <div key={t.id} className="space-y-1.5 group relative">
                                <div className="flex justify-between text-xs font-semibold items-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-300">{t.name}</span>
                                    {!["conserto-em-casa", "bebe-familia", "academia-fit", "advocacia-parceiros"].includes(t.id) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteChannelTemplate(t.id, t.name);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-400 hover:text-rose-300 transition-opacity font-bold ml-1 cursor-pointer"
                                        title="Remover este canal"
                                      >
                                        (Remover)
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-white font-mono">{t.count} leads <span className="text-slate-500 font-normal">({percentage}%)</span></span>
                                </div>
                                <div className="w-full bg-[#13193c] h-2 rounded-full overflow-hidden border border-slate-950/20">
                                  <div 
                                    className={`bg-gradient-to-r ${currentGradient} h-full rounded-full transition-all duration-1000`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-[#818cf8] font-bold cursor-pointer hover:text-indigo-300 transition-colors" onClick={() => setActiveTab("templates")}>
                        Conecte novos domínios agora →
                      </div>
                    </div>

                    {/* Step embed fast overview */}
                    <div className="bg-[#0c0f24] border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0e1330] border border-slate-800 rounded-xl flex items-center justify-center">
                          <Code2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Fast Embed SDK</div>
                          <div className="text-[10px] text-slate-500">Instalação instantânea em 1 minuto</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Arraste ou copie esta tag HTML para a sua central ou landing page. Sem necessidade de gerenciar banco de dados ou backend. Os formulários externos vêm pré-estilizados!
                      </p>
                      
                      <div className="bg-[#03040b] p-3 rounded-xl text-[10px] font-mono text-indigo-300 break-all select-all border border-slate-905 overflow-x-auto relative">
                        <code>
                          &lt;script src=&quot;{apiHost}/embed.js&quot; data-template=&quot;{templates[0]?.id || "conserto-em-casa"}&quot;&gt;&lt;/script&gt;
                        </code>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setActiveTab("embed");
                        }}
                        className="text-center font-bold text-xs text-indigo-400 hover:text-indigo-300 transition-all self-start cursor-pointer"
                      >
                        Customizar formulário e cores →
                      </button>
                    </div>

                  </div>

                </div>

                {/* VISUAL EXPLANATION & DEMOSTATION SIMULATION GUIDE */}
                <div className="bg-[#0e1330] p-5 rounded-2xl border border-slate-800/80 shadow-xl">
                  <h3 className="font-bold text-white text-sm mb-4 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                    Como Funciona a Captação Omnichannel?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-400">
                    <div className="space-y-2 bg-[#0c0f24] p-4 rounded-xl border border-slate-900/80">
                      <div className="font-bold text-[#818cf8] flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                        <div className="w-5 h-5 bg-indigo-500/10 border border-indigo-500/15 rounded-full flex items-center justify-center text-[10px] font-mono text-indigo-300">1</div>
                        Crie um Template
                      </div>
                      <p className="leading-relaxed text-slate-400 font-medium">
                        Crie e personalize o canal para mapear seu propósito (ex: &quot;Conserto em Casa&quot; ou &quot;Academia FitLife&quot;). Defina quais os campos customizados que seu lead deve fornecer.
                      </p>
                    </div>
                    <div className="space-y-2 bg-[#0c0f24] p-4 rounded-xl border border-slate-900/80">
                      <div className="font-bold text-[#818cf8] flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                        <div className="w-5 h-5 bg-indigo-500/10 border border-indigo-500/15 rounded-full flex items-center justify-center text-[10px] font-mono text-indigo-300">2</div>
                        Coloque o Script no HTML
                      </div>
                      <p className="leading-relaxed text-slate-400 font-medium">
                        Copie o código script gerado para o site do cliente. Nosso widget de captação de formulário aparecerá instantaneamente no local desejado com tratamentos de máscaras de telefone.
                      </p>
                    </div>
                    <div className="space-y-2 bg-[#0c0f24] p-4 rounded-xl border border-slate-900/80">
                      <div className="font-bold text-[#818cf8] flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                        <div className="w-5 h-5 bg-indigo-500/10 border border-indigo-500/15 rounded-full flex items-center justify-center text-[10px] font-mono text-indigo-300">3</div>
                        Receba Leads e Notificações
                      </div>
                      <p className="leading-relaxed text-slate-400 font-medium">
                        Quando um prospecto digitar os dados e clicar em enviar, os dados batem na API SaaS, emitindo som de alerta, toast de urgência verde no topo e registrando no histórico em tempo real.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: 2. LEADS CENTRALIZED TABLE */}
            {activeTab === "leads" && (
              <div className="space-y-4">
                
                {/* REAL-TIME ALERTS FOR OPERATOR (ACCEPTED LEADS NOTIFICATIONS) */}
                {leads.filter(l => l.assignedProfessionalId && l.acceptedAt && l.operatorNotifiedOfAcceptance === false).map((unack) => {
                  const assigned = professionals.find(p => p.id === unack.assignedProfessionalId);
                  return (
                    <div key={unack.id} className="bg-emerald-600 border border-emerald-500 text-white p-3.5 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🔔</span>
                        <div>
                          <strong className="text-white block font-semibold text-sm">Oportunidade Aceita por Profissional!</strong>
                          <span className="text-emerald-100">
                            Cliente <strong className="text-white font-bold">{unack.name}</strong> foi aceito por <strong className="text-white font-bold">{assigned?.name || "Parceiro"}</strong> ({assigned?.specialty || "Especialista"}) às {unack.acceptedAt ? new Date(unack.acceptedAt).toLocaleTimeString("pt-BR") : ""}. O status mudou para "Em Atendimento".
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => acknowledgeLeadAcceptance(unack.id)}
                        className="self-end sm:self-auto bg-emerald-800 hover:bg-emerald-900 border border-emerald-500/40 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors cursor-pointer shrink-0 uppercase tracking-wider"
                      >
                        Confirmar Leitura
                      </button>
                    </div>
                  );
                })}
                
                {/* Filters, search and actions toolbar */}
                <div className="bg-[#0e1330] p-4 rounded-xl border border-slate-850 shadow-md flex flex-col md:flex-row gap-3 items-center justify-between">
                  
                  {/* Search input bar */}
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-leads-search"
                      type="text"
                      placeholder="Pesquisar por nome, tel, e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#090d22] border border-slate-800 rounded-lg text-xs outline-hidden focus:border-indigo-500 focus:bg-[#070b1e] text-white transition-all font-medium placeholder-slate-500"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Filter Selects */}
                  <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
                    
                    <div className="flex items-center gap-1 bg-[#090d22] border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] text-slate-400 font-semibold select-none">Origem:</span>
                      <select
                        id="select-filter-template"
                        value={selectedTemplateFilter}
                        onChange={(e) => setSelectedTemplateFilter(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold outline-hidden cursor-pointer text-white"
                      >
                        <option value="all" className="bg-[#0e1330] text-slate-350">Sempre Todos os Sites</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id} className="bg-[#0e1330] text-slate-350">{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-[#090d22] border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300">
                      <span className="text-[11px] text-slate-400 font-semibold select-none">Atendimento:</span>
                      <select
                        id="select-filter-status"
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold outline-hidden cursor-pointer text-white"
                      >
                        <option value="all" className="bg-[#0e1330] text-slate-350">Ver Tudo</option>
                        <option value="Novo" className="bg-[#0e1330] text-slate-350">Novo</option>
                        <option value="Em Atendimento" className="bg-[#0e1330] text-slate-350">Em Atendimento</option>
                        <option value="Concluído" className="bg-[#0e1330] text-slate-350">Concluído</option>
                        <option value="Arquivado" className="bg-[#0e1330] text-slate-350">Arquivado</option>
                      </select>
                    </div>

                    <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

                    <button
                      id="btn-trigger-sync"
                      onClick={() => loadData()}
                      className="p-1 px-3.5 bg-[#090d22] border border-slate-800 text-slate-300 rounded-lg text-xs hover:bg-[#131a3d] hover:text-white transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                      Recarregar
                    </button>

                  </div>

                </div>

                {/* Batch Actions Bar for selected leads */}
                {selectedLeadIds.length > 0 && (
                  <div className="bg-[#1f1635] border border-violet-900/50 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="bg-violet-950/80 border border-violet-850 p-2 rounded-lg text-violet-400">
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Ações em Massa para Leads</h4>
                        <p className="text-xs text-slate-400">
                          Você selecionou <strong className="text-indigo-300">{selectedLeadIds.length}</strong> de um total de <strong className="text-white">{filteredLeads.length}</strong> leads visíveis de {leads.length} em toda a base.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedLeadIds([])}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-850"
                      >
                        Limpar Seleção
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMultipleLeads(selectedLeadIds)}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 border border-rose-700/50 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir Selecionados ({selectedLeadIds.length})
                      </button>
                    </div>
                  </div>
                )}

                {/* Split table and details preview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Table area */}
                  <div className="lg:col-span-2 bg-[#0e1330] rounded-xl border border-slate-800/80 shadow-lg overflow-hidden font-sans">
                    <div className="p-4 border-b border-slate-800/60 bg-[#131a3d]/40 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-300">
                        Total filtrados: <b className="text-white">{filteredLeads.length} leads</b> de {leads.length} totais
                      </span>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-indigo-300 font-mono">Dica: Selecione uma linha para abrir a folha de detalhes</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#131a3d]/90 border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[9px] font-extrabold">
                          <tr>
                            <th className="px-4 py-3 w-10">
                              <input
                                id="checkbox-leads-select-all"
                                type="checkbox"
                                checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const visibleIds = filteredLeads.map(l => l.id);
                                    setSelectedLeadIds(prev => {
                                      const newSelection = [...prev];
                                      visibleIds.forEach(id => {
                                        if (!newSelection.includes(id)) {
                                          newSelection.push(id);
                                        }
                                      });
                                      return newSelection;
                                    });
                                  } else {
                                    const visibleIds = filteredLeads.map(l => l.id);
                                    setSelectedLeadIds(prev => prev.filter(id => !visibleIds.includes(id)));
                                  }
                                }}
                                className="rounded border-slate-700 bg-[#090d22] text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-3">Lead Nome</th>
                            <th className="px-4 py-3">Meio de Contato</th>
                            <th className="px-4 py-3">Fluxo Originário</th>
                            <th className="px-4 py-3">Profissional Atendendo</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {filteredLeads.map((l) => (
                            <tr 
                              key={l.id} 
                              onClick={() => setSelectedLeadForDetail(l)}
                              className={`cursor-pointer transition-colors ${
                                selectedLeadForDetail?.id === l.id 
                                  ? "bg-indigo-950/45 hover:bg-indigo-900/40" 
                                  : "hover:bg-slate-800/35"
                              }`}
                            >
                              <td className="px-4 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedLeadIds.includes(l.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedLeadIds(prev => [...prev, l.id]);
                                    } else {
                                      setSelectedLeadIds(prev => prev.filter(id => id !== l.id));
                                    }
                                  }}
                                  className="rounded border-slate-700 bg-[#090d22] text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                                  {l.name}
                                  {l.notes?.includes("[SISTEMA - EXPIRADO:") && (
                                    <span className="inline-flex items-center gap-0.5 bg-rose-950/50 text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-900/50 uppercase tracking-wide">
                                      ⏱️ Expirado
                                    </span>
                                  )}
                                  {l.status === "Novo" && (
                                    <span className="w-2 h-2 bg-[#818cf8] rounded-full inline-block animate-ping"></span>
                                  )}
                                </div>
                                {l.address ? (
                                  <div className="text-[11px] text-slate-500 font-sans block truncate max-w-xs" title={l.address}>
                                    📍 {l.address}
                                  </div>
                                ) : l.email ? (
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    {l.email}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Endereço não cadastrado
                                  </div>
                                )}
                                {l.assignedProfessionalId && (
                                  <div className="mt-1 text-[10px] text-indigo-300 font-bold flex items-center gap-1 bg-indigo-950/60 border border-indigo-900/50 rounded-md px-1.5 py-0.5 w-fit">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse inline-block"></span>
                                    Fwd: {professionals.find(p => p.id === l.assignedProfessionalId)?.name || "Profissional"}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                <span className="font-mono text-slate-300 block">{l.phone}</span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-44">Ref: {l.metadata?.referrer || "Direto"}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950/50 text-indigo-300 border border-indigo-900/50 font-semibold inline-block">
                                  {l.templateName}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {l.assignedProfessionalId ? (
                                  (() => {
                                    const prof = professionals.find(p => p.id === l.assignedProfessionalId);
                                    return prof ? (
                                      <div className="flex items-center gap-2">
                                        {prof.photoUrl ? (
                                          <img
                                            src={prof.photoUrl}
                                            alt={prof.name}
                                            className="w-5 h-5 rounded-full object-cover border border-slate-700"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[9px] font-bold border border-slate-700">
                                            {prof.name.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div>
                                          <span className="font-semibold text-slate-200 block text-[11px] leading-tight">{prof.name}</span>
                                          <span className="text-[9px] text-slate-400 block leading-none mt-0.5">{prof.specialty}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Profissional</span>
                                    );
                                  })()
                                ) : (
                                  <span className="text-[10px] text-slate-400 bg-slate-800/40 border border-slate-700/50 px-2 py-0.5 rounded-md inline-block font-sans">
                                    Não encaminhado
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  l.status === "Novo" ? "bg-indigo-950/60 text-indigo-300 border border-indigo-900/50" :
                                  l.status === "Em Atendimento" ? "bg-amber-950/60 text-amber-300 border border-amber-900/50" :
                                  l.status === "Concluído" ? "bg-emerald-950/60 text-emerald-300 border border-emerald-900/50" :
                                  "bg-slate-800/80 text-slate-400 border border-slate-700/60"
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-[10px] whitespace-nowrap">
                                <div>{new Date(l.createdAt).toLocaleDateString("pt-BR")}</div>
                                <div className="font-mono">{new Date(l.createdAt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}</div>
                              </td>
                            </tr>
                          ))}
                          {filteredLeads.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center p-12 text-slate-400 whitespace-normal">
                                Nao encontramos nenhum lead com os critérios de buscas selecionados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sidebar Detail / Operations Preview */}
                  <div className="bg-[#0e1330] rounded-xl border border-slate-800/80 shadow-lg p-5 space-y-5 font-sans">
                    {selectedLeadForDetail ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-start pb-3 border-b border-slate-800/60">
                          <div>
                            <span className="text-[10px] font-mono text-indigo-400 block">{selectedLeadForDetail.id}</span>
                            <h3 className="font-bold text-white text-base">{selectedLeadForDetail.name}</h3>
                          </div>
                          <button 
                            onClick={() => setSelectedLeadForDetail(null)}
                            className="p-1.5 text-slate-450 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Customer details: Name, WhatsApp, Address, City, Description */}
                        <div className="bg-[#131a3d]/50 border border-slate-800/60 p-3.5 rounded-xl space-y-2.5 text-xs text-slate-300">
                          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/50">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Nome Cliente</span>
                              <span className="font-semibold text-white font-sans">{selectedLeadForDetail.name}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp</span>
                              <span className="font-semibold text-slate-200 font-mono">{selectedLeadForDetail.phone}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/50">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Endereço de Atendimento</span>
                              <span className="font-semibold text-slate-100 block text-[11px] leading-snug mt-0.5">
                                {selectedLeadForDetail.address || selectedLeadForDetail.location || "Não Informado"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cidade</span>
                              <span className="font-semibold text-slate-100 block text-[11px] leading-snug mt-0.5">
                                {selectedLeadForDetail.city || "Não Informada"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Descrição do Serviço / Problema</span>
                            <span className="text-slate-200 block text-[11px] leading-relaxed bg-[#090d22] border border-slate-800 p-2.5 rounded-lg mt-1 whitespace-pre-wrap font-sans">
                              {selectedLeadForDetail.description || selectedLeadForDetail.notes || "Não detalhado"}
                            </span>
                          </div>
                        </div>

                        {selectedLeadForDetail.notes?.includes("[SISTEMA - EXPIRADO:") && (
                          <div className="bg-rose-950/40 border border-rose-900/50 text-rose-300 p-4 rounded-xl text-xs space-y-1.5 shadow-lg">
                            <div className="font-extrabold flex items-center gap-1.5 text-rose-400 uppercase tracking-wide text-[10px]">
                              <span className="text-sm">⚠️</span> Estouro de Tempo (15 Minutos)
                            </div>
                            <p className="text-[11px] leading-relaxed text-rose-350/90 font-sans">
                              {selectedLeadForDetail.notes.split("[SISTEMA - EXPIRADO:").pop()?.split("]")?.[0] || 
                                "O profissional anterior não atendeu ao encaminhamento dentro do tempo limite de 15 minutos."}
                            </p>
                            <div className="text-[9px] font-extrabold text-[#818cf8] uppercase tracking-wider pt-1.5 border-t border-rose-900/30 mt-1.5 flex items-center gap-1">
                              <span>✓</span> Nova Oportunidade Desbloqueada para outros profissionais.
                            </div>
                          </div>
                        )}

                        {/* Structured Details Box exactly styled like professional success portal */}
                        <div className="bg-[#050410]/95 border border-slate-800/80 rounded-xl p-4 sm:p-5 text-left divide-y divide-slate-800/40 shadow-inner mt-2">
                          {/* Title for alignment to success layout context */}
                          <div className="text-center pb-3 space-y-1">
                            <h4 className="text-[10px] uppercase font-mono font-extrabold text-indigo-400 tracking-widest block">Atendimento Rápido</h4>
                            <span className="text-[11px] text-slate-350 font-medium">Inicie o contato direto via WhatsApp oficial</span>
                          </div>

                          {/* Row 1: CLIENTE PARA ATENDER */}
                          <div className="flex items-center gap-3 sm:gap-4 py-3">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5 flex">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 m-auto" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Cliente para Atender</span>
                              <span className="text-sm sm:text-base font-extrabold text-white block mt-0.5 tracking-tight truncate">{selectedLeadForDetail.name}</span>
                            </div>
                          </div>

                          {/* Row 2: TELEFONE PRINCIPAL */}
                          <div className="flex items-center gap-3 sm:gap-4 py-3">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5 flex">
                              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 m-auto" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Telefone Principal</span>
                              <span className="font-mono text-sm sm:text-base font-bold text-slate-100 block mt-0.5 tracking-wide select-all">{selectedLeadForDetail.phone}</span>
                            </div>
                          </div>

                          {/* Row 3: DATA DE CADASTRO */}
                          <div className="flex items-center gap-3 sm:gap-4 pt-3">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5 flex">
                              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#818cf8] m-auto" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Data de Cadastro</span>
                              <span className="text-sm sm:text-base font-bold text-slate-100 block mt-0.5 select-all">
                                {new Date(selectedLeadForDetail.createdAt).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Neon pulsed button with official WhatsApp icon */}
                        <div className="pt-1 mb-4">
                          <a
                            href={`https://wa.me/${selectedLeadForDetail.phone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(selectedLeadForDetail.name)},%20sou%20o%20atendimento.%20Como%20posso%20ajudar?`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full inline-flex items-center justify-between bg-gradient-to-r from-[#00bd70] to-[#00b06c] hover:from-[#00cc88] hover:to-[#00bd7e] text-white font-extrabold py-3.5 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl transition-all animate-neon-pulse active:scale-[0.98] cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0 fill-current animate-bounce" viewBox="0 0 24 24">
                                <path d="M12.003 2c-5.522 0-9.997 4.477-9.997 10 0 1.764.459 3.42 1.264 4.868L2.006 22l5.344-1.258A9.957 9.957 0 0012.003 22c5.524 0 10-4.478 10-10s-4.476-10-10-10zM12 20.393c-1.608 0-3.115-.42-4.437-1.15l-.317-.18-3.153.743.757-3.048-.204-.326A8.349 8.349 0 013.606 12C3.606 7.37 7.37 3.606 12 3.606S20.394 7.37 20.394 12 16.63 20.393 12 20.393zm4.586-6.237c-.251-.125-1.488-.734-1.718-.817-.23-.083-.396-.125-.563.125-.167.25-.646.817-.792.983-.146.166-.292.187-.542.062a6.837 6.837 0 01-2-.132A7.545 7.545 0 018.73 12c.395-.395.076-.6-.176-.75-.229-.136-.54-.351-.71-.527-.166-.175-.224-.3-.328-.5-.104-.2-.052-.375.026-.525.078-.15.563-1.354.771-1.854.204-.488.407-.422.563-.43l.47-.008c.166 0 .437.062.666.312c.23.25.875.854 1.073 1.25.198.396.198.688.099.886-.099.198-.433.563-.625.75-.192.188-.41.393-.166.813a6.002 6.002 0 002.323 2.02c.49.231.875.375 1.177.472a2.85 2.85 0 001.312.083c.4-.06 1.229-.5 1.402-.98.173-.478.173-.889.122-.98-.052-.09-.193-.14-.443-.265z" />
                              </svg>
                              <span className="text-xs sm:text-sm font-extrabold tracking-normal font-sans">Iniciar Conversa no WhatsApp</span>
                            </div>
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" strokeWidth={3} />
                          </a >
                        </div>

                        {/* Status Change Selection */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Ciclo de Atendimento
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(["Novo", "Em Atendimento", "Concluído", "Arquivado"] as Lead["status"][]).map((st) => (
                              <button
                                key={st}
                                onClick={() => updateLeadStatus(selectedLeadForDetail.id, st)}
                                className={`text-[10px] py-1.5 px-2 font-bold rounded-md transition-all text-center border cursor-pointer ${
                                  selectedLeadForDetail.status === st
                                    ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                    : "bg-[#131a3d]/20 text-slate-300 hover:bg-slate-800/40 border-slate-800/80 hover:text-white"
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ENCAMINHAR PARA PROFISSIONAL (OPERATOR DISPATCH) */}
                        {selectedLeadForDetail.status === "Novo" && (
                          <div className="bg-indigo-950/20 p-4.5 rounded-xl border border-indigo-900/40 space-y-3 mt-4">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-indigo-900/40">
                              <Briefcase className="w-4 h-4 text-indigo-400" />
                              <span className="font-bold text-xs text-indigo-300">
                                Encaminhar para Profissional
                              </span>
                            </div>

                            {!selectedLeadForDetail.assignedProfessionalId ? (
                              // Not forwarded yet - Show Form
                              <div className="space-y-3.5 text-xs text-slate-300">
                                <p className="text-[11px] text-slate-450 leading-relaxed">
                                  Selecione um profissional parceiro credenciado para receber esta oportunidade exclusiva via WhatsApp.
                                </p>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                                    Profissional Disponível
                                  </label>
                                  <select
                                    id="select-forward-professional"
                                    value={forwardingProfessionalId}
                                    onChange={(e) => setForwardingProfessionalId(e.target.value)}
                                    className="w-full p-2.5 bg-[#090d22] border border-slate-850 border-slate-800/80 rounded-lg text-xs font-medium outline-hidden focus:border-indigo-500 text-slate-250 text-slate-200 cursor-pointer"
                                  >
                                    <option value="">Selecione um parceiro...</option>
                                    {professionals.map((prof) => {
                                      const isComp = prof.templateId === selectedLeadForDetail.templateId;
                                      return (
                                        <option key={prof.id} value={prof.id} className="bg-[#0e1330] text-slate-200">
                                          {prof.name} - {prof.specialty} {isComp ? "⭐ (Canal Recomendado)" : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-455 text-slate-450 uppercase tracking-widest block">
                                    Endereço / Localização do Serviço
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Av. Paulista, 1200 - SP ou Remoto"
                                    value={forwardingLocation}
                                    onChange={(e) => setForwardingLocation(e.target.value)}
                                    className="w-full p-2.5 bg-[#090d22] border border-slate-850 border-slate-800/80 rounded-lg text-xs outline-hidden focus:border-indigo-500 text-slate-250 text-slate-200 font-sans"
                                  />
                                </div>


                                {whatsappTemplates.length > 0 && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                                      Modelo de Mensagem WhatsApp *
                                    </label>
                                    <select
                                      value={forwardingTemplateId}
                                      onChange={(e) => setForwardingTemplateId(e.target.value)}
                                      className="w-full p-2.5 bg-[#090d22] border border-slate-850 border-slate-800/80 rounded-lg text-xs outline-hidden focus:border-indigo-500 text-slate-250 text-slate-200 cursor-pointer font-sans"
                                    >
                                      {whatsappTemplates.map((t) => (
                                        <option key={t.id} value={t.id} className="bg-[#0e1330] text-slate-200">
                                          {t.name} {t.isDefault ? "🛡️ (Padrão)" : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  disabled={submittingForward || !forwardingProfessionalId}
                                  onClick={() => submitLeadForward(selectedLeadForDetail.id)}
                                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer text-center text-xs mt-1"
                                >
                                  {submittingForward ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  Confirmar e Disparar WhatsApp
                                </button>
                              </div>
                            ) : (
                              // Already Forwarded - Show Status & Simulators
                              (() => {
                                const assignedProf = professionals.find(p => p.id === selectedLeadForDetail.assignedProfessionalId);
                                const expiresAt = new Date(selectedLeadForDetail.forwardExpiresAt || "");
                                const isExpired = expiresAt < new Date();
                                const tokenUrl = `${window.location.origin}/?p=${selectedLeadForDetail.forwardToken}`;

                                return (
                                  <div className="space-y-3.5 text-xs text-slate-300">
                                    <div className="bg-[#090d22] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                                      <img
                                        src={assignedProf?.photoUrl}
                                        alt={assignedProf?.name}
                                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${assignedProf?.name || "P"}`;
                                        }}
                                      />
                                      <div className="min-w-0">
                                        <span className="font-bold text-white block truncate">{assignedProf?.name}</span>
                                        <span className="text-[10px] text-indigo-400 font-semibold uppercase">{assignedProf?.specialty}</span>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-[11px]">
                                        <span className="text-slate-400">Validade do link:</span>
                                        <span className={`font-semibold ${isExpired ? "text-rose-400" : "text-amber-400"}`}>
                                          {isExpired ? "Expirado!" : "Ativo"} (Expira {expiresAt.toLocaleTimeString("pt-BR")} em {expiresAt.toLocaleDateString("pt-BR")})
                                        </span>
                                      </div>
                                      {selectedLeadForDetail.acceptedAt && (
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-slate-400">Aceito em:</span>
                                          <span className="font-bold text-emerald-400">
                                            {new Date(selectedLeadForDetail.acceptedAt).toLocaleString("pt-BR")}
                                          </span>
                                        </div>
                                      )}
                                      {selectedLeadForDetail.location && (
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-slate-400">Localização informada:</span>
                                          <span className="font-semibold text-slate-200 text-right">{selectedLeadForDetail.location}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Shared URL copy container */}
                                    <div className="space-y-1 pb-1">
                                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                                        Link Único de Atendimento
                                      </span>
                                      <div className="flex gap-1.5 font-mono text-[10px]">
                                        <input
                                          type="text"
                                          readOnly
                                          value={tokenUrl}
                                          className="flex-1 p-1.5 bg-[#090d22] border border-slate-800 rounded-lg outline-none text-slate-400 select-all"
                                        />
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(tokenUrl);
                                            setCopiedTokenUrl(true);
                                            setTimeout(() => setCopiedTokenUrl(false), 2000);
                                          }}
                                          className="py-1 px-2.5 bg-indigo-950/60 border border-indigo-900/50 hover:bg-indigo-900 text-indigo-300 font-semibold rounded-lg text-center cursor-pointer text-[10px]"
                                        >
                                          {copiedTokenUrl ? "Copiado!" : "Copiar"}
                                        </button>
                                      </div>
                                    </div>

                                    {/* SIMULATE LINK INTERFACE BUTTON */}
                                    <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-lg space-y-1.5">
                                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                                        Simular fluxo do Profissional
                                      </span>
                                      <p className="text-[10px] text-slate-400 leading-relaxed">
                                        Abra instantaneamente o simulador de login e aceite e recuse o convite dentro do preview.
                                      </p>
                                      <button
                                        onClick={() => {
                                          // Pre-fill phone if possible to make login simple in simulation
                                          setProfPortalPhoneInput(assignedProf?.phone || "");
                                          setActiveProfessionalToken(selectedLeadForDetail.forwardToken || null);
                                        }}
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors cursor-pointer text-center font-sans"
                                      >
                                        Abrir Portal do Profissional (Simulação)
                                      </button>
                                    </div>

                                    {/* COLLAPSIBLE WHATSAPP MSG BOX */}
                                    <div className="bg-[#090d22] text-slate-300 p-3 rounded-lg border border-slate-800 text-[10px] leading-relaxed relative">
                                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 block mb-2">
                                        Simulação de WhatsApp Despachado
                                      </span>
                                      <div className="font-mono whitespace-pre-wrap select-all select-none border-t border-slate-800 pt-2 text-slate-100 h-28 overflow-y-auto">
                                        {`Olá, *${assignedProf?.name}*! Nova captação de serviço disponível [LeadCapture]:\n` +
                                          `👤 *Cliente:* ${selectedLeadForDetail.name}\n` +
                                          `🛠️ *Serviço:* ${selectedLeadForDetail.templateName}\n` +
                                          `📍 *Local-Atendimento:* ${selectedLeadForDetail.location || "Não Informado"}\n` +
                                          `📝 *Detalhes:* ${selectedLeadForDetail.notes || "Nenhum detalhe adicional"}\n\n` +
                                          `👉 Acesse o link seguro abaixo para validar seu telefone e aceitar ou recusar o chamado:\n` +
                                          `🔗 ${tokenUrl}\n\n` +
                                          `⚠️ *Atenção:* Este link expira em 15 minutos por segurança.`}
                                      </div>
                                      <button
                                        onClick={() => {
                                          const txt = `Olá, *${assignedProf?.name}*! Nova captação de serviço disponível [LeadCapture]:\n` +
                                            `👤 *Cliente:* ${selectedLeadForDetail.name}\n` +
                                            `🛠️ *Serviço:* ${selectedLeadForDetail.templateName}\n` +
                                            `📍 *Local-Atendimento:* ${selectedLeadForDetail.location || "Não Informado"}\n` +
                                            `📝 *Detalhes:* ${selectedLeadForDetail.notes || "Nenhum detalhe adicional"}\n\n` +
                                            `👉 Acesse o link seguro abaixo para validar seu telefone e aceitar ou recusar o chamado:\n` +
                                            `🔗 ${tokenUrl}`;
                                          navigator.clipboard.writeText(txt);
                                          alert("Log do WhatsApp copiado!");
                                        }}
                                        className="absolute top-2 right-2 text-[8px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-900 hover:bg-indigo-900 transition-colors cursor-pointer"
                                      >
                                        Copiar Texto MSG
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        )}

                        {/* Direct Whatsapp link shortcut */}
                        <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-950/40 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                            Atendimento Rápido WhatsApp
                          </span>
                          <p className="text-xs text-slate-300">
                            Fale direto no celular com o lead pré-configurando a mensagem.
                          </p>
                          <a
                            href={`https://wa.me/${selectedLeadForDetail.phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(selectedLeadForDetail.name)},%20recebemos%20seu%20contato%20no%20canal%20${encodeURIComponent(selectedLeadForDetail.templateName)}.%20Como%20posso%20ajudar?`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg transition-colors text-center cursor-pointer"
                          >
                            <Smartphone className="w-4 h-4" />
                            Iniciar Conversa Whatsapp
                          </a>
                        </div>

                        {/* Notes editor */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                              Anotações internas de Follow-up
                            </label>
                            <span className="text-[10px] text-indigo-400 font-semibold block font-mono">Salva Automático</span>
                          </div>
                          <textarea
                            id="textarea-lead-notes"
                            placeholder="Anote detalhes da venda ou atendimento desse contato..."
                            value={selectedLeadForDetail.notes || ""}
                            onChange={(e) => updateLeadNotes(selectedLeadForDetail.id, e.target.value)}
                            className="w-full h-24 p-2.5 bg-[#090d22] border border-slate-800 focus:border-indigo-500 rounded-lg text-xs outline-hidden text-slate-200 leading-relaxed font-sans"
                          />
                        </div>

                        {/* Technical Metadata info card */}
                        <div className="bg-[#131a3d]/40 p-3 rounded-lg border border-slate-800/80 space-y-1.5 text-[10px]">
                          <span className="font-bold text-slate-400 uppercase tracking-wider block">
                            Metadados da Captura
                          </span>
                          
                          <div className="flex justify-between text-slate-400">
                            <span className="font-semibold">Template Origem:</span>
                            <span className="text-right text-slate-200">{selectedLeadForDetail.templateName} ({selectedLeadForDetail.templateId})</span>
                          </div>
                          
                          <div className="flex justify-between text-slate-400">
                            <span className="font-semibold">Adquirido em:</span>
                            <span className="text-right text-slate-200">
                              {new Date(selectedLeadForDetail.createdAt).toLocaleString("pt-BR")}
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span className="font-semibold">Página Referência:</span>
                            <span className="text-right text-slate-200 select-all max-w-[150px] truncate" title={selectedLeadForDetail.metadata?.referrer}>
                              {selectedLeadForDetail.metadata?.referrer || "Entrada manual"}
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span className="font-semibold">Navegador/UserAgent:</span>
                            <span className="text-right text-slate-200 select-all max-w-[150px] truncate" title={selectedLeadForDetail.metadata?.browser}>
                              {selectedLeadForDetail.metadata?.browser || "Desconhecido"}
                            </span>
                          </div>
                        </div>

                        {/* Danger zone delete option */}
                        <button
                          id="btn-delete-lead"
                          type="button"
                          onClick={() => deleteLead(selectedLeadForDetail.id)}
                          className="w-full text-center text-xs text-rose-500 font-semibold hover:text-rose-450 hover:bg-rose-950/20 py-2.5 rounded-lg border border-rose-950/30 transition-all cursor-pointer"
                        >
                          Apagar lead do sistema
                        </button>

                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-12 h-12 bg-[#131a3d]/50 rounded-full flex items-center justify-center mx-auto">
                          <Users className="w-6 h-6 text-indigo-300" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm">Ficha do Candidato</h4>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                            Selecione qualquer linha do painel de leads para visualizar o fluxo de atendimento, metadados, registrar anotações e ligar instantaneamente.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* TAB CONTENT: KANBAN LEAD MANAGER BOARD */}
            {activeTab === "kanban" && (() => {
              const kanbanColumns = [
                { id: "Novo", name: "Novo", desc: "Aguardando ação", color: "indigo", dot: "bg-indigo-500", textClass: "text-indigo-400", bgHeader: "bg-indigo-950/40 border-indigo-900/50", accent: "indigo" },
                { id: "Encaminhado", name: "Encaminhado", desc: "Enviado ao parceiro", color: "sky", dot: "bg-sky-500", textClass: "text-sky-400", bgHeader: "bg-sky-950/40 border-sky-900/50", accent: "sky" },
                { id: "Em Atendimento", name: "Em Atendimento", desc: "Profissional aceitou", color: "amber", dot: "bg-amber-500", textClass: "text-amber-400", bgHeader: "bg-amber-950/40 border-amber-900/50", accent: "amber" },
                { id: "Concluído", name: "Concluído", desc: "Serviço finalizado", color: "emerald", dot: "bg-emerald-500", textClass: "text-emerald-400", bgHeader: "bg-emerald-950/40 border-emerald-900/50", accent: "emerald" },
                { id: "Recusado", name: "Recusado", desc: "Recusado ou expirado", color: "rose", dot: "bg-rose-500", textClass: "text-rose-400", bgHeader: "bg-rose-950/40 border-rose-900/50", accent: "rose" }
              ] as const;

              return (
                <div className="flex-1 flex flex-col h-full min-h-0 space-y-4">
                  {/* Kanban Topbar and statistics summary */}
                  <div className="bg-[#0e1330] p-4 rounded-xl border border-slate-800/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
                    <div>
                      <h2 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                        <Kanban className="w-4 h-4 text-indigo-400" />
                        Quadro Operacional de Atendimento
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Arraste e solte os cartões para atualizar o status em tempo real ou clique nos cards para operações.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-bold">Instrução:</span>
                      <span className="text-slate-200 bg-[#131a3d]/60 px-2.5 py-1 rounded-lg font-medium text-[10px] uppercase border border-slate-800/80">
                        Clique nos cards de status &quot;Novo&quot; para Encaminhar
                      </span>
                    </div>
                  </div>

                  {/* KANBAN BOARD CONTAINER GRID */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 overflow-hidden min-h-0">
                    {kanbanColumns.map((col) => {
                      const colLeads = leads.filter(l => l.status === col.id);
                      const hasUnread = col.id === "Novo" && colLeads.some(l => !viewedLeadIds.includes(l.id));

                      return (
                        <div
                          key={col.id}
                          onDragEnter={() => setDraggedOverColId(col.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedOverColId !== col.id) {
                              setDraggedOverColId(col.id);
                            }
                          }}
                          onDragLeave={() => {
                            setDraggedOverColId((prev) => (prev === col.id ? null : prev));
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setDraggedOverColId(null);
                            const leadId = e.dataTransfer.getData("text/plain");
                            if (leadId) {
                              await updateLeadStatus(leadId, col.id);
                            }
                          }}
                          className={`flex flex-col h-full rounded-2xl border p-3 min-h-0 transition-all duration-300 group/column hover:-translate-y-0.5 hover:shadow-lg ${
                            hasUnread && col.id === "Novo"
                              ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg bg-[#131a3d]/45 shadow-indigo-950/20 hover:border-indigo-400"
                              : draggedOverColId === col.id
                                ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-[#131a3d]/55 shadow-lg shadow-indigo-950/30"
                                : "border-slate-800 bg-[#0e1330]/40 hover:border-slate-700 hover:bg-[#0e1330]/60"
                          }`}
                        >
                          {/* Column Header */}
                          <div className={`p-3 rounded-xl border mb-3 flex flex-col justify-between items-start gap-1 shrink-0 ${col.bgHeader}`}>
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${col.textClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${col.dot} ${hasUnread ? "animate-ping" : ""}`} />
                                {col.name}
                              </span>
                              <span className="bg-[#090d22] border border-slate-800 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-lg font-bold shadow-xs">
                                {colLeads.length}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {col.desc}
                            </span>

                            {hasUnread && (
                              <span className="mt-1.5 text-[8px] font-extrabold text-indigo-300 bg-indigo-950/60 border border-indigo-900/50 px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                                Novo Lead Recebido
                              </span>
                            )}
                          </div>

                          {/* Cards List Scroller */}
                          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0 scrollbar-thin">
                            {/* Visual Drag helper indicator */}
                            <div className={`text-center py-1.5 rounded-lg border border-dashed text-[9px] font-medium tracking-wide flex items-center justify-center gap-1.5 transition-all duration-300 ${
                              draggedOverColId === col.id
                                ? "border-indigo-500/80 bg-indigo-950/40 text-indigo-300 font-bold shadow-xs animate-pulse scale-[1.02]"
                                : "border-slate-800/60 bg-[#090d22]/20 text-slate-500 group-hover/column:border-slate-700/60 group-hover/column:text-slate-400"
                            }`}>
                              <span>{draggedOverColId === col.id ? "✨ Solte para atualizar" : "✊ Arrastar & Soltar aqui"}</span>
                            </div>

                            <AnimatePresence mode="popLayout">
                              {colLeads.map((lead) => {
                                const isUnread = lead.status === "Novo" && !viewedLeadIds.includes(lead.id);
                                const assignedProf = professionals.find(p => p.id === lead.assignedProfessionalId);

                                return (
                                  <motion.div
                                    key={lead.id}
                                    layoutId={`kanban-card-${lead.id}`}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 25,
                                      mass: 0.9
                                    }}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", lead.id);
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onClick={() => setSelectedLeadForDetail(lead)}
                                    className={`group relative bg-[#131a3d]/50 rounded-xl border border-slate-800/80 p-4 text-left transition-all hover:border-slate-700 hover:bg-[#131a3d]/75 cursor-pointer select-none ${
                                      isUnread
                                        ? "border-indigo-500 ring-1 ring-indigo-500/30 bg-[#131a3d]/85 pl-5"
                                        : "shadow-xs"
                                    }`}
                                  >
                                    {/* Left Glow Ribbon for Unvied Leads */}
                                    {isUnread && (
                                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
                                    )}

                                    {/* Card Top Details */}
                                    <div className="flex justify-between items-start gap-1 pb-2 border-b border-slate-800/85 mb-2.5">
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-white text-[12px] truncate group-hover:text-indigo-400 transition-colors">
                                          {lead.name}
                                        </h4>
                                        <span className="text-[9px] text-slate-450 font-mono">
                                          #{lead.id}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Card Body Details */}
                                    <div className="space-y-1.5 text-xs text-slate-300">
                                      {/* WhatsApp */}
                                      <div className="flex items-center gap-1.5 text-slate-300">
                                        <span className="text-slate-400 text-[10px]">🟢</span>
                                        <span className="font-semibold font-mono text-[10px]" onClick={(e) => e.stopPropagation()}>
                                          <a 
                                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} 
                                            target="_blank" 
                                            referrerPolicy="no-referrer"
                                            className="hover:underline hover:text-indigo-400"
                                          >
                                            {lead.phone}
                                          </a>
                                        </span>
                                      </div>

                                      {/* Location / Address */}
                                      <div className="text-[10px] leading-tight flex items-start gap-1 bg-[#090d22] border border-slate-800/80 p-1.5 rounded-lg">
                                        <span className="text-slate-400 mt-0.5 shrink-0">📍</span>
                                        <span className="font-medium text-slate-200 block line-clamp-2">
                                          {lead.address || "Endereço Não Informado"}{lead.city ? ` (${lead.city})` : ""}
                                        </span>
                                      </div>

                                      {/* Problem Description */}
                                      {lead.description && (
                                        <p className="text-[10px] text-slate-450 font-mono italic line-clamp-2 bg-[#090d22]/40 p-1 px-1.5 rounded border border-slate-800/40 leading-relaxed mt-1">
                                          &quot;{lead.description}&quot;
                                        </p>
                                      )}

                                      {/* Assigned Professional detail card */}
                                      {assignedProf ? (
                                        <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center gap-2 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/40">
                                          <img 
                                            src={assignedProf.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"} 
                                            alt={assignedProf.name}
                                            className="w-4 h-4 rounded-full object-cover border border-emerald-800 shrink-0"
                                          />
                                          <div className="min-w-0">
                                            <div className="text-[9px] font-extrabold text-emerald-400 leading-none">
                                              Profissional Atendendo
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-200 truncate leading-tight mt-0.5">
                                              {assignedProf.name}
                                            </div>
                                          </div>
                                        </div>
                                      ) : lead.status === "Novo" ? (
                                        <div className="mt-2.5 pt-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedLeadForDetail(lead);
                                              setShowForwardModalFromKanban(true);
                                            }}
                                            className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] py-1.5 px-3 rounded-lg transition-colors shadow-xs"
                                          >
                                            Encaminhar Parceiro
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>

                                    {/* Timestamp at bottom right */}
                                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[9px] text-slate-400 font-semibold font-mono">
                                      <span className="bg-[#090d22] px-1.5 py-0.5 rounded text-slate-300 border border-slate-800/50">
                                        {lead.templateName}
                                      </span>
                                      <span className="flex items-center gap-0.5 font-sans">
                                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                                        {new Date(lead.createdAt).toLocaleDateString("pt-BR")}{" "}
                                        {new Date(lead.createdAt).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>

                            {colLeads.length === 0 && (
                              <div className="border border-dashed border-slate-800 p-8 text-center text-slate-500 justify-center flex flex-col rounded-xl min-h-[140px] transition-all duration-300 group-hover/column:border-slate-700 bg-[#090d22]/10">
                                <span className="text-xl opacity-40 mb-1">📂</span>
                                <span className="text-[10px] font-medium max-w-[110px] mx-auto text-slate-400">
                                  Sem chamados nesta etapa
                                </span>
                                <span className="text-[9px] text-indigo-400/80 mt-2 block font-medium">
                                  Solte um lead aqui para alterar o status
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* HIGH CLASS FLOATING SLIDE DRAWER DETAILS PANEL FOR KANBAN CARD CLICK */}
                  {selectedLeadForDetail && (
                    <div className="fixed inset-0 z-50 overflow-hidden select-none" id="kanban-overlay-drawer">
                      {/* Dark Backdrop overlay with smooth transition */}
                      <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
                        onClick={() => setSelectedLeadForDetail(null)}
                      />

                      <div className="absolute inset-y-0 right-0 max-w-full flex">
                        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
                          {/* Drawer Header */}
                          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-start">
                            <div>
                              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                Atendimento lead #{selectedLeadForDetail.id}
                              </span>
                              <h3 className="text-base font-bold text-slate-800 mt-1">
                                {selectedLeadForDetail.name}
                              </h3>
                            </div>
                            <button
                              onClick={() => setSelectedLeadForDetail(null)}
                              className="p-1 px-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Drawer Scrollable Body Content */}
                          <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Visual flow badge status identifier */}
                            <div className="bg-indigo-50/30 border border-indigo-100 p-4 rounded-xl space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Status Atual de Atendimento</span>
                              <div className="flex items-center gap-2">
                                <span className="bg-indigo-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                                  {selectedLeadForDetail.status}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Registrado no canal {selectedLeadForDetail.templateName}
                                </span>
                              </div>
                            </div>

                            {/* Details Grid section */}
                            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3.5">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Nome Completo do Lead</span>
                                <span className="font-semibold text-slate-800 text-sm block">{selectedLeadForDetail.name}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Telefone Comercial</span>
                                  <span className="font-bold text-slate-800 text-xs block font-mono">{selectedLeadForDetail.phone}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Inclusão</span>
                                  <span className="font-semibold text-slate-800 text-xs block">
                                    {new Date(selectedLeadForDetail.createdAt).toLocaleDateString("pt-BR")}{" "}
                                    {new Date(selectedLeadForDetail.createdAt).toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"})}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Endereço de Atendimento / Local</span>
                                  <span className="font-semibold text-slate-800 block text-[11px] leading-relaxed">
                                    {selectedLeadForDetail.address || selectedLeadForDetail.location || "Não Informado no formulário"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Cidade</span>
                                  <span className="font-semibold text-slate-800 block text-[11px] leading-relaxed">
                                    {selectedLeadForDetail.city || "Não Informado"}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Descrição do Serviço / Notas Operador</span>
                                <p className="text-slate-700 bg-white border border-slate-200/80 p-3 rounded-lg text-[11px] leading-relaxed italic whitespace-pre-wrap">
                                  {selectedLeadForDetail.description || selectedLeadForDetail.notes || "Sem descrição descrita pelo usuário."}
                                </p>
                              </div>
                            </div>

                            {/* Structured Details Box exactly styled like professional success portal */}
                            <div className="bg-[#050410]/95 border border-slate-800/80 rounded-xl p-4 sm:p-5 text-left divide-y divide-slate-800/40 shadow-inner mt-2">
                              {/* Title for alignment to success layout context */}
                              <div className="text-center pb-3 space-y-1">
                                <h4 className="text-[10px] uppercase font-mono font-extrabold text-indigo-400 tracking-widest block">Atendimento Rápido</h4>
                                <span className="text-[11px] text-slate-350 font-medium">Inicie o contato direto via WhatsApp oficial</span>
                              </div>

                              {/* Row 1: CLIENTE PARA ATENDER */}
                              <div className="flex items-center gap-3 sm:gap-4 py-3">
                                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5 flex">
                                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 m-auto" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Cliente para Atender</span>
                                  <span className="text-sm sm:text-base font-extrabold text-white block mt-0.5 tracking-tight truncate">{selectedLeadForDetail.name}</span>
                                </div>
                              </div>

                              {/* Row 2: TELEFONE PRINCIPAL */}
                              <div className="flex items-center gap-3 sm:gap-4 py-3">
                                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5 flex">
                                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 m-auto" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Telefone Principal</span>
                                  <span className="font-mono text-sm sm:text-base font-bold text-slate-100 block mt-0.5 tracking-wide select-all">{selectedLeadForDetail.phone}</span>
                                </div>
                              </div>

                              {/* Row 3: DATA DE CADASTRO */}
                              <div className="flex items-center gap-3 sm:gap-4 pt-3">
                                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-500/10 border border-indigo-500/15 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/5 flex">
                                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#818cf8] m-auto" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Data de Cadastro</span>
                                  <span className="text-sm sm:text-base font-bold text-slate-100 block mt-0.5 select-all">
                                    {new Date(selectedLeadForDetail.createdAt).toLocaleString("pt-BR")}
                                  </span>
                                </div>
                              </div>

                              {/* Row 4: LUCRO GERADO ESTIMADO */}
                              {selectedLeadForDetail.estimatedValue !== undefined && selectedLeadForDetail.estimatedValue > 0 && (
                                <div className="flex items-center gap-3 sm:gap-4 pt-3 border-t border-slate-800/40">
                                  <div className="w-9 h-9 sm:w-11 sm:h-11 bg-emerald-550/10 border border-emerald-500/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/5 flex">
                                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 font-extrabold m-auto" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans">Lucro Gerado Estimado</span>
                                    <span className="text-sm sm:text-base font-bold text-[#00bd70] block mt-0.5 font-mono select-all">
                                      R$ {Number(selectedLeadForDetail.estimatedValue).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Call customer via WhatsApp Quick Button */}
                            <div className="pt-1">
                              <a
                                href={`https://wa.me/${selectedLeadForDetail.phone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(selectedLeadForDetail.name)},%20sou%20o%20atendimento.%20Como%20posso%20ajudar?`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full inline-flex items-center justify-between bg-gradient-to-r from-[#00bd70] to-[#00b06c] hover:from-[#00cc88] hover:to-[#00bd7e] text-white font-extrabold py-3.5 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl transition-all animate-neon-pulse active:scale-[0.98] cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5">
                                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0 fill-current animate-bounce" viewBox="0 0 24 24">
                                    <path d="M12.003 2c-5.522 0-9.997 4.477-9.997 10 0 1.764.459 3.42 1.264 4.868L2.006 22l5.344-1.258A9.957 9.957 0 0012.003 22c5.524 0 10-4.478 10-10s-4.476-10-10-10zM12 20.393c-1.608 0-3.115-.42-4.437-1.15l-.317-.18-3.153.743.757-3.048-.204-.326A8.349 8.349 0 013.606 12C3.606 7.37 7.37 3.606 12 3.606S20.394 7.37 20.394 12 16.63 20.393 12 20.393zm4.586-6.237c-.251-.125-1.488-.734-1.718-.817-.23-.083-.396-.125-.563.125-.167.25-.646.817-.792.983-.146.166-.292.187-.542.062a6.837 6.837 0 01-2-.132A7.545 7.545 0 018.73 12c.395-.395.076-.6-.176-.75-.229-.136-.54-.351-.71-.527-.166-.175-.224-.3-.328-.5-.104-.2-.052-.375.026-.525.078-.15.563-1.354.771-1.854.204-.488.407-.422.563-.43l.47-.008c.166 0 .437.062.666.312c.23.25.875.854 1.073 1.25.198.396.198.688.099.886-.099.198-.433.563-.625.75-.192.188-.41.393-.166.813a6.002 6.002 0 002.323 2.02c.49.231.875.375 1.177.472a2.85 2.85 0 001.312.083c.4-.06 1.229-.5 1.402-.98.173-.478.173-.889.122-.98-.052-.09-.193-.14-.443-.265z" />
                                  </svg>
                                  <span className="text-xs sm:text-sm font-extrabold tracking-normal font-sans">Iniciar Conversa no WhatsApp</span>
                                </div>
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" strokeWidth={3} />
                              </a>
                            </div>

                            {/* OPERATOR DISPATCH CONTAINER FOR KANBAN */}
                            <div className="pt-2 border-t border-slate-100">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                                Atribuição e Encaminhamento Comercial
                              </label>

                              {selectedLeadForDetail.assignedProfessionalId ? (() => {
                                const assigned = professionals.find(p => p.id === selectedLeadForDetail.assignedProfessionalId);
                                const linkUrl = `${window.location.origin}/?p=${selectedLeadForDetail.forwardToken}`;

                                return (
                                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-3 text-xs">
                                    <div className="flex items-center gap-2 bg-emerald-100/50 p-2.5 rounded-lg border border-emerald-200/30">
                                      <img
                                        src={assigned?.photoUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"}
                                        alt={assigned?.name}
                                        className="w-10 h-10 rounded-full object-cover border border-emerald-300 shadow-sm shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <div className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wide">Encaminhado para Parceiro</div>
                                        <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5">{assigned?.name || "Especialista"}</div>
                                        <div className="text-[10px] text-slate-550 leading-none">{assigned?.specialty || "Profissional credenciado"}</div>
                                      </div>
                                    </div>

                                    {/* Action links */}
                                    <div className="space-y-1.5 pt-1 text-[11px]">
                                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                                        <span>Link Único Gerado:</span>
                                        <a href={linkUrl} target="_blank" className="font-mono text-indigo-600 font-bold hover:underline select-all truncate max-w-[200px]" referrerPolicy="no-referrer">
                                          {selectedLeadForDetail.forwardToken}
                                        </a>
                                      </div>
                                      
                                      {selectedLeadForDetail.acceptedAt && (
                                        <div className="flex justify-between py-1 border-b border-emerald-100/50 text-emerald-800 font-bold bg-emerald-50/30 px-1 rounded">
                                          <span>Aceito pelo profissional em:</span>
                                          <span>{new Date(selectedLeadForDetail.acceptedAt).toLocaleString("pt-BR")}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div className="space-y-2">
                                  <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Este lead corporativo ainda não foi encaminhado. Envie-o para um parceiro de sua lista para que ele receba e execute os atendimentos.
                                  </p>
                                  <button
                                    disabled={selectedLeadForDetail.status === "Concluído"}
                                    onClick={() => setShowForwardModalFromKanban(true)}
                                    className={`w-full flex items-center justify-center gap-1.5 font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-button ${
                                      selectedLeadForDetail.status === "Concluído"
                                        ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed uppercase"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                    }`}
                                  >
                                    <Briefcase className="w-4 h-4" />
                                    Encaminhar para Profissional
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* PUBLIC CLIENT REVIEW LINK AND STATUS */}
                            {selectedLeadForDetail.status === "Concluído" && (
                              <div className="pt-4 border-t border-slate-100">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-sans">
                                  Avaliação de Atendimento Público
                                </label>
                                
                                {selectedLeadForDetail.reviewedAt ? (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                                      <Check className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={3} />
                                      <span>Avaliação Enviada pelo Cliente</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 font-medium font-sans">
                                      O cliente final já concluiu e publicou sua avaliação em: <strong className="text-slate-800">{new Date(selectedLeadForDetail.reviewedAt).toLocaleString("pt-BR")}</strong>.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-violet-50/40 border border-violet-100 rounded-xl p-3.5 space-y-3">
                                    <div className="flex items-center gap-2 text-violet-800 font-bold text-xs">
                                      <Star className="w-4 h-4 text-violet-600 shrink-0 animate-pulse fill-violet-600" />
                                      <span>Aguardando resposta do cliente</span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 space-y-1.5 font-medium leading-relaxed font-sans">
                                      <p>Link exclusivo de avaliação gerado pelo sistema:</p>
                                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1.5 font-mono text-[9px] md:text-[10px]">
                                        <span className="flex-1 truncate text-slate-500">
                                          {`${window.location.origin}/?review=${selectedLeadForDetail.id}&token=${selectedLeadForDetail.reviewToken}`}
                                        </span>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/?review=${selectedLeadForDetail.id}&token=${selectedLeadForDetail.reviewToken}`);
                                            alert("Link de avaliação copiado para a área de transferência!");
                                          }}
                                          className="text-indigo-600 hover:text-indigo-800 font-bold shrink-0 hover:underline cursor-pointer"
                                        >
                                          Copiar
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expiry date details */}
                                    {selectedLeadForDetail.reviewTokenExpiresAt && (
                                      <div className="text-[10px] text-slate-500 flex justify-between font-sans">
                                        <span>Validade do link (30 dias):</span>
                                        <span className="font-bold">{new Date(selectedLeadForDetail.reviewTokenExpiresAt).toLocaleDateString("pt-BR")} às {new Date(selectedLeadForDetail.reviewTokenExpiresAt).toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"})}</span>
                                      </div>
                                    )}

                                    {/* Action button to manually trigger a re-send */}
                                    <button
                                      type="button"
                                      disabled={resendingReviewId === selectedLeadForDetail.id}
                                      onClick={() => handleResendReviewLink(selectedLeadForDetail.id)}
                                      className="w-full flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 font-sans"
                                    >
                                      <Send className="w-3.5 h-3.5 text-violet-200" />
                                      {resendingReviewId === selectedLeadForDetail.id ? "Reenviando..." : "Reenviar link de avaliação"}
                                    </button>

                                    {resendReviewSuccessMsg && (
                                      <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[10px] leading-relaxed text-center font-bold">
                                        ✨ {resendReviewSuccessMsg}
                                      </div>
                                    )}

                                    {resendReviewErrorMsg && (
                                      <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[10px] leading-relaxed text-center font-bold">
                                        ❌ {resendReviewErrorMsg}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Manual lead status lifecycle manual correction controls for operator */}
                            <div className="pt-4 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                                Ajuste Manual de Ciclo de Status
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {(["Novo", "Encaminhado", "Em Atendimento", "Concluído", "Recusado"] as Lead["status"][]).map((st) => (
                                  <button
                                    key={st}
                                    onClick={() => updateLeadStatus(selectedLeadForDetail.id, st)}
                                    className={`text-[10px] py-1.5 px-2 font-bold rounded-lg transition-all text-center border cursor-pointer ${
                                      selectedLeadForDetail.status === st
                                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Drawer footer details removal action */}
                          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <button
                              onClick={() => {
                                deleteLead(selectedLeadForDetail.id);
                              }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Apagar permanentemente
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KANBAN ENCAMINHAR MODAL COMPONENT */}
                  {showForwardModalFromKanban && selectedLeadForDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden select-none" id="kanban-forward-modal">
                      <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
                        onClick={() => setShowForwardModalFromKanban(false)}
                      />

                      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        <div className="p-5 border-b border-slate-150 bg-slate-50/55 flex justify-between items-center shrink-0">
                          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-indigo-600" />
                            Encaminhar para Profissional
                          </h3>
                          <button
                            onClick={() => setShowForwardModalFromKanban(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                          >
                            <X className="w-4.5 h-4.5" />
                          </button>
                        </div>

                        {/* Modal Body form */}
                        <div className="p-5 space-y-4 text-xs text-slate-705 max-h-[70vh] overflow-y-auto">
                          <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl">
                            <span className="text-[9px] font-bold text-indigo-800 uppercase tracking-widest block">Dados do Cliente Solicitante</span>
                            <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedLeadForDetail.name}</div>
                            <div className="text-[10px] text-slate-500 leading-tight mt-1">
                              Serviço: <strong className="text-slate-700">{selectedLeadForDetail.templateName}</strong>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                              Profissional Especialista Disponível
                            </label>
                            <select
                              value={forwardingProfessionalId}
                              onChange={(e) => setForwardingProfessionalId(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
                            >
                              <option value="">Selecione o profissional especialista...</option>
                              {professionals.map((prof) => {
                                const isComp = prof.templateId === selectedLeadForDetail.templateId;
                                return (
                                  <option key={prof.id} value={prof.id}>
                                    {prof.name} - {prof.specialty} {isComp ? "⭐ (Recomendado para este canal)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                              Endereço Completo do Atendimento
                            </label>
                            <input
                              type="text"
                              value={forwardingLocation}
                              onChange={(e) => setForwardingLocation(e.target.value)}
                              placeholder="Carregando localização declarada..."
                              className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold outline-hidden focus:border-indigo-500 text-slate-750"
                            />
                            <p className="text-[9px] text-slate-400">
                              Este campo é preenchido automaticamente com o endereço fornecido pelo usuário.
                            </p>
                          </div>


                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                              Modelo de Mensagem do WhatsApp
                            </label>
                            <select
                              value={forwardingTemplateId}
                              onChange={(e) => setForwardingTemplateId(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
                            >
                              <option value="">Selecione o template de aviso...</option>
                              {(whatsappTemplates.length > 0 ? whatsappTemplates : [
                                { id: "tmpl-default", name: "Padrão de Encaminhamento Direto", isDefault: true }
                              ]).map((tmpl) => (
                                <option key={tmpl.id} value={tmpl.id}>
                                  {tmpl.name} {tmpl.isDefault ? "(Padrão do Sistema)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Modal buttons */}
                        <div className="p-5 border-t border-slate-150 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowForwardModalFromKanban(false)}
                            className="bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={submittingForward || !forwardingProfessionalId}
                            onClick={() => submitLeadForward(selectedLeadForDetail.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:border-slate-300 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl transition-colors shadow-button flex items-center gap-1.5 cursor-pointer"
                          >
                            {submittingForward ? "Encaminhando..." : "Encaminhar via WhatsApp"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT: PROFESSIONALS & REVENUE TRACKER */}
            {activeTab === "professionals" && (
              <div className="space-y-6">
                
                {/* 1. PROFESSIONAL DETAIL VIEW */}
                {selectedProfessionalId && selectedProf ? (
                  <div className="space-y-6 text-slate-100">
                    {/* Upper row action controls */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-[#070817]/60 border border-slate-800/80 p-4 rounded-xl shadow-lg gap-3">
                      <button
                        onClick={() => setSelectedProfessionalId(null)}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-indigo-400 bg-slate-900/60 hover:bg-slate-950 border border-slate-800/70 px-4 py-2 rounded-lg transition-all cursor-pointer w-fit"
                      >
                        ← Voltar para Todos os Profissionais
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditProfessionalModal(selectedProf)}
                          className="flex items-center gap-1.5 bg-[#0e1022] hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-400" /> Editar Perfil
                        </button>
                        <button
                          onClick={() => handleDeleteProfessional(selectedProf.id)}
                          className="flex items-center gap-1.5 bg-[#0e1022] hover:bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Remover
                        </button>
                      </div>
                    </div>

                    {/* Detailed Card Split Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left Block: Photo & Details overview */}
                      <div className="bg-[#0b0c1e] border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl col-span-1 pb-6 space-y-5">
                        {/* A nice top cover background banner with a subtle glowing styled design */}
                        <div className="h-32 bg-gradient-to-br from-[#10193a] via-[#090b1e] to-[#0c0d21] relative flex items-center justify-center border-b border-slate-800/40">
                          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent pointer-events-none" />
                          <img
                            src={selectedProf.photoUrl}
                            alt={selectedProf.name}
                            className="absolute bottom-[-32px] w-24 h-24 rounded-full object-cover border-4 border-[#0b0c1e] shadow-xl"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${selectedProf.name}`;
                            }}
                          />
                        </div>

                        <div className="px-5 pt-8 space-y-5 text-center flex flex-col items-center">
                          <div>
                            <h4 className="font-extrabold text-[#f1f5f9] text-lg tracking-tight font-sans leading-snug">{selectedProf.name}</h4>
                            <span className="text-[10px] sm:text-[11px] bg-violet-950/40 border border-violet-900/30 px-3.5 py-1 rounded-full mt-2 inline-block font-extrabold text-violet-400 uppercase tracking-widest text-center">
                              {selectedProf.specialty}
                            </span>
                          </div>

                          <hr className="border-slate-800/50 w-full" />

                          <div className="space-y-4 text-xs text-slate-300 w-full text-left">
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="truncate text-slate-300">{selectedProf.email || "Sem e-mail cadastrado"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="text-slate-300">{selectedProf.phone || "Sem telefone cadastrado"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <FileCode className="w-4 h-4 text-slate-500 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] text-slate-500 uppercase font-bold font-sans">Canal de Origem de Leads</span>
                                <span className="font-bold text-slate-200 truncate mt-0.5">
                                  {templates.find(t => t.id === selectedProf.templateId)?.name || "Nenhum canal ativo"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <hr className="border-slate-800/50 w-full" />

                          <div className="w-full text-left">
                            <span className="text-[10px] font-extrabold text-[#4f46e5] uppercase tracking-wider block mb-2.5 font-sans">Detalhes do Canal 🔗</span>
                            {templates.find(t => t.id === selectedProf.templateId) ? (
                              (() => {
                                const t = templates.find(temp => temp.id === selectedProf.templateId)!;
                                return (
                                  <div className="p-3.5 rounded-xl border border-slate-800/60 bg-[#070817]/80 flex flex-col gap-1.5 shadow-inner">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-extrabold text-slate-200 text-xs truncate">{t.name}</span>
                                      <span className="text-[9px] bg-violet-950 text-violet-300 border border-violet-800/40 px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shadow-xs">
                                        {t.leadsCount} leads
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 break-all font-mono tracking-tight select-all">{t.siteUrl}</span>
                                  </div>
                                );
                              })()
                            ) : (
                              <p className="text-xs text-slate-500 italic">Nenhum canal ativo de distribuição mapeado.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Charts & Stats (2 columns span) */}
                      <div className="lg:col-span-2 space-y-6">
                        
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          
                          <div className="bg-[#0b0c1e] border border-slate-800/65 px-4 py-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl">
                            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-550/20 flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-indigo-400 animate-pulse" />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Total Leads</span>
                              <span className="text-lg font-black text-slate-100 font-sans block leading-none mt-1">{profMetrics.total}</span>
                            </div>
                          </div>

                          <div className="bg-[#0b0c1e] border border-slate-800/65 px-4 py-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-555/20 flex items-center justify-center shrink-0">
                              <UserCheck className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Convertidos</span>
                              <span className="text-lg font-black text-slate-100 font-sans block leading-none mt-1">{profMetrics.converted}</span>
                            </div>
                          </div>

                          <div className="bg-[#0b0c1e] border border-slate-800/65 px-4 py-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl">
                            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-550/20 flex items-center justify-center shrink-0">
                              <Percent className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Conversão</span>
                              <span className="text-lg font-black text-slate-100 font-sans block leading-none mt-1">{profMetrics.rate}%</span>
                            </div>
                          </div>

                          <div className="bg-[#0b0c1e] border border-slate-800/65 px-4 py-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl justify-between min-w-0">
                            <div className="flex items-center gap-3.5 min-w-0 w-full">
                              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-550/20 flex items-center justify-center shrink-0">
                                <Calendar className="w-5 h-5 text-purple-400" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Período</span>
                                <select 
                                  value={profPeriodFilter}
                                  onChange={(e) => setProfPeriodFilter(e.target.value)}
                                  className="text-xs font-extrabold text-slate-100 bg-transparent border-none p-0 outline-hidden focus:ring-0 cursor-pointer mt-1 font-sans w-full truncate"
                                >
                                  <option value="7d" className="bg-[#10122e] text-slate-200 font-sans">Últimos 7 dias</option>
                                  <option value="30d" className="bg-[#10122e] text-slate-200 font-sans">Últimos 30 dias</option>
                                  <option value="all" className="bg-[#10122e] text-slate-200 font-sans">Todo o período</option>
                                </select>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Split Charts details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          <div className="bg-[#0b0c1e] p-5 rounded-2xl border border-slate-800/60 space-y-4 shadow-xl">
                            <h5 className="font-extrabold text-slate-200 text-xs flex items-center gap-1.5 font-sans uppercase tracking-wider">
                              Leads por Dia (Últimos 7 Dias)
                            </h5>
                            <div className="h-40 text-xs">
                              {profLeads.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={profReceivedLeadsTimeline} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#17182e" />
                                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                                    <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#090a16', color: '#fff' }} />
                                    <Bar dataKey="leads" fill="#5850ec" radius={[4, 4, 0, 0]} maxBarSize={24} />
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 italic">Sem registros no período.</div>
                              )}
                            </div>
                          </div>

                          <div className="bg-[#0b0c1e] p-5 rounded-2xl border border-slate-800/60 space-y-4 shadow-xl">
                            <h5 className="font-extrabold text-slate-200 text-xs flex items-center gap-1.5 font-sans uppercase tracking-wider">
                              Origem do Tráfego (Leads)
                            </h5>
                            <div className="h-40 text-xs flex flex-col justify-between">
                              {profLeads.length > 0 ? (
                                <div className="h-28 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sourceDistributionData} layout="vertical" margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#17182e" />
                                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                      <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} width={70} />
                                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#090a16', color: '#fff' }} />
                                      <Bar dataKey="value" name="Leads" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={15}>
                                        {sourceDistributionData.map((e, i) => {
                                          const colors = ["#10b981", "#3b82f6", "#f59e0b"];
                                          return <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />;
                                        })}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="h-32 flex items-center justify-center text-slate-500 italic">Sem registros para mapear fontes.</div>
                              )}
                              <div className="flex justify-center gap-4 text-[10px] text-slate-400 font-bold bg-[#070817]/40 py-2 rounded-xl border border-slate-900/40">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#10b981] rounded-full"></span>Orgânico</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#3b82f6] rounded-full"></span>Pago</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#f59e0b] rounded-full"></span>Indicação</span>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* REPUTATION & REVIEW SECTION */}
                    <div className="bg-[#0b0c1e] rounded-2xl border border-slate-800/60 p-6 space-y-6 shadow-2xl">
                      <div className="border-b border-slate-800 pb-4">
                        <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-2 font-sans uppercase tracking-tight">
                          <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                          Card de Reputação & Avaliações Públicas
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Acompanhe a classificação pública gerada pelos clientes finais sobre a qualidade dos atendimentos concluídos deste profissional.
                        </p>
                      </div>

                      {(() => {
                        const totalReviews = selectedProfReviews.length;
                        
                        // Calculate active distribution counts dynamically if any client submitted reviews
                        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                        let sumRatings = 0;
                        selectedProfReviews.forEach((r) => {
                          const val = r.rating as 5 | 4 | 3 | 2 | 1;
                          if (counts[val] !== undefined) {
                            counts[val]++;
                            sumRatings += val;
                          }
                        });
                        
                        const average = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 0;

                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column: Big Average Score Card */}
                            <div className="bg-[#070817]/80 rounded-2xl p-5 border border-slate-800/50 flex flex-col justify-center items-center text-center space-y-2.5">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">Média de Satisfação</span>
                              <div className="text-5xl font-black text-white font-sans">
                                {average > 0 ? average.toFixed(1).replace(".", ",") : "0,0"}
                              </div>
                              <div className="flex items-center gap-1 justify-center">
                                {[1, 2, 3, 4, 5].map((starVal) => {
                                  const isHalf = average > 0 && starVal <= Math.round(average);
                                  return (
                                    <Star
                                      key={starVal}
                                      className={`w-4.5 h-4.5 ${isHalf ? "text-amber-500 fill-amber-500" : "text-slate-800"}`}
                                    />
                                  );
                                })}
                              </div>
                              <span className="text-xs text-slate-400 font-bold mt-1.5 font-sans">
                                {totalReviews} {totalReviews === 1 ? "avaliação recebida" : "avaliações recebidas"}
                              </span>
                            </div>

                            {/* Middle Column: Star Distribution Histogram */}
                            <div className="bg-[#070817]/80 rounded-2xl p-5 border border-slate-800/50 flex flex-col justify-center space-y-2.5">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-sans">Distribuição de Estrelas</span>
                              {[5, 4, 3, 2, 1].map((stars) => {
                                const count = counts[stars as 5|4|3|2|1] || 0;
                                const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                                return (
                                  <div key={stars} className="flex items-center gap-3.5 text-xs">
                                    <span className="font-extrabold text-slate-400 w-3.5 text-right font-sans">{stars}★</span>
                                    <div className="flex-1 h-2 bg-[#12142d] rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-indigo-505 bg-[#5850ec] rounded-full shadow-[0_0_8px_rgba(88,80,236,0.3)] transition-all duration-300"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                    <span className="text-slate-400 font-extrabold w-10 text-right font-sans">{percent}%</span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Right Column: Recent Comments */}
                            <div className="bg-[#070817]/80 rounded-2xl p-4.5 border border-slate-800/50 flex flex-col h-56">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3 font-sans">Feedbacks Recentes</span>
                              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 divide-y divide-slate-800/40">
                                {selectedProfReviews.length > 0 ? (
                                  selectedProfReviews.map((rev) => (
                                    <div key={rev.id} className="pt-3 first:pt-0 space-y-1 text-left">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-extrabold text-slate-200">{rev.clientName || "Cliente anônimo"}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          {new Date(rev.createdAt || Date.now()).toLocaleDateString("pt-BR")}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((starVal) => (
                                          <Star
                                            key={starVal}
                                            className={`w-3 h-3 ${starVal <= rev.rating ? "text-amber-500 fill-amber-500" : "text-slate-800"}`}
                                          />
                                        ))}
                                      </div>
                                      {rev.comment && (
                                        <p className="text-[11px] text-slate-400 italic block leading-relaxed mt-1 select-all">
                                          "{rev.comment}"
                                        </p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="h-full flex items-center justify-center text-center py-6">
                                    <p className="text-xs text-slate-500 italic font-sans">Nenhum feedback recebido ainda.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* FINANCIAL SECTION: Registros de Lucros & Cadastro de Novos Ganhos */}
                    <div className="bg-[#0b0c1e] rounded-2xl border border-slate-800/60 p-6 space-y-5 shadow-2xl">
                      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-100 text-sm flex items-center gap-2 font-sans uppercase">
                            <DollarSign className="w-4.5 h-4.5 text-emerald-500" />
                            Seção Financeira & Controle Dinâmico de Lucros
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed">Insira e filtre todos os serviços prestados e lucros atribuídos à carteira profissional.</p>
                        </div>

                        <div className="bg-emerald-950/40 border border-emerald-800/40 px-3.5 py-1.5 rounded-full text-xs flex items-center justify-center gap-2 font-bold text-emerald-400 shadow-sm shrink-0 w-fit self-start md:self-auto">
                          <span>Lucro Acumulado:</span>
                          <span className="font-mono font-black text-sm">
                            R$ {selectedProf.profitRecords.reduce((acc, curr) => acc + curr.value, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Table of profit records */}
                        <div className="lg:col-span-2 space-y-4">
                          <h5 className="font-extrabold text-slate-405 text-[10px] uppercase tracking-wider font-sans ml-1">Histórico de Transações Ativas</h5>

                          {selectedProf.profitRecords && selectedProf.profitRecords.length > 0 ? (
                            <div className="border border-slate-800/70 rounded-xl overflow-hidden shadow-2xl bg-[#070817]/40">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#070817] text-slate-450 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800/80">
                                  <tr>
                                    <th className="px-4 py-3">Data de Lançamento</th>
                                    <th className="px-4 py-3">Descrição do Serviço</th>
                                    <th className="px-4 py-3 text-right font-extrabold text-emerald-400">Lucro Corrente (R$)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                                  {selectedProf.profitRecords.map((rec) => (
                                    <tr key={rec.id} className="hover:bg-[#12142d]/30 transition-all select-none">
                                      <td className="px-4 py-3 text-slate-450 font-mono">
                                        {new Date(rec.date + "T00:00:00").toLocaleDateString("pt-BR")}
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-200">{rec.description}</td>
                                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 shadow-2xs">
                                        R$ {rec.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-10 border-2 border-dashed border-slate-805/40 bg-[#070817]/30 rounded-xl text-center text-slate-500 italic text-xs">
                              Sem registros de faturamento. Lance um lucro ao lado!
                            </div>
                          )}

                          {/* Visual Centered Ver todas as transações Button */}
                          <div className="flex justify-center pt-2">
                            <button
                              type="button"
                              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/20 border border-indigo-900/40 hover:border-indigo-800/60 px-6 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              Ver todas as transações
                            </button>
                          </div>
                        </div>

                        {/* Form to submit new profit record */}
                        <div className="bg-[#070817]/80 border border-slate-800 p-4.5 rounded-2xl shadow-2xl space-y-4">
                          <h5 className="font-extrabold text-slate-205 text-[10px] flex items-center gap-1.5 font-sans uppercase tracking-wider">
                            <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
                            Inserir Lançamento Financeiro
                          </h5>
                          
                          <form onSubmit={handleAddProfitRecord} className="space-y-3.5 text-xs text-left">
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-300 block">Data da Operação *</label>
                              <input
                                type="date"
                                required
                                value={recordDate}
                                onChange={(e) => setRecordDate(e.target.value)}
                                className="w-full bg-[#03040c] border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-indigo-500 font-mono text-xs text-slate-100"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-300 block">Descrição do Lucro *</label>
                              <input
                                type="text"
                                required
                                placeholder="Consultoria, Comissão, Aula..."
                                value={recordDescription}
                                onChange={(e) => setRecordDescription(e.target.value)}
                                className="w-full bg-[#03040c] border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-indigo-500 text-xs text-slate-100 placeholder-slate-700 font-medium"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-300 block">Valor Creditado (R$) *</label>
                              <div className="relative rounded-xl shadow-inner">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-extrabold text-xs pointer-events-none">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  required
                                  value={recordValue}
                                  onChange={(e) => setRecordValue(e.target.value)}
                                  placeholder="0,00"
                                  className="w-full bg-[#03040c] border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-hidden focus:border-indigo-505 text-xs font-mono text-slate-100"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={addingProfitRecord}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5 mt-4 disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar Lucro
                            </button>
                          </form>
                        </div>

                      </div>
                    </div>

                  </div>
                ) : (
                  // 2. MASTER DIRECTORY DIRECTORY LISTING
                  <div className="space-y-5">
                    
                    {/* Top list widgets bar */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-xs gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm font-display">Corpo de Profissionais Parceiros</h3>
                        <p className="text-xs text-slate-500 mt-1">Monitore assessores, técnicos ou consultores correspondentes, seus leads recebidos e as receitas de seus respectivos canais.</p>
                      </div>
                      <button
                        onClick={handleOpenAddProfessionalModal}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4 text-indigo-200" /> Adicionar Profissional
                      </button>
                    </div>

                    {/* Table List representation */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      {professionals.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#FAFBFD] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-6 py-4">Nome do Profissional</th>
                                <th className="px-6 py-4">Especialidade / Função</th>
                                <th className="px-6 py-4">Canal HTML Vinculado</th>
                                <th className="px-6 py-4 text-center">Leads Recebidos</th>
                                <th className="px-6 py-4 text-right">Lucro Acumulado</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              {professionals.map((prof) => {
                                // Count leads with associated template ID
                                const leadCount = leads.filter(l => l.templateId === prof.templateId).length;
                                // Sum values of all corresponding profit records
                                const totalRevenue = (prof.profitRecords || []).reduce((sum, current) => sum + current.value, 0);
                                const linkedTemplate = templates.find(t => t.id === prof.templateId);

                                return (
                                  <tr key={prof.id} className="hover:bg-slate-50/50 transition-colors">
                                    {/* Column 1: Profile and contact */}
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={prof.photoUrl}
                                          alt={prof.name}
                                          className="w-10 h-10 rounded-full object-cover border border-slate-205 shrink-0"
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${prof.name}`;
                                          }}
                                        />
                                        <div className="space-y-0.5 min-w-0">
                                          <span 
                                            className="font-bold text-slate-800 block text-xs hover:text-indigo-600 transition-colors cursor-pointer truncate" 
                                            onClick={() => setSelectedProfessionalId(prof.id)}
                                          >
                                            {prof.name}
                                          </span>
                                          <span className="text-[10px] text-slate-450 block truncate">{prof.email || prof.phone || "Sem contatos cadastrados"}</span>
                                          {prof.username && (
                                            <div className="flex items-center gap-1.5 mt-1 bg-indigo-50/60 border border-indigo-100/50 rounded-sm px-1.5 py-0.5 w-max">
                                              <span className="text-[9px] font-bold text-indigo-700">User: <span className="font-mono text-slate-800">{prof.username}</span></span>
                                              <span className="text-slate-300">|</span>
                                              <span className="text-[9px] font-bold text-indigo-700">Senha: <span className="font-mono text-slate-800">{prof.password}</span></span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Column 2: Specialty role */}
                                    <td className="px-6 py-4">
                                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                        {prof.specialty}
                                      </span>
                                    </td>

                                    {/* Column 3: Linked template channel */}
                                    <td className="px-6 py-4">
                                      {linkedTemplate ? (
                                        <div className="flex flex-col space-y-0.5">
                                          <span className="text-[11px] font-semibold text-indigo-700">
                                            {linkedTemplate.name}
                                          </span>
                                          <span className="text-[9px] text-slate-450 font-mono truncate max-w-[150px]">{linkedTemplate.siteUrl}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">Nenhum canal ativo</span>
                                      )}
                                    </td>

                                    {/* Column 4: Leads count */}
                                    <td className="px-6 py-4 text-center font-bold text-slate-700 font-mono text-xs">
                                      {leadCount}
                                    </td>

                                    {/* Column 5: Accumulated profit */}
                                    <td className="px-6 py-4 text-right font-bold text-emerald-750 font-mono text-xs">
                                      R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Column 6: Action buttons */}
                                    <td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={() => setSelectedProfessionalId(prof.id)}
                                          className="text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-100 font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]"
                                        >
                                          Ver Perfil
                                        </button>
                                        <button
                                          onClick={() => handleOpenEditProfessionalModal(prof)}
                                          className="text-slate-500 hover:bg-slate-150 border border-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                                          title="Editar cadastro"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteProfessional(prof.id)}
                                          className="text-rose-500 hover:bg-rose-50 border border-rose-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                                          title="Remover profissional"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>

                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-12 text-center text-slate-400 space-y-3.5">
                          <Users className="w-10 h-10 text-slate-305 mx-auto" />
                          <div className="text-slate-500 italic text-sm">Nenhum profissional listado no banco de dados.</div>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">Vincule assessores de vendas, médicos ou engenheiros correspondentes aos seus formulários de captação externa.</p>
                          <button
                            onClick={handleOpenAddProfessionalModal}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs shadow-sm cursor-pointer mt-1"
                          >
                            Cadastrar Primeiro Profissional
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: 3. CHANNELS AND TEMPLATES WRITER */}
            {activeTab === "templates" && (
              <div className="space-y-6">
                
                {/* Header overview controls */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Estruturação de Canais Externos ({templates.length})</h3>
                    <p className="text-xs text-slate-500">Mapeie formulários individuais e seus respectivos requisitos para sites externos.</p>
                  </div>
                  
                  <button
                    id="btn-open-create-modal"
                    onClick={openCreateChannelModal}
                    className="bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Criar Novo Template
                  </button>
                </div>

                {/* Grid list of templates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((theme) => (
                    <div key={theme.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                      
                      {/* Top bar with color theme and active toggle */}
                      <div className="p-4 border-b border-slate-100 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{theme.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${theme.bgColor}`}>
                              {theme.id}
                            </span>
                          </div>
                          <a 
                            href={theme.siteUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {theme.siteUrl}
                          </a>
                        </div>

                        {/* Status active switch representation */}
                        <button
                          onClick={() => toggleTemplateActive(theme.id, theme.active)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border cursor-pointer ${
                            theme.active 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {theme.active ? "✓ Ativo" : "✕ Desativado"}
                        </button>
                      </div>

                      {/* Fields setup list preview */}
                      <div className="p-4 space-y-3 bg-slate-50/50 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Campos Vinculados ao Lead:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {theme.fields ? theme.fields.map((f, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 font-medium">
                              {f.label} <code className="text-[10px] text-slate-400 font-mono">({f.type}{f.required ? "*" : ""})</code>
                            </span>
                          )) : (
                            <span className="text-xs text-slate-400 italic">Campos básicos configurados padrão.</span>
                          )}
                        </div>

                        <div className="pt-2 flex justify-between text-xs text-slate-500">
                          <span>Criado em: {new Date(theme.createdAt || "").toLocaleDateString("pt-BR")}</span>
                          <span>Total de Conversões: <b className="text-slate-800 font-bold">{theme.leadsCount} leads</b></span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-3 bg-slate-100/50 border-t border-slate-100 flex justify-between items-center">
                        <button
                          onClick={() => {
                            setSelectedEmbedTemplateId(theme.id);
                            setEmbedWidgetTitle(`Fale Conosco - ${theme.name}`);
                            setActiveTab("embed");
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Code2 className="w-4 h-4" /> Copiar código embed script
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditChannelModal(theme)}
                            className="text-[10px] text-indigo-700 hover:text-indigo-950 font-semibold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          {theme.id !== "conserto-em-casa" && theme.id !== "bebe-familia" && theme.id !== "academia-fit" && theme.id !== "advocacia-parceiros" && (
                            <button
                              onClick={() => handleDeleteChannelTemplate(theme.id, theme.name)}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {theme.active ? "Webhooks Ativos" : "Captação bloqueada"}
                          </span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Modal Create Template Inline style sheet */}
                {showCreateTemplateModal && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
                      
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                        <h4 className="font-bold text-slate-800 text-base">
                          {editingChannel ? "Editar Canal de Captura" : "Novo Canal de Captura"}
                        </h4>
                        <button 
                          onClick={() => {
                            setShowCreateTemplateModal(false);
                            setEditingChannel(null);
                          }}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateOrUpdateChannelTemplate} className="space-y-4 text-xs">
                        
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block text-xs">Nome do Template / Negócio *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Consultas Médicas, Reformas SP"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-hidden text-slate-700"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block text-xs">Aonde esta landing page está hospedada (URL)? *</label>
                          <input
                            type="url"
                            required
                            placeholder="Ex: https://meusiteexterno.com/promocao"
                            value={newTemplateUrl}
                            onChange={(e) => setNewTemplateUrl(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-hidden text-slate-700"
                          />
                        </div>

                        <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2">
                          <span className="font-bold text-indigo-800 tracking-wider text-[10px] uppercase block">
                            Estrutura do Formulário Auto-Gerada
                          </span>
                          <p className="text-[11px] text-slate-600">
                            A tecnologia LeadCapture simplificada gera automaticamente os inputs de:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1 text-[11px]">
                            <li><b>Nome</b> (Obrigatório)</li>
                            <li><b>Telefone WhatsApp com máscara</b> (Obrigatório)</li>
                            <li><b>E-mail de contato</b> (Opcional)</li>
                          </ul>
                          <p className="text-[10px] text-indigo-500 leading-relaxed pt-1 select-none">
                            Isso assegura máxima conversão. Formulários menores geram <b>+321%</b> mais fechamento de vendas.
                          </p>
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateTemplateModal(false);
                              setEditingChannel(null);
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
                          >
                            {editingChannel ? "Salvar Alterações" : "Concluir e Salvar Canal"}
                          </button>
                        </div>

                      </form>

                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: 4. EMBED GENERATOR & SIMULATOR FOR THIRD-PARTY WEBSITES */}
            {activeTab === "embed" && (
              <div className="space-y-6">
                
                {/* Sub-tab Selection Header */}
                <div className="flex items-center gap-1.5 p-1 bg-[#0a0f26]/80 backdrop-blur-md border border-slate-800/80 rounded-xl max-w-sm">
                  <button
                    onClick={() => setEmbedTabSubMode("form")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      embedTabSubMode === "form"
                        ? "bg-[#131b3e] text-[#818cf8] border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.15)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> Formulário HTML
                  </button>
                  <button
                    onClick={() => {
                      setEmbedTabSubMode("chatbot");
                      handleResetChatbot();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      embedTabSubMode === "chatbot"
                        ? "bg-[#131b3e] text-[#818cf8] border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.15)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chatbot IA
                  </button>
                </div>

                {embedTabSubMode === "form" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-none">
                    
                    {/* Visual Options widget customization */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-800 text-sm">Gerador e Customizador de Formulário</h3>
                        <p className="text-xs text-slate-500">Modifique propriedades visuais e copie a tag HTML correspondente.</p>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">Selecione o Canal de Negócio Alvo</label>
                          <select
                            id="select-embed-template-target"
                            value={selectedEmbedTemplateId}
                            onChange={(e) => setSelectedEmbedTemplateId(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-hidden font-semibold cursor-pointer text-slate-800"
                          >
                            {templates.map(t => (
                              <option key={t.id} value={t.id} className="text-slate-800">{t.name} (ID: {t.id})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">Título do Formulário Copiado</label>
                          <input
                            id="input-embed-title"
                            type="text"
                            value={embedWidgetTitle}
                            onChange={(e) => setEmbedWidgetTitle(e.target.value)}
                            placeholder="Ex: Solicite um Contato"
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-hidden text-slate-700 font-sans"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 block">Texto do Botão</label>
                            <input
                              id="input-embed-btn-text"
                              type="text"
                              value={embedBtnText}
                              onChange={(e) => setEmbedBtnText(e.target.value)}
                              placeholder="Ex: Receber Orçamento"
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-hidden text-slate-700 font-sans"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 block">Cor do Botão de Envio</label>
                            <div className="flex gap-2 items-center">
                              <input
                                id="input-embed-btn-color"
                                type="color"
                                value={embedBtnColor}
                                onChange={(e) => setEmbedBtnColor(e.target.value)}
                                className="bg-transparent border-none w-10 h-9 p-0 outline-hidden cursor-pointer"
                              />
                              <span className="font-mono text-slate-600 font-semibold uppercase">{embedBtnColor}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Seu Script HTML</span>
                            <button
                              id="btn-copy-embed-script"
                              onClick={handleCopyCode}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded"
                            >
                              {copiedScript ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-3.5 h-3.5" />
                                  Copiar Tag
                                </>
                              )}
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Cole esta linha em qualquer lugar do seu site externo (ex: WordPress, HTML cru, Wix, Webflow, Shopify). O formulário aparecerá instantaneamente formatado!
                          </p>

                          <textarea
                            readOnly
                            value={embedCodeSnippet}
                            onClick={(e) => (e.target as any).select()}
                            className="w-full h-32 p-3 bg-slate-800 text-indigo-200 font-mono text-[11px] rounded-lg border border-slate-700 focus:outline-hidden resize-none select-all overflow-x-auto leading-relaxed whitespace-pre font-sans"
                          />

                        </div>

                      </div>

                    </div>

                    {/* Interactive live test simulator of simulated external submit */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-800 text-sm">Emulador Interativo Live Sandbox</h3>
                        <p className="text-xs text-slate-500">Mapeamos exatamente como o prospecto visualizará no site externo.</p>
                      </div>

                      {/* Form Live preview wrapper, reactive dynamically */}
                      <div className="p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300 space-y-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider text-center select-none font-sans">
                          Visualização no Site do Cliente
                        </span>

                        <div className="mx-auto max-w-sm bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                          {simSuccess ? (
                            <SuccessScreen 
                              onReset={() => setSimSuccess(false)}
                              title="Inscrição Realizada com Sucesso!"
                              message="Obrigado por se cadastrar! As regras de distribuição e o roteamento automático do Lead foram processados na plataforma em tempo real."
                            />
                          ) : (
                            <div className="p-5 space-y-4">
                              <h4 className="text-center font-bold text-slate-800 text-base font-sans">
                                {embedWidgetTitle || "Solicite um Contato"}
                              </h4>

                              <form onSubmit={handleSimulateSubmit} className="space-y-3 font-sans">
                                
                                <div className="space-y-0.5">
                                  <label className="text-[10px] font-bold text-slate-700 ml-0.5">Nome Completo *</label>
                                  <input
                                    id="sim-input-name"
                                    type="text"
                                    required
                                    placeholder="Qual o seu nome?"
                                    value={simName}
                                    onChange={(e) => setSimName(e.target.value)}
                                    className="w-full text-xs p-2 bg-slate-50 focus:bg-white text-slate-900 font-semibold placeholder:text-slate-400 outline-hidden border border-slate-300 rounded-lg focus:border-indigo-500 transition-colors"
                                  />
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[10px] font-bold text-slate-700 ml-0.5">Número de WhatsApp *</label>
                                  <input
                                    id="sim-input-phone"
                                    type="tel"
                                    required
                                    placeholder="Ex: (11) 99876-5432"
                                    value={simPhone}
                                    onChange={(e) => setSimPhone(e.target.value)}
                                    className="w-full text-xs p-2 bg-slate-50 focus:bg-white text-slate-900 font-semibold placeholder:text-slate-400 outline-hidden border border-slate-300 rounded-lg focus:border-indigo-500 transition-colors"
                                  />
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[10px] font-bold text-slate-700 ml-0.5">Endereço Residencial (rua, número, bairro) *</label>
                                  <input
                                    id="sim-input-address"
                                    type="text"
                                    required
                                    placeholder="Ex: Rua das Flores, 123 - Centro"
                                    value={simAddress}
                                    onChange={(e) => setSimAddress(e.target.value)}
                                    className="w-full text-xs p-2 bg-slate-50 focus:bg-white text-slate-900 font-semibold placeholder:text-slate-400 outline-hidden border border-slate-300 rounded-lg focus:border-indigo-500 transition-colors"
                                  />
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[10px] font-bold text-slate-700 ml-0.5">Cidade *</label>
                                  <input
                                    id="sim-input-city"
                                    type="text"
                                    required
                                    placeholder="Ex: São Paulo"
                                    value={simCity}
                                    onChange={(e) => setSimCity(e.target.value)}
                                    className="w-full text-xs p-2 bg-slate-50 focus:bg-white text-slate-900 font-semibold placeholder:text-slate-400 outline-hidden border border-slate-300 rounded-lg focus:border-indigo-500 transition-colors"
                                  />
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[10px] font-bold text-slate-700 ml-0.5">Descrição do Problema ou Serviço *</label>
                                  <textarea
                                    id="sim-input-description"
                                    required
                                    placeholder="Digite a sua solicitação detalhada..."
                                    value={simDescription}
                                    onChange={(e) => setSimDescription(e.target.value)}
                                    className="w-full text-xs p-2 h-16 bg-slate-50 focus:bg-white text-slate-900 font-semibold placeholder:text-slate-400 outline-hidden border border-slate-300 rounded-lg focus:border-indigo-500 transition-colors font-sans"
                                  />
                                </div>

                                <button
                                  id="btn-submit-test-lead"
                                  type="submit"
                                  disabled={simulating}
                                  style={{ backgroundColor: embedBtnColor }}
                                  className="w-full text-white font-bold py-2.5 rounded-lg text-xs leading-none mt-2 shadow-xs transition-opacity hover:opacity-90 disabled:opacity-55 cursor-pointer text-center font-sans"
                                >
                                  {simulating ? "Transmitindo Webhook..." : embedBtnText || "Enviar Mensagem"}
                                </button>
                              </form>

                              <div className="text-[9px] text-center text-slate-400 select-none font-sans">
                                Tecnologia SaaS Protegida por LeadCapture
                              </div>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="space-y-6 font-sans w-full text-left">
                    
                    {/* Interactive Sub-tab Selector */}
                    <div className="flex border-b border-slate-800/80 pb-0.5 gap-6 text-xs text-slate-400 select-none overflow-x-auto scrollbar-none shrink-0" style={{ scrollbarWidth: 'none' }}>
                      {[
                        { id: "personalizacao", label: "Personalização" },
                        { id: "comportamento", label: "Comportamento" },
                        { id: "integracoes", label: "Integrações" },
                        { id: "aparencia", label: "Aparência" },
                        { id: "avancado", label: "Avançado" }
                      ].map((tb) => (
                        <button
                          key={tb.id}
                          type="button"
                          onClick={() => {
                            setActiveChatSubTab(tb.id);
                          }}
                          className={`pb-2.5 font-bold transition-all relative cursor-pointer outline-hidden ${
                            activeChatSubTab === tb.id
                              ? "text-indigo-400 font-extrabold border-b-2 border-indigo-500"
                              : "hover:text-slate-200 text-slate-400"
                          }`}
                        >
                          {tb.label}
                          {activeChatSubTab === tb.id && (
                            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]"></span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start font-sans">
                      
                      {/* CONFIGURATION COLUMN PANELS */}
                      <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 1. PERSONALIZAÇÃO CARD PANEL */}
                        <div 
                          className={`bg-[#0a0e28]/70 backdrop-blur-md rounded-2xl border p-5 space-y-4 transition-all duration-300 ${
                            activeChatSubTab === "personalizacao"
                              ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                              : "border-slate-800/80"
                          }`}
                        >
                          <div className="border-b border-slate-800/50 pb-3">
                            <div className="flex items-center gap-1.5 text-indigo-400 text-left">
                              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                              <h3 className="font-bold text-white text-sm">Personalização do Chatbot IA</h3>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Configure as informações e o comportamento do seu assistente virtual.</p>
                          </div>

                          <div className="space-y-4 text-xs">
                            <div className="space-y-1.5 text-left">
                              <label className="font-semibold text-slate-300 block text-xs">Selecione o Canal de Negócio Alvo</label>
                              <select
                            id="select-chatbot-template-target"
                            value={selectedEmbedTemplateId}
                            onChange={(e) => setSelectedEmbedTemplateId(e.target.value)}
                            className="w-full p-2.5 bg-[#131a3d]/50 border border-slate-800 focus:bg-[#131a3d]/90 focus:border-indigo-500 rounded-lg outline-hidden font-semibold cursor-pointer text-slate-100 text-xs"
                          >
                            {templates.map(t => (
                              <option key={t.id} value={t.id} className="text-slate-800 bg-white">{t.name} (ID: {t.id})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="font-semibold text-slate-300 block text-xs font-sans">Nome do Assistente Virtual</label>
                          <input
                            id="input-chatbot-title"
                            type="text"
                            value={chatbotWidgetTitle}
                            onChange={(e) => setChatbotWidgetTitle(e.target.value)}
                            placeholder="Ex: Assistente de Vendas, Sofia"
                            className="w-full p-2.5 bg-[#131a3d]/50 border border-slate-800 focus:border-indigo-500 rounded-lg outline-hidden text-slate-100 font-semibold text-xs"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="font-semibold text-slate-300 block text-xs mb-1">Cor do Avatar e Balões</label>
                          <div className="flex gap-2 items-center">
                            <input
                              id="input-chatbot-avatar-color"
                              type="color"
                              value={chatbotAvatarColor}
                              onChange={(e) => setChatbotAvatarColor(e.target.value)}
                              className="bg-transparent border-none w-10 h-9 p-0 outline-hidden cursor-pointer"
                            />
                            <span className="font-mono text-slate-300 font-bold uppercase text-xs">{chatbotAvatarColor}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="font-semibold text-slate-300 block text-xs">Imagem de Avatar Personalizada</label>
                          <div className="flex items-center gap-3 bg-[#131a3d]/30 p-2.5 rounded-xl border border-slate-800">
                            {chatbotAvatarUrl ? (
                              <div className="relative w-12 h-12 rounded-full border border-indigo-500/30 overflow-hidden group shrink-0">
                                <img 
                                  src={chatbotAvatarUrl} 
                                  alt="Custom Avatar" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setChatbotAvatarUrl("")}
                                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Remover imagem"
                                >
                                  <X className="w-4 h-4 text-rose-400" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-[#131a3d]/50 border-2 border-dashed border-slate-700 flex items-center justify-center shrink-0">
                                <Image className="w-5 h-5 text-slate-500" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0 font-sans">
                              <p className="text-[10px] text-slate-400 leading-normal">
                                {chatbotAvatarUrl ? "Imagem carregada com sucesso!" : "Formatos aceitos: JPG, PNG, WEBP."}
                              </p>
                              
                              <div className="flex gap-2 mt-1">
                                <label className="text-[10px] font-bold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 px-2.5 py-1 rounded transition-colors cursor-pointer inline-block">
                                  <span>Carregar Imagem</span>
                                  <input 
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          if (typeof reader.result === "string") {
                                            setChatbotAvatarUrl(reader.result);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                                {chatbotAvatarUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setChatbotAvatarUrl("")}
                                    className="text-[10px] font-bold text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-slate-800 px-2.5 py-1 rounded transition-colors cursor-pointer"
                                  >
                                    Limpar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between items-center">
                            <label className="font-semibold text-slate-300 block text-xs">Frase Inicial do Bot</label>
                            <span className="text-[10px] text-slate-500 font-mono font-bold leading-none">{chatbotWelcomeMsg?.length || 0}/160</span>
                          </div>
                          <textarea
                            id="input-chatbot-welcome-txt"
                            value={chatbotWelcomeMsg}
                            maxLength={160}
                            onChange={(e) => setChatbotWelcomeMsg(e.target.value)}
                            className="w-full h-18 p-2.5 bg-[#131a3d]/50 focus:bg-white focus:text-slate-900 outline-hidden border border-slate-800 rounded-lg text-slate-100 resize-none leading-relaxed text-xs"
                          />
                        </div>

                        {/* Interactive Script Snippet Panel inside Personalização */}
                        <div className={`pt-4 border-t border-slate-800/80 space-y-2 text-left transition-all ${activeChatSubTab === "integracoes" ? "p-3 bg-indigo-950/20 rounded-xl border border-indigo-900/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]" : ""}`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-white flex items-center gap-1 text-xs">
                              <Code2 className="w-4 h-4 text-indigo-400" />
                              Script do Chatbot para seu Site
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsMobileChatOpen(true);
                                  setIsTestChatbotModalOpen(true);
                                  if (chatMessages.length === 0) {
                                    handleResetChatbot();
                                  }
                                }}
                                className="text-[10px] text-emerald-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/30 px-2.5 py-1 rounded transition-colors border border-emerald-500/15"
                                title="Abrir simulador do Chatbot flutuante"
                              >
                                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                                Testar Chatbot
                              </button>
                              <button
                                id="btn-copy-chatbot-script"
                                onClick={() => {
                                  const codeSnippet = `<!-- Widget Chatbot IA LeadCapture -->\n<script \n  src="${apiHost}/embed.js" \n  data-template-id="${selectedEmbedTemplateId || "conserto-em-casa"}" \n  data-chatbot="true" \n  data-title="${chatbotWidgetTitle}" \n  data-color="${chatbotAvatarColor}"\n  async>\n</script>`;
                                  navigator.clipboard.writeText(codeSnippet);
                                  alert("Script do Chatbot IA copiado com sucesso!");
                                }}
                                className="text-[10px] text-indigo-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/30 px-2 py-1 rounded transition-colors"
                              >
                                Copiar Snippet
                              </button>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-normal">
                            Cole este código na tag <code className="font-mono text-indigo-300 bg-slate-900/80 px-1 rounded">&lt;body&gt;</code> do seu site institucional.
                          </p>
                          <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-slate-300 font-mono text-[9px] overflow-x-auto whitespace-pre leading-relaxed select-all">
{`<!-- Widget Chatbot IA LeadCapture -->
<script 
  src="${apiHost}/embed.js"
  data-template-id="${selectedEmbedTemplateId || "conserto-em-casa"}"
  data-chatbot="true"
  data-title="${chatbotWidgetTitle}"
  data-color="${chatbotAvatarColor}"
  async>
</script>`}
                          </div>
                          <p className="text-[9px] text-indigo-400/90 font-semibold italic">
                            ⓘ O robô irá carregar flutuando no canto inferior direito!
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* 2. COMPORTAMENTO AVANÇADO CARD PANEL */}
                    <div 
                      className={`bg-[#0a0e28]/70 backdrop-blur-md rounded-2xl border p-5 space-y-4 transition-all duration-300 ${
                        activeChatSubTab === "comportamento" || activeChatSubTab === "avancado"
                          ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                          : "border-slate-800/80"
                      }`}
                    >
                      <div className="space-y-4 text-xs font-sans">
                        
                        {/* Tom de Voz Selection */}
                        <div className="space-y-1.5 text-left">
                          <label className="font-semibold text-slate-300 block text-xs">Tom de Voz da Inteligência Artificial</label>
                          <select
                            id="select-chatbot-tone"
                            value={chatbotToneOfVoice}
                            onChange={(e) => setChatbotToneOfVoice(e.target.value)}
                            className="w-full p-2.5 bg-[#131a3d]/50 border border-slate-850 focus:bg-[#131a3d]/90 focus:border-indigo-500 rounded-lg outline-hidden font-semibold cursor-pointer text-slate-100 text-xs"
                          >
                            <option value="amigavel-casual" className="text-slate-800 bg-white">😊 Amigável &amp; Casual (Leve e próximo)</option>
                            <option value="profissional-formal" className="text-slate-800 bg-white">👔 Profissional &amp; Formal (Polido e corporativo)</option>
                            <option value="tecnico-especialista" className="text-slate-800 bg-white">🔬 Técnico &amp; Especialista (Autoridade e preciso)</option>
                            <option value="entusiasmado-vendas" className="text-slate-800 bg-white">⚡ Foco Comercial (Persuasivo, focado em conversão)</option>
                            <option value="calmo-empatico" className="text-slate-800 bg-white">💖 Calmo &amp; Empático (Acolhedor e compassivo)</option>
                          </select>
                          <span className="text-[10px] text-indigo-400 block leading-normal pt-1.5 italic font-sans">
                            💡 {chatbotToneOfVoice === "amigavel-casual" && "O robô usará saudações empáticas, exclamações simpáticas e emojis moderados para se conectar."}
                            {chatbotToneOfVoice === "profissional-formal" && "Foco profissional perfeito para advocacia ou saúde pública. Linguagem respeitosa e sem emojis exagerados."}
                            {chatbotToneOfVoice === "tecnico-especialista" && "Respostas detalhadas com terminologia precisa para demonstrar autoridade técnica."}
                            {chatbotToneOfVoice === "entusiasmado-vendas" && "Atendimento focado em incentivar o lead a fechar com urgência e interesse no agendamento breve."}
                            {chatbotToneOfVoice === "calmo-empatico" && "Linguagem sensível e prestativa que acolhe bem o cliente enquanto conduz para agendamento seguro."}
                          </span>
                        </div>

                        {/* Persona Description */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex justify-between items-center">
                            <label className="font-semibold text-slate-300 block text-xs">Persona de Atendimento (Instruções Principais)</label>
                            <button
                              type="button"
                              onClick={() => {
                                const cName = templates.find(t => t.id === selectedEmbedTemplateId)?.name || 'nossa empresa';
                                setChatbotPersonaDescription(`Você é Sofia, correspondente virtual especializada em captação de clientes para ${cName}. Seu tom é ágil e dinâmico, sempre com o objetivo de obter o Nome e o WhatsApp do cliente para agendar a primeira consulta.`);
                              }}
                              className="text-[10px] text-indigo-400 hover:underline cursor-pointer bg-transparent border-none py-0 px-1 font-semibold"
                            >
                              Usar Modelo Pro
                            </button>
                          </div>
                          <textarea
                            id="textarea-chatbot-persona"
                            value={chatbotPersonaDescription}
                            onChange={(e) => setChatbotPersonaDescription(e.target.value)}
                            placeholder="Defina quem o robô representa (Ex: Sofia, especialista em captação comercial...)"
                            className="w-full h-20 p-2.5 bg-[#131a3d]/50 focus:bg-white focus:text-slate-900 outline-hidden border border-slate-850 rounded-lg text-slate-100 resize-none leading-relaxed text-xs font-sans"
                          />
                        </div>

                        {/* Simulated Delay slider */}
                        <div className="space-y-1.5 text-left pb-1">
                          <div className="flex justify-between text-xs">
                            <label className="font-semibold text-slate-300">Tempo de Resposta Simulado da IA</label>
                            <span className="font-mono font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-1.5 py-0.5 rounded leading-none">{(chatbotResponseDelay / 1000).toFixed(1)}s</span>
                          </div>
                          <div className="flex items-center pt-1.5">
                            <input
                              id="range-chatbot-delay"
                              type="range"
                              min="0"
                              max="4000"
                              step="500"
                              value={chatbotResponseDelay}
                              onChange={(e) => setChatbotResponseDelay(Number(e.target.value))}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 pt-1 select-none font-mono">
                            <span>Imediato (0s)</span>
                            <span>Normal (1s)</span>
                            <span>Realista (2.5s)</span>
                            <span>Humanizado (4s)</span>
                          </div>
                        </div>

                        {/* Business system rules guidelines */}
                        <div className="space-y-1.5 text-left pt-1">
                          <label className="font-semibold text-slate-300 block text-xs">Diretrizes de Negócio &amp; Regras de Conduta</label>
                          <textarea
                            id="textarea-chatbot-rules"
                            value={chatbotSystemRules}
                            onChange={(e) => setChatbotSystemRules(e.target.value)}
                            placeholder="Adicione regras específicas do negócio (Ex:&#10;1. Ofereça uma avaliação grátis para novos leads.&#10;2. Nunca fale preços finais sem obter o telefone do lead primeiro.)"
                            className="w-full h-20 p-2.5 bg-[#131a3d]/50 focus:bg-white focus:text-slate-900 outline-hidden border border-slate-851 rounded-lg text-slate-100 resize-none leading-relaxed text-xs font-mono"
                          />
                          <p className="text-[9px] text-slate-400 leading-tight">Estas regras são injetadas no prompt do modelo Gemini 3.5-Flash para guiar as conversas de acordo com a conduta corporativa.</p>
                        </div>

                      </div>
                    </div>
                  </div>

                    {/* INTERACTIVE CHATBOT LIVE PREVIEW & EXTRACTION ANALYSIS */}
                    <div className="xl:col-span-4 space-y-4">
                      
                      {/* Embed Live preview representing user's prospective layout - Styled as simulated mobile smartphone */}
                      <div className="relative mx-auto w-full max-w-[360px] bg-[#1e293b] rounded-[48px] p-4.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-4 border-[#334155]">
                        {/* Speaker & Sensor bar */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-between px-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                          <span className="w-12 h-1 bg-slate-900 rounded-full"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-950"></span>
                        </div>

                        {/* Outer power/volume side buttons simulation */}
                        <div className="absolute -left-1 top-28 w-1 h-12 bg-slate-600 rounded-l-md"></div>
                        <div className="absolute -left-1 top-44 w-1 h-12 bg-slate-600 rounded-l-md"></div>
                        <div className="absolute -right-1 top-36 w-1 h-16 bg-slate-600 rounded-r-md"></div>

                        {/* Internal Screen Area */}
                        <div className="bg-white rounded-[32px] overflow-hidden border border-slate-700/30 flex flex-col h-[540px] relative select-none font-sans">
                          
                          {/* Simulated Device Header/Status Bar */}
                          <div className="bg-slate-900 text-white/90 text-[10px] px-5 pt-7 pb-1.5 flex justify-between items-center z-40 relative select-none border-b border-white/5">
                            <span className="font-bold">19:02</span>
                            <div className="flex items-center gap-1.5">
                              {/* Signal strength lines */}
                              <div className="flex gap-0.5 items-end h-2.5">
                                <span className="w-[1.5px] h-1 bg-white rounded-xs"></span>
                                <span className="w-[1.5px] h-1.5 bg-white rounded-xs"></span>
                                <span className="w-[1.5px] h-2 bg-white rounded-xs"></span>
                                <span className="w-[1.5px] h-2.5 bg-white rounded-xs"></span>
                              </div>
                              <span className="font-semibold text-[8px]">5G</span>
                              {/* Battery representation */}
                              <div className="w-5 h-2.5 border border-white/60 rounded-xs p-px flex items-center justify-start">
                                <div className="w-[90%] h-full bg-[#10b981] rounded-xs"></div>
                              </div>
                            </div>
                          </div>

                          {/* SCREEN VIEWPORT SELECTION */}
                          {!isMobileChatOpen ? (
                            /* SCREEN 1: PORTAL WEB INSTITUCIONAL SIMULADO (CLIENT'S SITE) */
                            <div className="flex-1 flex flex-col bg-slate-50 relative overflow-y-auto overflow-x-hidden">
                              {/* Mock Website Brand Header */}
                              <div className="bg-white px-3.5 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                                    LC
                                  </div>
                                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Consertos Já</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                  <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600">Site Ativo</span>
                                </div>
                              </div>

                              {/* Website Hero Section banner */}
                              <div className="p-4 bg-gradient-to-br from-indigo-950 to-slate-900 text-white space-y-2 text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                <span className="text-[9px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest inline-block">
                                  Atendimento Rápido
                                </span>
                                <h5 className="font-extrabold text-sm leading-tight">Serviços Residenciais Rápidos</h5>
                                <p className="text-[10px] text-slate-300 leading-relaxed font-sans font-normal">
                                  Precisa consertar algo em casa? Nossa equipe de encanadores, eletricistas e pintores atende você em minutos!
                                </p>
                              </div>

                              {/* Featured list item cards */}
                              <div className="p-4 space-y-3 flex-1 text-left">
                                <h6 className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">Nossos Serviços</h6>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2.5 bg-white border border-slate-200/65 rounded-lg space-y-1 shadow-xs">
                                    <span className="text-sm">🔧</span>
                                    <p className="font-bold text-slate-800 text-[10px]">Eletricista</p>
                                    <p className="text-[9px] text-slate-400 font-sans leading-tight">Painéis, tomadas e reparos</p>
                                  </div>
                                  <div className="p-2.5 bg-white border border-slate-200/65 rounded-lg space-y-1 shadow-xs">
                                    <span className="text-sm">🚰</span>
                                    <p className="font-bold text-slate-800 text-[10px]">Encanador</p>
                                    <p className="text-[9px] text-slate-400 font-sans leading-tight">Vazamentos e tubos</p>
                                  </div>
                                </div>

                                <div className="mt-2.5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5 relative">
                                  <p className="font-extrabold text-slate-950 text-[11px]">Chatbot de WhatsApp IA</p>
                                  <p className="text-[10px] text-slate-600 leading-normal font-sans">
                                    Clique no botão flutuante de WhatsApp abaixo para simular o chatbot no dispositivo móvel!
                                  </p>
                                </div>
                              </div>

                              {/* WhatsApp Float Button container */}
                              <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2.5 z-40">
                                {/* Floating tooltip badge pleading click */}
                                <div className="bg-slate-900 border border-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-lg relative animate-bounce flex items-center gap-1.5 select-none font-sans whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] inline-block animate-pulse"></span>
                                  Clique para testar chat!
                                  <div className="absolute bottom-[-4px] right-4 w-2.5 h-2.5 bg-slate-900 border-r border-b border-slate-800 transform rotate-45"></div>
                                </div>

                                {/* Pulse green WhatsApp circle icon btn */}
                                <button
                                  type="button"
                                  onClick={() => setIsMobileChatOpen(true)}
                                  className="w-12 h-12 rounded-full bg-[#25d366] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(37,211,102,0.4)] hover:bg-[#20ba5a] active:scale-90 transition-all cursor-pointer relative"
                                  title="Abrir Chatbot de WhatsApp"
                                >
                                  {/* Absolute ripple waves */}
                                  <span className="absolute inset-0 rounded-full border-4 border-[#25d366]/40 animate-ping opacity-75"></span>
                                  
                                  {/* Custom beautiful SVG WhatsApp icon */}
                                  <svg className="w-6 h-6 text-white fill-current shrink-0" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.115.95 11.48.95c-5.44 0-9.866 4.372-9.87 9.802 0 1.63.463 3.224 1.34 4.625l-.997 3.644 3.737-.968zM17.61 14.11c-.33-.165-1.947-.96-2.246-1.068-.3-.11-.518-.165-.736.165-.218.33-.842 1.068-1.031 1.286-.19.217-.38.244-.71.079-1.284-.643-2.148-1.123-2.99-2.564-.222-.38-.043-.604.14-.783.166-.162.33-.383.495-.575.165-.19.21-.33.31-.55.11-.217.05-.41-.02-.575-.08-.166-.736-1.776-1.01-2.435-.26-.64-.54-.54-.73-.55l-.63-.01c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71 0 1.6 1.16 3.15 1.32 3.37.165.22 2.29 3.5 5.55 4.9.77.34 1.38.54 1.85.69.78.24 1.48.21 2.04.13.62-.09 1.947-.8 2.22-1.53.272-.73.272-1.35.19-1.48-.08-.13-.3-.22-.63-.385z"/>
                                  </svg>
                                  <span className="absolute top-[-3px] right-[-1px] w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold shadow-xs">
                                    1
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* SCREEN 2: ACTIVE WHATSAPP CHAT OVERLAY INTERACTIVE VIEWPORT */
                            <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden animate-fade-in">
                              
                              {/* WhatsApp Chat header mockup */}
                              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800/10 select-none text-white z-20 shadow-xs shrink-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {/* Return arrow sets isMobileChatOpen(false) to toggle simulation back */}
                                  <button
                                    type="button"
                                    onClick={() => setIsMobileChatOpen(false)}
                                    className="p-1 hover:bg-slate-800 rounded-full text-white transition-colors cursor-pointer shrink-0"
                                    title="Voltar para o site"
                                  >
                                    <ArrowLeft className="w-4 h-4" />
                                  </button>
                                  
                                  <div 
                                    className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 relative animate-fade-in overflow-hidden shadow-sm" 
                                    style={{ backgroundColor: chatbotAvatarColor }}
                                  >
                                    {chatbotAvatarUrl ? (
                                      <img 
                                        src={chatbotAvatarUrl} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover rounded-full" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <Bot className="w-6 h-6" />
                                    )}
                                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-slate-900"></span>
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <h4 className="font-bold text-white text-[12px] leading-tight truncate">{chatbotWidgetTitle}</h4>
                                    <p className="text-[9px] text-[#25d366] font-semibold leading-none mt-0.5">
                                      Online
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={handleResetChatbot}
                                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Limpar Histórico"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsMobileChatOpen(false)}
                                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
                                    title="Fechar Chat"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Conversational Screen Messages Body */}
                              <div 
                                className="flex-1 overflow-y-auto px-3 py-3 space-y-3 font-sans relative"
                                style={{ 
                                  backgroundColor: "#efeae2", 
                                  backgroundImage: `radial-gradient(circle, #dfdcd6 1px, transparent 1px)`, 
                                  backgroundSize: "18px 18px" 
                                }}
                              >
                                <div className="flex justify-center select-none py-0.5">
                                  <span className="bg-white/90 text-[9px] text-slate-500 font-medium px-2.5 py-0.5 rounded shadow-3xs uppercase tracking-wide">
                                    Hoje
                                  </span>
                                </div>

                                {chatMessages.length === 0 ? (
                                  <div className="text-center text-[10px] text-slate-400 py-6 font-medium">
                                    Iniciando conversa...
                                  </div>
                                ) : (
                                  chatMessages.map(msg => (
                                    <div 
                                      key={msg.id} 
                                      className={`flex items-start gap-1 max-w-[88%] ${msg.sender === "user" ? "ml-auto" : "mr-auto"}`}
                                    >
                                      {msg.sender === "bot" && (
                                        <div 
                                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 shadow-3xs overflow-hidden"
                                          style={{ backgroundColor: chatbotAvatarColor }}
                                        >
                                          {chatbotAvatarUrl ? (
                                            <img
                                              src={chatbotAvatarUrl}
                                              alt="Bot Avatar"
                                              className="w-full h-full object-cover rounded-full"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <Bot className="w-5 h-5" />
                                          )}
                                        </div>
                                      )}
                                      <div 
                                        className={`p-2 pb-5 text-[12px] leading-relaxed shadow-[0_1px_0.5px_rgba(0,0,0,0.12)] relative text-left min-w-[70px] max-w-full ${
                                          msg.sender === "user" 
                                            ? "bg-[#d9fdd3] text-slate-900 rounded-[12px] rounded-tr-none" 
                                            : "bg-white text-slate-900 rounded-[12px] rounded-tl-none"
                                        }`}
                                      >
                                        <p className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</p>
                                        
                                        {msg.sender === "user" ? (
                                          <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5 text-[8px] text-[#8696a0] font-sans select-none">
                                            <span>
                                              {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            <svg className="w-3 h-3 text-[#53bdeb] shrink-0 inline-block" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M1.5 5.5L4.5 8.5L10 3" stroke="currentColor" />
                                              <path d="M5.5 5.5L8.5 8.5L14 3" stroke="currentColor" />
                                            </svg>
                                          </div>
                                        ) : (
                                          <span className="absolute bottom-1 right-1.5 text-[8px] text-[#8696a0] font-sans select-none">
                                            {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}

                                {chatIsTyping && (
                                  <div className="flex items-start gap-1 max-w-[85%]">
                                    <div 
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 shadow-3xs overflow-hidden"
                                      style={{ backgroundColor: chatbotAvatarColor }}
                                    >
                                      {chatbotAvatarUrl ? (
                                        <img
                                          src={chatbotAvatarUrl}
                                          alt="Bot Avatar"
                                          className="w-full h-full object-cover rounded-full"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <Bot className="w-5 h-5" />
                                      )}
                                    </div>
                                    <div className="bg-white text-slate-500 shadow-[0_1px_0.5px_rgba(0,0,0,0.12)] rounded-[12px] rounded-tl-none p-2.5 px-3 flex items-center justify-center min-w-[50px]">
                                      <div className="flex items-center gap-1.5 py-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }}></div>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "200ms", animationDuration: "1s" }}></div>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "400ms", animationDuration: "1s" }}></div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Clickable Quick Replies Carousel */}
                              <div className="flex gap-1.5 overflow-x-auto px-3 py-1.5 bg-[#efeae2]/40 border-t border-[#dfdcd6]/50 scrollbar-none shrink-0 select-none">
                                {computedQuickReplies.map((reply, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => !chatIsTyping && sendUserMessage(reply)}
                                    disabled={chatIsTyping}
                                    className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#00a884]/40 text-[#00a884] text-[10px] font-bold px-3 py-1.5 rounded-full shadow-3xs transition-all whitespace-nowrap active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    💡 {reply}
                                  </button>
                                ))}
                              </div>

                              {/* WhatsApp Chat input footer form */}
                              <form onSubmit={handleSendChatMessage} className="flex items-center gap-1.5 px-2 py-2.5 bg-[#efeae2] border-t border-[#dfdcd6] select-none font-sans shrink-0">
                                {/* Input Pill */}
                                <div className="flex-1 bg-white rounded-2xl flex items-center px-3.5 py-1.5 shadow-xs border border-[#e3e1db] min-w-0">
                                  <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0 transition-colors">
                                    <Smile className="w-5 h-5" />
                                  </button>
                                  <textarea
                                    ref={textareaRef1}
                                    required
                                    value={chatInputText}
                                    disabled={chatIsTyping}
                                    onChange={(e) => {
                                      setChatInputText(e.target.value);
                                      e.target.style.height = "auto";
                                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        if (chatInputText.trim() && !chatIsTyping) {
                                          const userText = chatInputText.trim();
                                          setChatInputText("");
                                          resetTextareaHeights();
                                          sendUserMessage(userText);
                                        }
                                      }
                                    }}
                                    placeholder="Mensagem..."
                                    rows={1}
                                    className="flex-1 border-0 outline-hidden ring-0 px-2.5 py-1 text-[13px] bg-transparent text-slate-800 placeholder-slate-400 focus:ring-0 font-sans min-w-0 resize-none h-auto max-h-[120px] leading-tight overflow-y-auto"
                                  />
                                </div>

                                {/* Send circle button */}
                                <button
                                  type="submit"
                                  disabled={!chatInputText.trim() || chatIsTyping}
                                  className="bg-[#00a884] hover:bg-[#008f72] text-white rounded-full w-10.5 h-10.5 flex items-center justify-center shrink-0 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                  <Send className="w-4.5 h-4.5 text-white transform rotate-0 ml-0.5" />
                                </button>
                              </form>

                            </div>
                          )}

                        </div>
                      </div>

                      {/* EXTRACTION REAL-TIME DASHBOARD (USER FEEDBACK) */}
                      <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3 font-mono shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                            Extração Cognitiva Real-Time (IA)
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full">
                            {chatHasCompleteBasicInfo ? "✓ Básico Coletado" : "⚡ Processando..."}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                          
                          <div className={`p-2 rounded-lg border transition-all ${chatExtractedData.name ? "bg-emerald-950/40 border-emerald-950/50 text-emerald-200" : "bg-slate-950/20 border-slate-850 text-slate-500"}`}>
                            <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px]">
                              <span>👤 Nome Completo:</span>
                              <span className="text-[9px] text-emerald-400">{chatExtractedData.name ? "✓ Lido" : "Aguardando"}</span>
                            </div>
                            <div className="font-sans font-bold truncate text-white">{chatExtractedData.name || "—"}</div>
                          </div>

                          <div className={`p-2 rounded-lg border transition-all ${chatExtractedData.phone ? "bg-emerald-950/40 border-emerald-950/50 text-emerald-200" : "bg-slate-950/20 border-slate-850 text-slate-500"}`}>
                            <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px]">
                              <span>📞 WhatsApp:</span>
                              <span className="text-[9px] text-emerald-400">{chatExtractedData.phone ? "✓ Lido" : "Aguardando"}</span>
                            </div>
                            <div className="font-sans font-bold truncate text-white">{chatExtractedData.phone || "—"}</div>
                          </div>

                          <div className={`p-2 rounded-lg border transition-all ${chatExtractedData.email ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-200" : "bg-slate-950/20 border-slate-850 text-slate-500"}`}>
                            <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px]">
                              <span>✉️ E-mail:</span>
                              <span className="text-[9px] text-emerald-400">{chatExtractedData.email ? "✓ Lido" : "Opcional"}</span>
                            </div>
                            <div className="font-sans font-semibold truncate text-white text-[10px]">{chatExtractedData.email || "—"}</div>
                          </div>

                          <div className={`p-2 rounded-lg border transition-all ${chatExtractedData.address ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-200" : "bg-slate-950/20 border-slate-850 text-slate-500"}`}>
                            <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px]">
                              <span>📍 Localização:</span>
                              <span className="text-[9px] text-emerald-400">{chatExtractedData.address ? "✓ Lido" : "Opcional"}</span>
                            </div>
                            <div className="font-sans font-semibold truncate text-white text-[10px]">{chatExtractedData.address || "—"}</div>
                          </div>

                        </div>

                        <div className={`p-2 rounded-lg border transition-all ${chatExtractedData.description ? "bg-emerald-950/40 border-emerald-950/50 text-emerald-200" : "bg-slate-950/20 border-slate-850 text-slate-500"}`}>
                          <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px]">
                            <span>📝 Descrição da Necessidade/Serviço:</span>
                            <span className="text-[9px] text-emerald-400">{chatExtractedData.description ? "✓ Lido" : "Opcional"}</span>
                          </div>
                          <div className="font-sans text-[11px] font-medium leading-relaxed text-white">
                            {chatExtractedData.description || "A IA irá mapear o escopo do projeto à medida que você escrever no simulador..."}
                          </div>
                        </div>

                        {chatLeadSaved && (
                          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-2.5 rounded-lg text-xs leading-relaxed font-sans space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                              🎉 Salvo no CRM em Tempo Real!
                            </div>
                            <p className="text-[11px] opacity-95">
                              As informações essenciais (<b>Nome</b> e <b>Phone</b>) foram capturadas e integradas diretamente no fluxo de roteamento do CRM.
                            </p>
                            <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-400 font-bold border-t border-emerald-900/40 mt-1">
                              <span>Lead ID: {chatSavedLeadId}</span>
                              <button 
                                onClick={() => {
                                  setActiveTab("leads");
                                  // Find the lead object and select it
                                  const match = leads.find(l => l.id === chatSavedLeadId);
                                  if (match) setSelectedLeadForDetail(match);
                                }}
                                className="underline hover:text-white cursor-pointer bg-transparent border-0 p-0 font-bold"
                              >
                                Ficha do Lead →
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="text-[9px] text-slate-400 leading-normal flex items-start gap-1 justify-center text-center pt-1 font-sans select-none">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                          <span>Este chatbot monitora a intenção de conversa em tempo real e consolida múltiplos dados na mesma oportunidade do CRM sem duplicados.</span>
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* MODAL SIMULADOR CHATBOT COMPONENT */}
                  {isTestChatbotModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden select-none" id="chatbot-test-modal">
                      <div 
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setIsTestChatbotModalOpen(false)}
                      />

                      <div className="relative bg-[#0d122b] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800/80 p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center">
                        
                        {/* Header of Modal */}
                        <div className="w-full pb-4 mb-4 border-b border-slate-800/80 flex justify-between items-center shrink-0">
                          <h3 className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-1.5">
                            <Smartphone className="w-4.5 h-4.5 text-indigo-400" />
                            Simulador e Teste do Chatbot IA
                          </h3>
                          <button
                            onClick={() => setIsTestChatbotModalOpen(false)}
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-850"
                          >
                            <X className="w-4.5 h-4.5" />
                          </button>
                        </div>

                        {/* Outer template selector inside modal to see how it works with different templates */}
                        <div className="w-full mb-4 grid grid-cols-2 gap-2 text-xs text-left bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">Título do Assistente:</span>
                            <span className="text-[11px] text-slate-100 font-semibold font-sans block truncate">{chatbotWidgetTitle}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Tom de Voz:</span>
                            <span className="text-[11px] text-indigo-400 font-bold block truncate capitalize">{chatbotToneOfVoice.replace('-', ' ')}</span>
                          </div>
                        </div>

                        {/* Interactive smartphone simulator copy */}
                        <div className="relative mx-auto w-full max-w-[340px] bg-[#1e293b] rounded-[48px] p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-4 border-[#334155]">
                          {/* Speaker & Sensor bar */}
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-between px-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                            <span className="w-12 h-1 bg-slate-900 rounded-full"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-950"></span>
                          </div>

                          {/* Outer power/volume side buttons simulation */}
                          <div className="absolute -left-1 top-28 w-1 h-12 bg-slate-600 rounded-l-md"></div>
                          <div className="absolute -left-1 top-44 w-1 h-12 bg-slate-600 rounded-l-md"></div>
                          <div className="absolute -right-1 top-36 w-1 h-16 bg-slate-600 rounded-r-md"></div>

                          {/* Internal Screen Area */}
                          <div className="bg-white rounded-[32px] overflow-hidden border border-slate-700/30 flex flex-col h-[460px] relative select-none font-sans">
                            
                            {/* Simulated Device Header/Status Bar */}
                            <div className="bg-slate-900 text-white/90 text-[10px] px-5 pt-7 pb-1.5 flex justify-between items-center z-45 relative select-none border-b border-white/5">
                              <span className="font-bold">19:02</span>
                              <div className="flex items-center gap-1.5">
                                {/* Signal strength lines */}
                                <div className="flex gap-0.5 items-end h-2.5">
                                  <span className="w-[1.5px] h-1 bg-white rounded-xs"></span>
                                  <span className="w-[1.5px] h-1.5 bg-white rounded-xs"></span>
                                  <span className="w-[1.5px] h-2 bg-white rounded-xs"></span>
                                  <span className="w-[1.5px] h-2.5 bg-white rounded-xs"></span>
                                </div>
                                <span className="font-semibold text-[8px]">5G</span>
                                {/* Battery representation */}
                                <div className="w-5 h-2.5 border border-white/60 rounded-xs p-px flex items-center justify-start">
                                  <div className="w-[90%] h-full bg-[#10b981] rounded-xs"></div>
                                </div>
                              </div>
                            </div>

                            {/* SCREEN VIEWPORT SELECTION */}
                            {!isMobileChatOpen ? (
                              /* SCREEN 1: PORTAL WEB INSTITUCIONAL SIMULADO (CLIENT'S SITE) */
                              <div className="flex-1 flex flex-col bg-slate-50 relative overflow-y-auto overflow-x-hidden">
                                {/* Mock Website Brand Header */}
                                <div className="bg-white px-3.5 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                                      LC
                                    </div>
                                    <span className="font-extrabold text-xs text-slate-800 tracking-tight">Consertos Já</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                    <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600">Site Ativo</span>
                                  </div>
                                </div>

                                {/* Website Hero Section banner */}
                                <div className="p-4 bg-gradient-to-br from-indigo-950 to-slate-900 text-white space-y-1 text-left relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                  <span className="text-[8px] bg-indigo-500/30 text-indigo-300 font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest inline-block">
                                    Atendimento Rápido
                                  </span>
                                  <h5 className="font-extrabold text-xs leading-tight">Serviços Residenciais Rápidos</h5>
                                  <p className="text-[9px] text-slate-300 leading-normal font-sans font-normal">
                                    Precisa consertar algo em casa? Nossa equipe atende você em minutos!
                                  </p>
                                </div>

                                {/* Featured list item cards */}
                                <div className="p-3 space-y-2 flex-1 text-left">
                                  <h6 className="font-extrabold text-slate-700 text-[9px] uppercase tracking-wider">Nossos Serviços</h6>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-white border border-slate-200/65 rounded-lg space-y-0.5 shadow-xs">
                                      <span className="text-xs">🔧</span>
                                      <p className="font-bold text-slate-800 text-[9px]">Eletricista</p>
                                    </div>
                                    <div className="p-2 bg-white border border-slate-200/65 rounded-lg space-y-0.5 shadow-xs">
                                      <span className="text-xs">🚰</span>
                                      <p className="font-bold text-slate-800 text-[9px]">Encanador</p>
                                    </div>
                                  </div>

                                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg space-y-1 relative">
                                    <p className="font-extrabold text-slate-950 text-[10px]">Chatbot de WhatsApp IA</p>
                                    <p className="text-[9px] text-slate-600 leading-normal font-sans">
                                      Clique no botão flutuante de WhatsApp abaixo para simular o chatbot!
                                    </p>
                                  </div>
                                </div>

                                {/* WhatsApp Float Button container */}
                                <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1.5 z-40">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsMobileChatOpen(true);
                                      if (chatMessages.length === 0) {
                                        handleResetChatbot();
                                      }
                                    }}
                                    className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer relative hover:scale-105 active:scale-95 transition-transform"
                                    style={{ backgroundColor: chatbotAvatarColor }}
                                    title="Iniciar chat de simulação"
                                  >
                                    {chatbotAvatarUrl ? (
                                      <img 
                                        src={chatbotAvatarUrl} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover rounded-full" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <Bot className="w-5 h-5 animate-pulse" />
                                    )}
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full text-white text-[8px] font-black flex items-center justify-center border border-white">1</span>
                                  </button>
                                </div>

                              </div>
                            ) : (
                              /* SCREEN 2: ACTIVE WHATSAPP CHAT WEB SIMULATION INTERFACE */
                              <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
                                
                                {/* Simulated WhatsApp Chat Header bar */}
                                <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-850 flex items-center justify-between shrink-0 select-none">
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                      type="button" 
                                      onClick={() => setIsMobileChatOpen(false)}
                                      className="p-1 hover:bg-slate-855 rounded text-white cursor-pointer"
                                    >
                                      <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                    
                                    <div 
                                      className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 relative animate-fade-in overflow-hidden shadow-sm" 
                                      style={{ backgroundColor: chatbotAvatarColor }}
                                    >
                                      {chatbotAvatarUrl ? (
                                        <img 
                                          src={chatbotAvatarUrl} 
                                          alt="Avatar" 
                                          className="w-full h-full object-cover rounded-full" 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <Bot className="w-5 h-5" />
                                      )}
                                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25d366] border border-slate-900"></span>
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <h4 className="font-bold text-white text-[11px] leading-tight truncate">{chatbotWidgetTitle}</h4>
                                      <p className="text-[8px] text-[#25d366] font-semibold leading-none mt-0.5">
                                        Online
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={handleResetChatbot}
                                      className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                                      title="Limpar Histórico"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIsMobileChatOpen(false)}
                                      className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
                                      title="Fechar Chat"
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Conversational Screen Messages Body */}
                                <div 
                                  className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2.5 font-sans relative"
                                  style={{ 
                                    backgroundColor: "#efeae2", 
                                    backgroundImage: `radial-gradient(circle, #dfdcd6 1px, transparent 1px)`, 
                                    backgroundSize: "18px 18px" 
                                  }}
                                >
                                  <div className="flex justify-center select-none py-0.5">
                                    <span className="bg-white/90 text-[8px] text-slate-500 font-medium px-2 py-0.5 rounded shadow-3xs uppercase tracking-wide">
                                      Hoje
                                    </span>
                                  </div>

                                  {chatMessages.length === 0 ? (
                                    <div className="text-center text-[9px] text-slate-400 py-4 font-medium">
                                      Iniciando conversa...
                                    </div>
                                  ) : (
                                    chatMessages.map(msg => (
                                      <div 
                                        key={msg.id} 
                                        className={`flex items-start gap-1 max-w-[88%] ${msg.sender === "user" ? "ml-auto" : "mr-auto"}`}
                                      >
                                        {msg.sender === "bot" && (
                                          <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 shadow-3xs overflow-hidden"
                                            style={{ backgroundColor: chatbotAvatarColor }}
                                          >
                                            {chatbotAvatarUrl ? (
                                              <img
                                                src={chatbotAvatarUrl}
                                                alt="Bot Avatar"
                                                className="w-full h-full object-cover rounded-full"
                                                referrerPolicy="no-referrer"
                                              />
                                            ) : (
                                              <Bot className="w-4 h-4" />
                                            )}
                                          </div>
                                        )}
                                        <div 
                                          className={`p-1.5 pb-4 text-[11px] leading-normal shadow-[0_1px_0.5px_rgba(0,0,0,0.12)] relative text-left min-w-[60px] max-w-full ${
                                            msg.sender === "user" 
                                              ? "bg-[#d9fdd3] text-slate-900 rounded-[10px] rounded-tr-none" 
                                              : "bg-white text-slate-900 rounded-[10px] rounded-tl-none"
                                          }`}
                                        >
                                          <p className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</p>
                                          
                                          {msg.sender === "user" ? (
                                            <div className="absolute bottom-0.5 right-1 flex items-center gap-0.5 text-[7px] text-[#8696a0] font-sans select-none">
                                              <span>
                                                {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                              </span>
                                              <svg className="w-2.5 h-2.5 text-[#53bdeb] shrink-0 inline-block" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1.5 5.5L4.5 8.5L10 3" stroke="currentColor" />
                                                <path d="M5.5 5.5L8.5 8.5L14 3" stroke="currentColor" />
                                              </svg>
                                            </div>
                                          ) : (
                                            <span className="absolute bottom-0.5 right-1 text-[7px] text-[#8696a0] font-sans select-none">
                                              {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}

                                  {chatIsTyping && (
                                    <div className="flex items-start gap-1 max-w-[85%]">
                                      <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 shadow-3xs overflow-hidden"
                                        style={{ backgroundColor: chatbotAvatarColor }}
                                      >
                                        {chatbotAvatarUrl ? (
                                          <img
                                            src={chatbotAvatarUrl}
                                            alt="Bot Avatar"
                                            className="w-full h-full object-cover rounded-full"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <Bot className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="bg-white text-slate-500 shadow-[0_1px_0.5px_rgba(0,0,0,0.12)] rounded-[10px] rounded-tl-none p-2 px-2.5 flex items-center justify-center min-w-[44px]">
                                        <div className="flex items-center gap-1.5 py-0.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }}></div>
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "200ms", animationDuration: "1s" }}></div>
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "400ms", animationDuration: "1s" }}></div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Clickable Quick Replies Carousel */}
                                <div className="flex gap-1 overflow-x-auto px-2 py-1 bg-[#efeae2]/40 border-t border-[#dfdcd6]/50 scrollbar-none shrink-0 select-none">
                                  {computedQuickReplies.map((reply, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => !chatIsTyping && sendUserMessage(reply)}
                                      disabled={chatIsTyping}
                                      className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#128c7e]/40 text-[#128c7e] text-[9px] font-bold px-2 py-1 rounded-full shadow-3xs transition-all whitespace-nowrap active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-0.5 shrink-0"
                                    >
                                      💡 {reply}
                                    </button>
                                  ))}
                                </div>

                                {/* WhatsApp Chat input footer form */}
                                <form onSubmit={handleSendChatMessage} className="flex items-center gap-1.5 px-2 py-2 bg-[#efeae2] border-t border-[#dfdcd6] select-none font-sans shrink-0">
                                  <div className="flex-1 bg-white rounded-xl px-2.5 py-1 flex items-center gap-1 border border-slate-250 shadow-2xs min-w-0">
                                    <Smile className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                                    <textarea
                                      ref={textareaRef2}
                                      placeholder="Mensagem"
                                      required
                                      value={chatInputText}
                                      disabled={chatIsTyping}
                                      onChange={(e) => {
                                        setChatInputText(e.target.value);
                                        e.target.style.height = "auto";
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          if (chatInputText.trim() && !chatIsTyping) {
                                            const userText = chatInputText.trim();
                                            setChatInputText("");
                                            resetTextareaHeights();
                                            sendUserMessage(userText);
                                          }
                                        }
                                      }}
                                      rows={1}
                                      className="flex-1 text-slate-800 outline-hidden border-0 p-0 text-[11px] bg-transparent focus:ring-0 placeholder:text-slate-400 resize-none h-auto max-h-[120px] leading-snug overflow-y-auto"
                                    />
                                    <Mic className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                                  </div>
                                  
                                  <button
                                    type="submit"
                                    disabled={!chatInputText.trim() || chatIsTyping}
                                    className="w-8 h-8 rounded-full bg-[#128c7e] text-white flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform border-0 cursor-pointer shadow-3xs disabled:opacity-50"
                                  >
                                    <Send className="w-3.5 h-3.5 translate-x-px -translate-y-2xs" />
                                  </button>
                                </form>

                              </div>
                            )}

                          </div>
                        </div>

                        {/* Footer Tips */}
                        <div className="w-full mt-4 text-center">
                          <p className="text-[10px] text-slate-400 font-sans leading-normal">
                            💡 Todas as interações feitas aqui refletem as configurações de avatar, nome e estilo em tempo real.
                          </p>
                        </div>

                      </div>
                    </div>
                  )}

                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: 5. OUTGOING ALERTS & NOTIFICATIONS SAVER */}
            {activeTab === "notifications" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start max-w-7xl animate-fade-in">
                {/* Outgoing alerts setting and template manager */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Disparos de Alertas de Integração</h3>
                  <p className="text-xs text-slate-500">Configure para onde suas notificações devem ser disparadas quando um novo prospect preencher os formulários externos.</p>
                </div>

                <form onSubmit={handleSaveAlertConfig} className="space-y-5 text-xs text-slate-700">
                  
                  {/* Visual UI Beeps and Browser config */}
                  <div className="space-y-3.5 pb-4 border-b border-slate-100">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                      Alertas no Navegador & Alarme
                    </span>

                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="space-y-0.5 pr-2">
                        <span className="font-semibold text-slate-800 block">Sons de Chime e Notificações Sonoras</span>
                        <span className="text-[11px] text-slate-500 block">Tocar um breve barulho harmônico no navegador ao identificar um lead na API</span>
                      </div>
                      <input
                        id="checkbox-sound-enabled"
                        type="checkbox"
                        checked={alertConfig.soundEnabled}
                        onChange={(e) => setAlertConfig({ ...alertConfig, soundEnabled: e.target.checked })}
                        className="w-4.5 h-4.5 accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="space-y-0.5 pr-2">
                        <span className="font-semibold text-slate-800 block">Notificação Nativa Push do Sistema</span>
                        <span className="text-[11px] text-slate-500 block">Exibe um balão flutuante do sistema operacional se a aba estiver em segundo plano</span>
                      </div>
                      <input
                        id="checkbox-push-enabled"
                        type="checkbox"
                        checked={alertConfig.osNotificationEnabled}
                        onChange={(e) => setAlertConfig({ ...alertConfig, osNotificationEnabled: e.target.checked })}
                        className="w-4.5 h-4.5 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Mail configs */}
                  <div className="space-y-3 pb-4 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-indigo-500" /> Alerta por E-mail do Operador
                      </span>
                      <input
                        id="checkbox-email-enabled"
                        type="checkbox"
                        checked={alertConfig.emailEnabled}
                        onChange={(e) => setAlertConfig({ ...alertConfig, emailEnabled: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">E-mail para envio de alertas</label>
                      <input
                        id="input-alert-email"
                        type="email"
                        disabled={!alertConfig.emailEnabled}
                        placeholder="Ex: anderson.ferreira.pompeu@gmail.com"
                        value={alertConfig.emailAddress || ""}
                        onChange={(e) => setAlertConfig({ ...alertConfig, emailAddress: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 disabled:opacity-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-hidden text-slate-700 font-medium"
                      />
                      <span className="text-[10px] text-slate-400 block leading-relaxed">
                        Nossa central de webhook envia um e-mail estruturado contendo o link do WhatsApp para atendimento em 0 cliques.
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp configs */}
                  <div className="space-y-3 pb-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Alerta por WhatsApp (API Simulação)
                      </span>
                      <input
                        id="checkbox-whatsapp-enabled"
                        type="checkbox"
                        checked={alertConfig.whatsappEnabled}
                        onChange={(e) => setAlertConfig({ ...alertConfig, whatsappEnabled: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Número de WhatsApp (DDD + Telefone)</label>
                      <input
                        id="input-alert-whatsapp"
                        type="text"
                        disabled={!alertConfig.whatsappEnabled}
                        placeholder="Ex: (11) 98888-7777"
                        value={alertConfig.whatsappNumber || ""}
                        onChange={(e) => setAlertConfig({ ...alertConfig, whatsappNumber: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 disabled:opacity-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-hidden text-slate-700 font-medium"
                      />
                      <span className="text-[10px] text-slate-400 block leading-relaxed">
                        O backend registrará simulações disparadas a esse número de telefone no console do servidor.
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn-save-configs"
                      type="submit"
                      className="bg-indigo-600 text-white font-bold py-2 px-5 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer block transition-colors text-xs"
                    >
                      Salvar Definições de Notificação
                    </button>
                  </div>

                </form>

                <hr className="border-slate-100" />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-indigo-500" />
                        Templates de Mensagens para Profissionais
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Crie e gerencie os layouts e textos das mensagens automatizadas enviadas via WhatsApp aos parceiros.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateTmplModal}
                      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-lg border border-indigo-200 transition-all text-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Template
                    </button>
                  </div>

                  {/* Variables glossary */}
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                    <span className="font-bold text-[10px] text-slate-600 block uppercase tracking-wider">
                      Variáveis Dinâmicas Disponíveis
                    </span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Insira as tags abaixo no texto. Elas serão substituídas automaticamente antes de disparar o WhatsApp simulado:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { key: "{nome_profissional}", label: "Nome do Parceiro" },
                        { key: "{nome_cliente}", label: "Nome do lead" },
                        { key: "{fone_cliente}", label: "WhatsApp do lead" },
                        { key: "{endereco_cliente}", label: "Endereço cadastrado" },
                        { key: "{nome_servico}", label: "Nome do serviço/categoria" },
                        { key: "{descricao_servico}", label: "Detalhes do problema" },
                        { key: "{link_unico}", label: "Link seguro de aceito/recusa" },
                        { key: "{validade_horas}", label: "Tempo de expiração" }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[9px]" title={item.label}>
                          <code className="text-indigo-600 font-bold font-mono">{item.key}</code>
                          <span className="text-slate-400 font-sans">({item.label})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Templates List */}
                  <div className="space-y-3">
                    {whatsappTemplates.map((tmpl) => (
                      <div key={tmpl.id} className={`p-4 bg-white border rounded-xl space-y-3 shadow-xs ${tmpl.isDefault ? "border-indigo-300 bg-indigo-50/10" : "border-slate-200"}`}>
                        <div className="flex justify-between items-center pb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-sans text-xs">{tmpl.name}</span>
                            {tmpl.isDefault && (
                              <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-bold uppercase rounded-md tracking-wider">
                                Ativo (Padrão)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!tmpl.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultTemplate(tmpl.id)}
                                className="text-[10px] text-slate-500 hover:text-indigo-600 font-semibold px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded transition-colors cursor-pointer"
                              >
                                Definir Padrão
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditTmplModal(tmpl)}
                              className="text-[10px] text-indigo-700 hover:text-indigo-950 font-semibold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors cursor-pointer"
                            >
                              Editar
                            </button>
                            {whatsappTemplates.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                                className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 max-h-32 overflow-y-auto block">
                          <pre className="text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                            {tmpl.content}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Evolution API Connection Status Card */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">Evolution API</h3>
                        <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider mt-0.5 font-sans">Instância: crm</p>
                      </div>
                    </div>
                    {/* Refresh Button */}
                    <button
                      type="button"
                      onClick={() => fetchEvolutionStatus()}
                      disabled={loadingEvolution}
                      className="p-1 px-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title="Atualizar Status"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingEvolution ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {loadingEvolution && !evolutionStatus ? (
                    <div className="space-y-3 py-4 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded-md w-2/3 mx-auto"></div>
                      <div className="h-28 bg-slate-50 border border-dashed border-slate-200 rounded-xl"></div>
                      <div className="h-8 bg-slate-100 rounded-md"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Connection State indicator badge */}
                      {evolutionStatus?.connected ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto animate-bounce" />
                          <div>
                            <span className="font-bold text-emerald-800 text-xs block font-sans">Conectado com Sucesso!</span>
                            <span className="text-[10px] text-emerald-600 block leading-normal mt-0.5 font-medium font-sans">Instância integrada para os disparos.</span>
                          </div>
                          {evolutionStatus.jid && (
                            <div className="bg-white/90 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-left mt-1 overflow-hidden">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">ID do Dispositivo (JID)</span>
                              <span className="text-[10px] text-slate-700 font-mono font-bold break-all">{evolutionStatus.jid}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4.5 text-center space-y-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
                            <RefreshCw className={`w-5 h-5 ${loadingEvolution ? "animate-spin" : ""}`} />
                          </div>
                          <div>
                            <span className="font-bold text-amber-800 text-xs block font-sans">Aparelho Desconectado</span>
                            <span className="text-[10px] text-amber-600 block leading-normal mt-0.5 font-medium font-sans">Aponte a câmera do WhatsApp para autenticar:</span>
                          </div>

                          {evolutionStatus?.error && (
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-left space-y-1">
                              <span className="font-bold text-rose-800 text-[10px] block uppercase tracking-wider font-sans">⚠️ Detalhes do Erro da API:</span>
                              <p className="text-[10px] text-rose-600 block leading-normal font-mono break-all font-semibold max-h-[120px] overflow-y-auto bg-white/70 p-2 rounded border border-rose-100">
                                {evolutionStatus.error}
                              </p>
                            </div>
                          )}

                          {evolutionStatus?.qrcode ? (
                            <div className="space-y-3">
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 inline-block shadow-xs">
                                <img
                                  src={evolutionStatus.qrcode.split('|')[0]}
                                  alt="WhatsApp QR Code"
                                  referrerPolicy="no-referrer"
                                  className="w-40 h-40 object-contain mx-auto"
                                />
                              </div>
                              <p className="text-[10px] text-slate-500 leading-normal max-w-[200px] mx-auto font-medium font-sans">
                                Vá em <b>Aparelhos conectados</b> no seu app de mensagens e leia este QR code.
                              </p>
                            </div>
                          ) : (
                            <div className="py-6 text-slate-400 text-[11px] font-medium italic border border-dashed border-amber-200 bg-white/40 rounded-lg font-sans">
                              Nenhum QR code ativo. Clique no botão de gerar para requisitar a sessão.
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={triggerEvolutionConnect}
                            disabled={triggeringEvolutionConnect}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-4 rounded-lg shadow-xs cursor-pointer block transition-colors text-[10px] w-full flex items-center justify-center gap-1.5 font-sans"
                          >
                            <RefreshCw className={`w-3 h-3 ${triggeringEvolutionConnect ? "animate-spin" : ""}`} />
                            {triggeringEvolutionConnect ? "Gerando sessão..." : "Gerar QR Code de Autenticação"}
                          </button>
                        </div>
                      )}

                      {/* Footer Info / Quick Actions */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 text-left">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Parâmetros de Conexão</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-slate-400 font-semibold block font-sans">Nome:</span>
                            <span className="font-bold text-slate-700 font-mono">crm</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block font-sans">Domínio Server:</span>
                            <span className="font-bold text-slate-700 font-mono overflow-hidden text-ellipsis block whitespace-nowrap" title="evo.drorcamento.com">evo.drorcamento.com</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-slate-200">
                            <span className="text-slate-400 font-semibold block font-sans">URL Endereço:</span>
                            <span className="font-mono text-slate-500 text-[9px] font-semibold break-all leading-normal">https://evo.drorcamento.com</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: DESIGN SYSTEM & INTERACTIVE TOKENS COLLAGE */}
            {activeTab === "design-system" && (
              <div className="space-y-8 max-w-6xl pb-12 animate-fade-in text-slate-700">
                
                {/* Intro Card */}
                <div className="bg-gradient-to-r from-brand-primary/10 via-brand-secondary/5 to-transparent border border-indigo-500/10 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-white text-lg font-display flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" /> Folha de Colagem & Design Tokens
                    </h3>
                    <p className="text-xs text-slate-300">
                      Esta interface consolidada do sistema unifica as diretrizes visuais, demonstrando componentes atômicos reutilizáveis, a paleta semântica e layouts em tempo real.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto uppercase tracking-wide">
                    📌 Ambiente: Tailwind v4 + React 18
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Palette card */}
                  <Card title="1. Paleta de Cores Semântica" subtitle="Cores centralizadas no CSS global por relevância de uso e acessibilidade.">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {[
                        { name: "Brand Primary", desc: "Cor de marca principal", class: "bg-brand-primary", hex: "#4F46E5", text: "text-white" },
                        { name: "Brand Primary Hover", desc: "Foco e ações principais", class: "bg-brand-primary-hover", hex: "#4338CA", text: "text-white" },
                        { name: "Brand Secondary", desc: "Ações de destaque", class: "bg-brand-secondary", hex: "#0EA5E9", text: "text-white" },
                        { name: "Brand Success", desc: "Feedbacks positivos / leads", class: "bg-brand-success", hex: "#10B981", text: "text-white" },
                        { name: "Brand Warning", desc: "Atendimento atrasado / prazos", class: "bg-brand-warning", hex: "#F59E0B", text: "text-white" },
                        { name: "Brand Danger", desc: "Cancelamentos / remoções", class: "bg-brand-danger", hex: "#EF4444", text: "text-white" },
                        { name: "Brand Background", desc: "Fundo primário do SaaS", class: "bg-[#070920] border border-slate-800", hex: "#070920", text: "text-indigo-400" },
                        { name: "Brand Surface", desc: "Superfícies de cards e sliders", class: "bg-white border border-slate-200", hex: "#FFFFFF", text: "text-slate-800" },
                        { name: "WhatsApp Green", desc: "Canais rápidos de envio", class: "bg-whatsapp", hex: "#128C7E", text: "text-white" },
                      ].map((c) => (
                        <div key={c.name} className="flex flex-col rounded-xl overflow-hidden border border-slate-150 shadow-3xs">
                          <div className={`h-12 w-full ${c.class} flex items-end p-2`}>
                            <span className={`text-[10px] font-mono font-bold ${c.text}`}>{c.hex}</span>
                          </div>
                          <div className="p-2 space-y-0.5 bg-slate-50">
                            <span className="font-bold text-slate-800 block text-[11px] truncate">{c.name}</span>
                            <span className="text-[10px] text-slate-500 block leading-tight truncate">{c.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Typography card */}
                  <Card title="2. Escala Tipográfica Padronizada" subtitle="Títulos com Outfit (Display), corpo com Inter e dados técnicos com JetBrains Mono.">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-150">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase">font-display (Outfit)</span>
                          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">TÍTULO ULTRABOLD DISPLAY 24px</h1>
                        </div>
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase">font-sans (Inter)</span>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed font-sans">
                            Texto de corpo legível para as tabelas e dados cadastrais. Letra limpa e com excelente taxa de legibilidade.
                          </p>
                        </div>
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase">font-mono (JetBrains Mono)</span>
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 block">
                            <code className="text-emerald-400 font-mono text-xs">const data = await fetchLeads(); // #1f9d-token</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Buttons card */}
                  <Card title="3. Botões Globais Atômicos (Button.tsx)" subtitle="Componente único com variantes de estilo, tamanhos responsivos e estados.">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Variantes de Estilo</span>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="primary">Primary</Button>
                          <Button variant="secondary">Secondary</Button>
                          <Button variant="success">Success</Button>
                          <Button variant="warning">Warning</Button>
                          <Button variant="danger">Danger</Button>
                          <Button variant="outline">Outline</Button>
                          <Button variant="ghost">Ghost</Button>
                          <Button variant="whatsapp">WhatsApp</Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div className="space-y-2">
                          <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Tamanhos</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button size="sm" variant="outline">Small (sm)</Button>
                            <Button size="md" variant="outline">Medium (md)</Button>
                            <Button size="lg" variant="outline">Large (lg)</Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Estados do Cursor</span>
                          <div className="flex items-center gap-2">
                            <Button variant="primary" disabled>Desabilitado</Button>
                            <Button variant="outline" className="animate-pulse">Animação</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Input and Smart TextArea Card */}
                  <Card title="4. Inputs e TextAreas Autoresizáveis" subtitle="Componentes padronizados para formulários limpos com suporte a erros.">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Input 
                          label="Nome Completo (Padrão)" 
                          placeholder="Digite seu nome profissional" 
                        />
                        <Input 
                          label="E-mail com Erro de Validação" 
                          placeholder="exemplo@invalido" 
                          error="Por favor, forneça um e-mail válido" 
                          defaultValue="anderson.ferreira"
                        />
                      </div>

                      <div className="space-y-3.5 pt-3 border-t border-slate-100">
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Área de Texto Dinâmica com Auto-Resize</span>
                        <TextArea 
                          label="Faça Anotações de Atendimento (Escreva várias linhas para testar)" 
                          placeholder="Escreva notas aqui... O autoResize integrado expande verticalmente sozinho!" 
                          autoResize={true}
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Typing Indicator & Chats Mock */}
                  <Card title="5. Simulador de Indicador de Digitação" subtitle="Feedback dinâmico e agradável usado no chatbot da plataforma.">
                    <div className="bg-[#efeae2] p-6 rounded-xl border border-[#dfdcd6] space-y-4 w-full">
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs">
                          🤖
                        </div>
                        <div className="bg-white text-slate-500 shadow-[0_1px_0.5px_rgba(0,0,0,0.12)] rounded-[12px] rounded-tl-none p-2.5 px-3.5 flex items-center justify-center">
                          <div className="flex items-center gap-1.5 py-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }}></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "200ms", animationDuration: "1s" }}></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "400ms", animationDuration: "1s" }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 text-center italic">
                        Animação harmônica suave sincronizada via CSS.
                      </div>
                    </div>
                  </Card>

                  {/* Chart display component container */}
                  <Card title="6. Contêiner de Gráficos Seguro (Fim do Width Warning)" subtitle="Uso do Wrapper ChartContainer que contorna o bug do ResponsiveContainer e evita alertas.">
                    <div className="space-y-3 font-sans">
                      <div className="bg-[#05071a] border border-slate-900 p-4 rounded-xl">
                        <ChartContainer height={180}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[{v: 120}, {v: 180}, {v: 150}, {v: 240}, {v: 200}, {v: 310}, {v: 280}, {v: 350}]}>
                              <defs>
                                <linearGradient id="glowPurpleDesign" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#101435" vertical={false} />
                              <Area type="monotone" dataKey="v" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#glowPurpleDesign)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-2">
                        💡 <strong>Inovação Segura</strong>: O seu componente <code>&lt;ChartContainer&gt;</code> impede a renderização prematura e o dimensionamento nulo utilizando observadores de resize ativos no componente integrado.
                      </p>
                    </div>
                  </Card>

                </div>

                {/* Unified Layout Base Preview section */}
                <Card title="7. Padronização Global de Layouts (Inconsistência Zero)" subtitle="Nossas diretrizes asseguram que cada viewport renderize o mesmo alinhamento de grades e espaçamentos.">
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center text-xs">
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-dashed border-indigo-500/40 text-indigo-600 font-bold font-sans">
                        Sidebar Fixa
                        <span className="text-[10px] font-normal text-slate-500 block mt-1 font-sans">Navegação geral compacta</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-dashed border-indigo-500/40 text-indigo-600 font-bold font-sans">
                        Header Sticky
                        <span className="text-[10px] font-normal text-slate-500 block mt-1 font-sans">Controle de estado & Sincronização</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-dashed border-indigo-500/40 text-indigo-600 font-bold font-sans">
                        Grid de Conteúdo
                        <span className="text-[10px] font-normal text-slate-500 block mt-1 font-sans">Paddings padronizados em 6 ou 8</span>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <span className="inline-block text-[10px] text-emerald-600 font-extrabold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest animate-pulse font-mono">
                        SISTEMA VISUAL COMPACTO - EXCELÊNCIA FIDUCIÁRIA COMPROVADA
                      </span>
                    </div>
                  </div>
                </Card>

              </div>
            )}

            {/* TAB CONTENT: WEBHOOK LOGS & INCOMING LEADS AUDITING */}
            {activeTab === "webhook-logs" && (
              <div className="space-y-6 max-w-6xl pb-12 animate-fade-in">
                <WebhookLogsTable />
              </div>
            )}

          </div>

        </main>
      </div>

      {/* CUSTOM APP CONFIRM DIALOG */}
      {appConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 animate-pulse">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-850 text-sm font-display tracking-tight uppercase">
                {appConfirm.title}
              </h4>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
              {appConfirm.message}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAppConfirm(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  appConfirm.onConfirm();
                  setAppConfirm(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM APP ALERT DIALOG */}
      {appAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                appAlert.type === "success" 
                  ? "bg-emerald-50 text-emerald-600" 
                  : appAlert.type === "error" 
                    ? "bg-rose-50 text-rose-600" 
                    : "bg-indigo-50 text-indigo-600"
              }`}>
                {appAlert.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-indigo-500" />
                )}
              </div>
              <h4 className="font-bold text-slate-800 text-sm font-display tracking-tight">
                {appAlert.title}
              </h4>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed font-sans font-medium">
              {appAlert.message}
            </p>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAppAlert(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONAL ADD/EDIT MODAL CONTROL */}
      {showAddEditProfModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm font-display uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4.5 h-4.5 text-indigo-505" />
                {editingProfessional ? "Editar Cadastro de Profissional" : "Adicionar Novo Profissional Parceiro"}
              </h4>
              <button 
                onClick={() => setShowAddEditProfModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateProfessional} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block text-xs">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Anderson Ferreira Pompeu"
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block text-xs">Especialidade / Título *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Consultor Jurídico, Engenheiro, Clínico"
                    value={profSpecialty}
                    onChange={(e) => setProfSpecialty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block text-xs">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98000-1111"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-705 block text-xs">E-mail de Contato</label>
                  <input
                    type="email"
                    placeholder="Ex: profissional@gmail.com"
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-750 block text-xs">Link da Foto de Perfil (Opcional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Ex: https://images.unsplash.com/photo-..."
                    value={profPhotoUrl}
                    onChange={(e) => setProfPhotoUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-medium text-slate-800"
                  />
                  <div className="w-10 h-10 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {profPhotoUrl ? (
                      <img src={profPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/60 space-y-3">
                <span className="font-bold text-[10px] text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
                  🔑 Credenciais de Conta do Profissional
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block text-[11px]">Nome de Usuário (User) *</label>
                    <input
                      type="text"
                      placeholder="Ex: anderson.consultor"
                      value={profUsername}
                      onChange={(e) => setProfUsername(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-semibold text-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block text-[11px]">Senha (Password) *</label>
                    <input
                      type="text"
                      placeholder="Ex: senha123"
                      value={profPassword}
                      onChange={(e) => setProfPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-semibold text-slate-800 font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Estas credenciais permitirão ao profissional entrar de forma permanente no painel exclusivo, sem depender do envio de novos links provisórios por WhatsApp.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block text-xs">Canal HTML de Captação Atribuído *</label>
                <select
                  required
                  value={profTemplateId}
                  onChange={(e) => setProfTemplateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="" disabled>Selecione um canal para o roteamento automático de leads...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (ID: {t.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic live preview of chosen template */}
              {profTemplateId && templates.find(t => t.id === profTemplateId) && (
                (() => {
                  const selectedT = templates.find(t => t.id === profTemplateId)!;
                  return (
                    <div className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/50 hover:text-white border border-indigo-100 space-y-1.5 text-slate-650 animate-scale-up">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 font-display text-[10px] uppercase tracking-wide">✓ Canal Vinculado com Sucesso</span>
                        <span className="text-[9px] font-mono font-bold bg-indigo-200 text-indigo-850 px-1.5 py-0.2 rounded">{selectedT.bgColor}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-xs">{selectedT.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">siteUrl: {selectedT.siteUrl}</span>
                      </div>
                      <hr className="border-indigo-100/40" />
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Campos Disponíveis no Formulário:</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {selectedT.fields.map((f, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[9px] font-mono text-slate-500">
                              {f.label} ({f.required ? "obrigatório" : "opcional"})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditProfModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                >
                  {editingProfessional ? "Aplicar Alterações" : "Adicionar Profissional"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP TEMPLATE ADD/EDIT MODAL CONTROL */}
      {showAddEditTmplModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm font-display uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4.5 h-4.5 text-indigo-500" />
                {editingTmpl ? "Editar Template de Notificação" : "Adicionar Novo Template de Notificação"}
              </h4>
              <button 
                onClick={() => {
                  setShowAddEditTmplModal(false);
                  setEditingTmpl(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateTemplate} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block text-xs">Nome do Template *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alerta de Urgência Noturna, Template Geral Simplificado"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-700 block text-xs">Conteúdo da Mensagem *</label>
                  <span className="text-[10px] text-slate-455 font-normal">Aceita quebras de linha e emojis</span>
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder={`Olá, *{nome_profissional}*!\n\nVocê tem um novo lead disponível:\n👤 Cliente: {nome_cliente}\n📍 Local: {endereco_cliente}\n🛠️ Serviço: {nome_servico}\n\nLink do portal:\n{link_unico}`}
                  value={tmplContent}
                  onChange={(e) => setTmplContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-mono text-slate-800 leading-relaxed"
                />
              </div>

              {/* Variable shortcut keys */}
              <div className="bg-slate-50 p-2.5 border border-slate-150 rounded-xl space-y-1.5">
                <span className="font-bold text-[9px] text-slate-500 block uppercase tracking-wider">Variáveis Dinâmicas Disponíveis: (Clique para Inserir)</span>
                <div className="flex flex-wrap gap-1">
                  {["{nome_profissional}", "{nome_cliente}", "{fone_cliente}", "{endereco_cliente}", "{nome_servico}", "{descricao_servico}", "{link_unico}", "{validade_horas}"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTmplContent(prev => prev + " " + v)}
                      className="text-[9px] font-mono font-bold bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-600 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-1">
                <input
                  id="tmpl-is-default"
                  type="checkbox"
                  checked={tmplIsDefault}
                  onChange={(e) => setTmplIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
                <label htmlFor="tmpl-is-default" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                  Definir este template como padrão para novos encaminhamentos de serviços
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEditTmplModal(false);
                    setEditingTmpl(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTmpl}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {savingTmpl ? "Gravando..." : editingTmpl ? "Salvar Modelo" : "Criar Modelo"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL (SECURE & IFRAME HEALTHY) */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-[#020309]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in select-none">
          <div className="bg-[#0b0f2a] border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="p-5 sm:p-6 space-y-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row justify-end gap-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-850 hover:bg-slate-900/50 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {confirmModal.cancelText || "Cancelar"}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 border border-rose-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

