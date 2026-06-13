import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";

// Strip undefined from objects for safe Firestore setDoc calls
function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = stripUndefined(val);
    }
  }
  return result;
}

// Structured Log Interface and Helper
interface LogMeta {
  leadId?: string;
  [key: string]: any;
}

const logger = {
  info: (message: string, meta: LogMeta = {}) => {
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        message,
        ...meta
      }));
    } else {
      console.log(`[INFO] ${new Date().toLocaleTimeString()} - ${message}`, Object.keys(meta).length ? meta : "");
    }
  },
  warn: (message: string, meta: LogMeta = {}) => {
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify({
        level: "warn",
        timestamp: new Date().toISOString(),
        message,
        ...meta
      }));
    } else {
      console.warn(`[WARN] ${new Date().toLocaleTimeString()} - ${message}`, Object.keys(meta).length ? meta : "");
    }
  },
  error: (message: string, error?: any, meta: LogMeta = {}) => {
    const errorDetails = error instanceof Error ? {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    } : error ? { error } : {};
    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        message,
        ...errorDetails,
        ...meta
      }));
    } else {
      console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${message}`, error || "", Object.keys(meta).length ? meta : "");
    }
  }
};

// Helper to send message via WhatsApp Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://76.13.160.178:32771";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "gw5DDlfgtIuZmkCdlOyVfwosCUGShNUK";
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "crm";

function formatBrazilianNumber(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (!clean) return "";
  if (clean.length === 12 || clean.length === 13) {
    if (clean.startsWith("55")) {
      return clean;
    }
  }
  if (clean.startsWith("55")) {
    clean = clean.substring(2);
  }
  return "55" + clean;
}

async function sendWhatsAppMessage(toPhone: string, text: string): Promise<boolean> {
  const formattedPhone = formatBrazilianNumber(toPhone);
  if (!formattedPhone) {
    logger.warn(`WhatsApp send ignored: Phone number is empty or invalid`, { toPhone });
    return false;
  }

  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
  
  const payload = {
    number: formattedPhone,
    text: text,
    delay: 1200,
    linkPreview: true,
    options: {
      delay: 1200,
      presence: "composing",
      linkPreview: true
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      logger.info(`WhatsApp message successfully sent via Evolution API to ${formattedPhone}`, { response: data });
      return true;
    } else {
      const errText = await response.text();
      logger.error(`Failed to send WhatsApp message via Evolution API to ${formattedPhone}. Status: ${response.status}`, null, { errorResponse: errText });
      return false;
    }
  } catch (err) {
    logger.error(`Exception while sending WhatsApp message via Evolution API to ${formattedPhone}`, err);
    return false;
  }
}

// Resilient Firestore Write/Delete Queue
interface FirestoreJob {
  id: string;
  type: "set" | "delete";
  collection: string;
  docId: string;
  data?: any;
  retries: number;
  createdAt: number;
}

class FirestoreWriteQueue {
  private queue: FirestoreJob[] = [];
  private isProcessing = false;
  private maxRetries = 10;
  private retryDelayMs = 2000;

  public enqueueWrite(collection: string, docId: string, data: any) {
    this.removePendingJob(collection, docId);

    const job: FirestoreJob = {
      id: `${collection}-${docId}-${Date.now()}`,
      type: "set",
      collection,
      docId,
      data: JSON.parse(JSON.stringify(stripUndefined(data))),
      retries: 0,
      createdAt: Date.now()
    };

    this.queue.push(job);
    logger.info(`Enqueued Firestore WRITE job for ${collection}/${docId}`, {
      collection,
      docId,
      leadId: collection === "leads" ? docId : undefined,
      queueLength: this.queue.length
    });
    this.processNext();
  }

  public enqueueDelete(collection: string, docId: string) {
    this.removePendingJob(collection, docId);

    const job: FirestoreJob = {
      id: `${collection}-${docId}-${Date.now()}-delete`,
      type: "delete",
      collection,
      docId,
      retries: 0,
      createdAt: Date.now()
    };

    this.queue.push(job);
    logger.info(`Enqueued Firestore DELETE job for ${collection}/${docId}`, {
      collection,
      docId,
      leadId: collection === "leads" ? docId : undefined,
      queueLength: this.queue.length
    });
    this.processNext();
  }

  private removePendingJob(collection: string, docId: string) {
    const initialLen = this.queue.length;
    this.queue = this.queue.filter(j => !(j.collection === collection && j.docId === docId));
    if (this.queue.length < initialLen) {
      logger.info(`Superseded pending queue job for ${collection}/${docId} with fresh value`, { collection, docId });
    }
  }

  private async processNext() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue[0];

    logger.info(`Processing Firestore job ${job.id}`, {
      type: job.type,
      collection: job.collection,
      docId: job.docId,
      retries: job.retries,
      leadId: job.collection === "leads" ? job.docId : undefined
    });

    try {
      if (!db) {
        throw new Error("Firestore DB connection is not initialized.");
      }

      if (job.type === "set") {
        await setDoc(doc(db, job.collection, job.docId), job.data);
      } else if (job.type === "delete") {
        await deleteDoc(doc(db, job.collection, job.docId));
      }

      // Success
      this.queue.shift();
      logger.info(`Firestore job ${job.id} completed successfully`, {
        collection: job.collection,
        docId: job.docId,
        leadId: job.collection === "leads" ? job.docId : undefined
      });

      this.isProcessing = false;
      setTimeout(() => this.processNext(), 50);
    } catch (err: any) {
      job.retries++;
      logger.warn(`Firestore job ${job.id} failed (attempt ${job.retries}/${this.maxRetries})`, {
        error: err?.message || err,
        jobId: job.id,
        collection: job.collection,
        docId: job.docId,
        leadId: job.collection === "leads" ? job.docId : undefined
      });

      if (job.retries >= this.maxRetries) {
        this.queue.shift();
        logger.error(`Discarding Firestore job ${job.id} after maximum retries exceeded`, err, {
          jobId: job.id,
          collection: job.collection,
          docId: job.docId,
          leadId: job.collection === "leads" ? job.docId : undefined
        });
      } else {
        this.isProcessing = false;
        // Exponential backoff
        const nextDelay = this.retryDelayMs * Math.pow(1.5, job.retries);
        setTimeout(() => this.processNext(), nextDelay);
        return;
      }

      this.isProcessing = false;
      setTimeout(() => this.processNext(), 50);
    }
  }
}

const firestoreQueue = new FirestoreWriteQueue();

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let aiGenAI: any = null;
if (GEMINI_API_KEY) {
  try {
    aiGenAI = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    logger.info("Google GenAI SDK initialized successfully.");
  } catch (err) {
    logger.error("Failed to initialize Google GenAI SDK:", err);
  }
} else {
  logger.warn("GEMINI_API_KEY missing from environment variables.");
}

// Initialize Firebase
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;

if (fs.existsSync(configPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const fbApp = initializeApp(firebaseConfig);
    db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
    logger.info("Firebase Firestore initialized successfully on backend server.");
  } catch (err) {
    logger.error("Failed to initialize Firebase app:", err);
  }
} else {
  logger.warn("firebase-applet-config.json not found. Operating without Firebase!");
}

interface Lead {
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  status: "Novo" | "Encaminhado" | "Em Atendimento" | "Concluído" | "Recusado" | "Arquivado";
  notes: string;
  metadata: {
    browser: string;
    referrer: string;
    ip?: string;
    latitude?: number;
    longitude?: number;
  };
  notified: boolean;
  assignedProfessionalId?: string;
  forwardToken?: string;
  forwardExpiresAt?: string;
  forwardedAt?: string;
  acceptedAt?: string;
  location?: string;
  operatorNotifiedOfAcceptance?: boolean;
  address?: string;
  city?: string;
  description?: string;
  estimatedValue?: number;
  reviewToken?: string;
  reviewTokenExpiresAt?: string;
  reviewedAt?: string;
}

interface Template {
  id: string;
  name: string;
  siteUrl: string;
  bgColor: string;
  textColor: string;
  active: boolean;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  leadsCount: number;
  createdAt: string;
}

interface AlertConfig {
  emailEnabled: boolean;
  emailAddress: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  soundEnabled: boolean;
  osNotificationEnabled: boolean;
}

interface ProfitRecord {
  id: string;
  date: string;
  description: string;
  value: number;
}

interface Review {
  id: string;
  leadId: string;
  professionalId: string;
  rating: number;
  comment?: string;
  clientName?: string;
  createdAt: string;
  tokenUsed: string;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  photoUrl: string;
  templateId: string;
  profitRecords: ProfitRecord[];
  createdAt: string;
  username?: string;
  password?: string;
  reviewStats?: {
    average: number;
    total: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface WebhookLog {
  id: string;
  timestamp: string;
  payload: string; // JSON content string
  status: number;
  errorMessage?: string;
  userAgent?: string;
  ipAddress?: string;
  templateName?: string;
}


const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db_data.json");

// Default initial state
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "conserto-em-casa",
    name: "Conserto em Casa",
    siteUrl: "https://consertoemcasa.com.br",
    bgColor: "bg-sky-100 text-sky-800 border-sky-200",
    textColor: "#0369a1",
    active: true,
    fields: [
      { name: "name", label: "Nome Completo", type: "text", required: true },
      { name: "phone", label: "Telefone / WhatsApp", type: "tel", required: true },
      { name: "email", label: "E-mail de Contato", type: "email", required: false }
    ],
    leadsCount: 3,
    createdAt: "2026-06-01T10:00:00Z"
  },
  {
    id: "bebe-familia",
    name: "Bebê & Família",
    siteUrl: "https://bebeefamilia.com.br",
    bgColor: "bg-purple-100 text-purple-800 border-purple-200",
    textColor: "#7e22ce",
    active: true,
    fields: [
      { name: "name", label: "Nome da Mãe/Pai", type: "text", required: true },
      { name: "phone", label: "WhatsApp de Contato", type: "tel", required: true },
      { name: "email", label: "E-mail principal", type: "email", required: true }
    ],
    leadsCount: 1,
    createdAt: "2026-06-03T14:30:00Z"
  },
  {
    id: "academia-fit",
    name: "Academia FitLife",
    siteUrl: "https://academiafitlife.com",
    bgColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    textColor: "#047857",
    active: true,
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "phone", label: "WhatsApp", type: "tel", required: true },
      { name: "email", label: "E-mail", type: "email", required: false }
    ],
    leadsCount: 1,
    createdAt: "2026-06-05T08:20:00Z"
  },
  {
    id: "advocacia-parceiros",
    name: "Advocacia Correia",
    siteUrl: "https://correiaadvogados.com",
    bgColor: "bg-amber-100 text-amber-800 border-amber-200",
    textColor: "#b45309",
    active: true,
    fields: [
      { name: "name", label: "Nome Completo", type: "text", required: true },
      { name: "phone", label: "DDD + Telefone", type: "tel", required: true },
      { name: "email", label: "E-mail funcional", type: "email", required: true }
    ],
    leadsCount: 1,
    createdAt: "2026-06-08T11:45:00Z"
  }
];

const DEFAULT_LEADS: Lead[] = [
  {
    id: "lead-1",
    templateId: "conserto-em-casa",
    templateName: "Conserto em Casa",
    name: "Carlos Silva",
    phone: "(11) 98765-4321",
    email: "carlos.silva@outlook.com",
    createdAt: "2026-06-10T14:32:00Z",
    status: "Em Atendimento",
    notes: "Ligado hoje de manhã, agendou reparo na máquina de lavar para sábado.",
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
    location: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
    metadata: {
      browser: "Chrome (v122) / Windows 11",
      referrer: "https://consertoemcasa.com.br/orcamento-maquina",
      latitude: -23.561520,
      longitude: -46.655960
    },
    notified: true
  },
  {
    id: "lead-2",
    templateId: "bebe-familia",
    templateName: "Bebê & Família",
    name: "Mariana Costa",
    phone: "(21) 99123-4567",
    email: "mari.costa@gmail.com",
    createdAt: "2026-06-10T16:45:00Z",
    status: "Novo",
    notes: "Interessada no ensaio de Newborn de julho. Precisa de orçamento urgente.",
    address: "Av. Atlântica, 1702 - Copacabana, Rio de Janeiro - RJ",
    location: "Av. Atlântica, 1702 - Copacabana, Rio de Janeiro - RJ",
    metadata: {
      browser: "Safari / iPhone / iOS 17",
      referrer: "https://bebeefamilia.com.br/promocao-ensaio",
      latitude: -22.969120,
      longitude: -43.181820
    },
    notified: true
  },
  {
    id: "lead-3",
    templateId: "academia-fit",
    templateName: "Academia FitLife",
    name: "Rodrigo Mendonça",
    phone: "(31) 98122-3344",
    email: "rodrigo.m@yahoo.com.br",
    createdAt: "2026-06-09T09:15:00Z",
    status: "Concluído",
    notes: "Fechou o plano anual Gold presencialmente. Matrícula efetuada com sucesso.",
    address: "Praça da Liberdade, 350 - Funcionários, Belo Horizonte - MG",
    location: "Praça da Liberdade, 350 - Funcionários, Belo Horizonte - MG",
    metadata: {
      browser: "Firefox (v124) / macOS Sonoma",
      referrer: "https://academiafitlife.com/ganhe-uma-aula-experimental",
      latitude: -19.932080,
      longitude: -43.938120
    },
    notified: true
  },
  {
    id: "lead-4",
    templateId: "conserto-em-casa",
    templateName: "Conserto em Casa",
    name: "Ana Paula Ramos",
    phone: "(19) 97401-2099",
    email: "ana.ramos@bol.com.br",
    createdAt: "2026-06-08T11:04:00Z",
    status: "Arquivado",
    notes: "Contato duplicado. Arquivado para evitar poluição no painel.",
    metadata: {
      browser: "Edge (v123) / Windows 10",
      referrer: "https://consertoemcasa.com.br/contato"
    },
    notified: true
  },
  {
    id: "lead-5",
    templateId: "advocacia-parceiros",
    templateName: "Advocacia Correia",
    name: "Felipe Mendes Oliveira",
    phone: "(11) 91102-3040",
    email: "felipe.oliveira@adv.fe.com",
    createdAt: "2026-06-10T22:15:00Z",
    status: "Novo",
    notes: "Interesse em assessoria para planejamento tributário de Simples Nacional.",
    address: "Rua Augusta, 1500 - Consolação, São Paulo - SP",
    location: "Rua Augusta, 1500 - Consolação, São Paulo - SP",
    metadata: {
      browser: "Chrome / Android",
      referrer: "https://correiaadvogados.com/tributario-reforma",
      latitude: -23.558340,
      longitude: -46.661020
    },
    notified: true
  },
  {
    id: "lead-6",
    templateId: "conserto-em-casa",
    name: "Gustavo Antunes",
    phone: "(11) 99887-6655",
    email: "gustavolins@terra.com.br",
    templateName: "Conserto em Casa",
    createdAt: "2026-06-10T23:55:00Z",
    status: "Novo",
    notes: "Vazamento na cozinha do apartamento. Solicita visita emergencial.",
    address: "Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP",
    location: "Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP",
    metadata: {
      browser: "Chrome Mobile / Android",
      referrer: "https://consertoemcasa.com.br/vazamentos-urgentes",
      latitude: -23.585520,
      longitude: -46.681140
    },
    notified: true
  }
];

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  emailEnabled: true,
  emailAddress: "anderson.ferreira.pompeu@gmail.com",
  whatsappEnabled: true,
  whatsappNumber: "(11) 98888-7777",
  soundEnabled: true,
  osNotificationEnabled: true
};

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "fwd-default",
    name: "Template Padrão de Encaminhamento",
    content: "Olá, *{nome_profissional}*! Nova captação de serviço disponível [LeadCapture]:\n👤 *Cliente:* {nome_cliente}\n📞 *WhatsApp:* {fone_cliente}\n📍 *Local de Atendimento:* {endereco_cliente}\n🛠️ *Serviço:* {nome_servico}\n📝 *Detalhes:* {descricao_servico}\n\n👉 Acesse o link seguro abaixo para validar seu telefone e aceitar ou recusar o chamado:\n🔗 {link_unico}\n\n⚠️ *Atenção:* Este link expira em no máximo {validade_horas} horas por segurança.",
    isDefault: true
  },
  {
    id: "fwd-urgente",
    name: "Aviso Urgência 🚨",
    content: "🚨 *CHAMADO DE URGÊNCIA - {nome_profissional}* 🚨\n\nOlá! Há uma nova solicitação imediata:\n👤 *Cliente:* {nome_cliente}\n📞 *WhatsApp:* {fone_cliente}\n📍 *Local:* {endereco_cliente}\n🛠️ *Serviço urgentíssimo:* {nome_servico}\n📝 *Descrição:* {descricao_servico}\n\n⚠️ *Ação necessária:* Verifique os detalhes e responda imediatamente no link abaixo:\n🔗 {link_unico}\n\nLink válido por {validade_horas} horas.",
    isDefault: false
  }
];

const DEFAULT_PROFESSIONALS: Professional[] = [
  {
    id: "prof-1",
    name: "Dr. Roberto Correia",
    specialty: "Advocacia Tributária",
    phone: "(11) 98888-1122",
    email: "roberto.correia@advocacia.com.br",
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    templateId: "advocacia-parceiros",
    profitRecords: [
      { id: "pr-1", date: "2026-06-05", description: "Consultoria Tributária Escopo Simples", value: 1500 },
      { id: "pr-2", date: "2026-06-09", description: "Planejamento Sucessório Familiar", value: 4200 }
    ],
    createdAt: "2026-06-01T09:00:00Z"
  },
  {
    id: "prof-2",
    name: "Gabriela Mendes",
    specialty: "Fotografia Newborn & Gestantes",
    phone: "(21) 97766-3344",
    email: "gabriela.mendes@fotoestudio.com",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    templateId: "bebe-familia",
    profitRecords: [
      { id: "pr-3", date: "2026-06-06", description: "Ensaio Newborn Premium", value: 950 },
      { id: "pr-4", date: "2026-06-08", description: "Sessão Gestante Externa", value: 1250 }
    ],
    createdAt: "2026-06-02T11:30:00Z"
  },
  {
    id: "prof-3",
    name: "Marcos Leandro",
    specialty: "Climatização & Reparos Domésticos",
    phone: "(11) 99331-4455",
    email: "marcos.reparos.express@gmail.com",
    photoUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80",
    templateId: "conserto-em-casa",
    profitRecords: [
      { id: "pr-5", date: "2026-06-04", description: "Instalação Ar Condicionado Split", value: 350 },
      { id: "pr-6", date: "2026-06-07", description: "Eletro-Reparo Máquina de Lavar", value: 480 },
      { id: "pr-7", date: "2026-06-09", description: "Conserto Vazamento Válvula de Descarga", value: 220 }
    ],
    createdAt: "2026-06-03T15:20:00Z"
  }
];

// Database state
let dataStore = {
  templates: DEFAULT_TEMPLATES,
  leads: DEFAULT_LEADS,
  alertConfig: DEFAULT_ALERT_CONFIG,
  professionals: DEFAULT_PROFESSIONALS,
  whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
  reviews: [] as Review[],
  webhookLogs: [] as WebhookLog[]
};

// Load data store from disk if exists
try {
  if (fs.existsSync(DB_FILE)) {
    const rawData = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(rawData);
    
    // Backward compatibility for existing data files
    if (!parsed.professionals) {
      parsed.professionals = DEFAULT_PROFESSIONALS;
    }
    if (!parsed.whatsappTemplates) {
      parsed.whatsappTemplates = DEFAULT_WHATSAPP_TEMPLATES;
    }
    if (!parsed.reviews) {
      parsed.reviews = [];
    }
    if (!parsed.webhookLogs) {
      parsed.webhookLogs = [];
    }
    if (!parsed.alertConfig) {
      parsed.alertConfig = { ...DEFAULT_ALERT_CONFIG };
    }
    
    // Sanitize leads to prevent Firestore Security Rules violations (such as excessively long field values from tests)
    if (parsed.leads && Array.isArray(parsed.leads)) {
      for (const lead of parsed.leads) {
        if (lead.phone && typeof lead.phone === "string" && lead.phone.length > 50) {
          lead.phone = lead.phone.substring(0, 50);
        }
        if (lead.name && typeof lead.name === "string" && lead.name.length > 128) {
          lead.name = lead.name.substring(0, 128);
        }
      }
    }
    
    dataStore = parsed;
    console.log("Database loaded successfully from JSON disk backup and sanitized.");
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(dataStore, null, 2), "utf-8");
    console.log("Database file initialized with seed data.");
  }
} catch (err) {
  console.error("Error reading/writing database file, using in-memory:", err);
}

interface Session {
  id: string;
  professionalId: string;
  expiresAt: string;
}

let activeSessions: Session[] = [];

function getCookies(req: express.Request) {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join("="));
    }
  });

  return list;
}

function getLoggedInProfessionalId(req: express.Request): string | null {
  const cookies = getCookies(req);
  let token = cookies["prof_session_token"];
  if (!token) {
    token = req.headers["x-session-token"] as string;
  }
  if (!token) {
    const urlToken = req.query.sessionToken as string;
    if (urlToken) token = urlToken;
  }
  if (!token) return null;

  // Clean expired sessions
  activeSessions = activeSessions.filter(s => new Date(s.expiresAt) > new Date());

  const session = activeSessions.find(s => s.id === token);
  if (!session) return null;

  return session.professionalId;
}


async function loadDataFromFirestore() {
  if (!db) return;
  try {
    logger.info("Loading/Seeding initial data from Cloud Firestore...");

    // 1. Leads
    const leadsSnap = await getDocs(collection(db, "leads"));
    if (leadsSnap.empty) {
      logger.info("Seeding Firestore leads collection...");
      for (const lead of DEFAULT_LEADS) {
        await setDoc(doc(db, "leads", lead.id), stripUndefined(lead));
      }
      dataStore.leads = [...DEFAULT_LEADS];
    } else {
      dataStore.leads = leadsSnap.docs.map(d => d.data() as Lead);
    }

    // 2. Templates
    const templatesSnap = await getDocs(collection(db, "templates"));
    if (templatesSnap.empty) {
      logger.info("Seeding Firestore templates collection...");
      for (const t of DEFAULT_TEMPLATES) {
        await setDoc(doc(db, "templates", t.id), stripUndefined(t));
      }
      dataStore.templates = [...DEFAULT_TEMPLATES];
    } else {
      dataStore.templates = templatesSnap.docs.map(d => d.data() as Template);
    }

    // 3. Professionals
    const profsSnap = await getDocs(collection(db, "professionals"));
    if (profsSnap.empty) {
      logger.info("Seeding Firestore professionals collection...");
      for (const p of DEFAULT_PROFESSIONALS) {
        await setDoc(doc(db, "professionals", p.id), stripUndefined(p));
      }
      dataStore.professionals = [...DEFAULT_PROFESSIONALS];
    } else {
      dataStore.professionals = profsSnap.docs.map(d => d.data() as Professional);
    }

    // 4. WhatsApp Templates
    const wtSnap = await getDocs(collection(db, "whatsappTemplates"));
    if (wtSnap.empty) {
      logger.info("Seeding Firestore whatsappTemplates collection...");
      for (const wt of DEFAULT_WHATSAPP_TEMPLATES) {
        await setDoc(doc(db, "whatsappTemplates", wt.id), stripUndefined(wt));
      }
      dataStore.whatsappTemplates = [...DEFAULT_WHATSAPP_TEMPLATES];
    } else {
      dataStore.whatsappTemplates = wtSnap.docs.map(d => d.data() as WhatsAppTemplate);
    }

    // 5. Alert Config
    const alertConfigDoc = await getDoc(doc(db, "settings", "alertConfig"));
    if (!alertConfigDoc.exists()) {
      logger.info("Seeding Firestore settings/alertConfig...");
      await setDoc(doc(db, "settings", "alertConfig"), stripUndefined(DEFAULT_ALERT_CONFIG));
      dataStore.alertConfig = { ...DEFAULT_ALERT_CONFIG };
    } else {
      dataStore.alertConfig = alertConfigDoc.data() as AlertConfig;
    }

    // 6. Reviews
    try {
      const reviewsSnap = await getDocs(collection(db, "reviews"));
      if (reviewsSnap.empty) {
        dataStore.reviews = [];
      } else {
        dataStore.reviews = reviewsSnap.docs.map(d => d.data() as Review);
      }
    } catch (err) {
      logger.warn("Skipping or empty Firestore reviews collection:", err);
      dataStore.reviews = dataStore.reviews || [];
    }

    // 7. Webhook Logs
    try {
      const logsSnap = await getDocs(collection(db, "webhookLogs"));
      if (logsSnap.empty) {
        dataStore.webhookLogs = [];
      } else {
        dataStore.webhookLogs = logsSnap.docs.map(d => d.data() as WebhookLog);
      }
    } catch (err) {
      logger.warn("Skipping or empty Firestore webhookLogs collection:", err);
      dataStore.webhookLogs = dataStore.webhookLogs || [];
    }

    logger.info("All collections safely loaded from Cloud Firestore Database!");
  } catch (error) {
    logger.error("Failed to load / seed data from Firestore. Falling back to local state:", error);
  }
}

async function saveDatabaseToFirestore() {
  if (!db) return;
  
  // Enqueue settings
  firestoreQueue.enqueueWrite("settings", "alertConfig", dataStore.alertConfig);

  // Enqueue templates
  for (const temp of dataStore.templates) {
    firestoreQueue.enqueueWrite("templates", temp.id, temp);
  }

  // Enqueue professionals
  for (const prof of dataStore.professionals) {
    firestoreQueue.enqueueWrite("professionals", prof.id, prof);
  }

  // Enqueue whatsappTemplates
  for (const wt of dataStore.whatsappTemplates) {
    firestoreQueue.enqueueWrite("whatsappTemplates", wt.id, wt);
  }

  // Enqueue leads
  for (const lead of dataStore.leads) {
    firestoreQueue.enqueueWrite("leads", lead.id, lead);
  }

  // Enqueue reviews
  if (dataStore.reviews) {
    for (const r of dataStore.reviews) {
      firestoreQueue.enqueueWrite("reviews", r.id, r);
    }
  }

  // Enqueue webhookLogs
  if (dataStore.webhookLogs) {
    for (const log of dataStore.webhookLogs) {
      firestoreQueue.enqueueWrite("webhookLogs", log.id, log);
    }
  }
}

async function deleteLeadFromFirestore(id: string) {
  firestoreQueue.enqueueDelete("leads", id);
}

async function deleteTemplateFromFirestore(id: string) {
  firestoreQueue.enqueueDelete("templates", id);
}

async function deleteProfessionalFromFirestore(id: string) {
  firestoreQueue.enqueueDelete("professionals", id);
}

async function deleteWhatsAppTemplateFromFirestore(id: string) {
  firestoreQueue.enqueueDelete("whatsappTemplates", id);
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dataStore, null, 2), "utf-8");
    saveDatabaseToFirestore();
  } catch (err) {
    logger.error("Error saving database back to disk:", err);
  }
}

function recordWebhookLog(req: any, status: number, errorMessage?: string, templateName?: string) {
  try {
    const id = `log-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newLog: WebhookLog = {
      id,
      timestamp: new Date().toISOString(),
      payload: JSON.stringify(req.body || {}),
      status,
      errorMessage,
      userAgent: req.headers["user-agent"] || undefined,
      ipAddress: (req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress || "").toString(),
      templateName: templateName || "Geral"
    };

    if (!dataStore.webhookLogs) {
      dataStore.webhookLogs = [];
    }

    dataStore.webhookLogs.unshift(newLog);

    // Limit to latest 300 logs to prevent file bloat
    if (dataStore.webhookLogs.length > 300) {
      const removedLogs = dataStore.webhookLogs.slice(300);
      dataStore.webhookLogs = dataStore.webhookLogs.slice(0, 300);
      
      if (db) {
        for (const oldLog of removedLogs) {
          firestoreQueue.enqueueDelete("webhookLogs", oldLog.id);
        }
      }
    }

    if (db) {
      firestoreQueue.enqueueWrite("webhookLogs", newLog.id, newLog);
    }

    // Save database
    saveDatabase();
  } catch (err) {
    logger.error("Failed to record webhook log:", err);
  }
}

function checkAndProcessExpiredLeads() {
  const now = new Date();
  let changed = false;

  if (dataStore && dataStore.leads) {
    dataStore.leads.forEach((lead) => {
      if (lead.status === "Encaminhado" && lead.forwardExpiresAt) {
        const expiresAt = new Date(lead.forwardExpiresAt);
        if (expiresAt < now) {
          // Expiration has occurred.
          const professional = (dataStore.professionals || []).find((p) => p.id === lead.assignedProfessionalId);
          const profName = professional ? professional.name : "Desconhecido";
          
          const nowStr = now.toLocaleString("pt-BR");
          const expirationNote = `\n[SISTEMA - EXPIRADO: O profissional ${profName} não atendeu ao encaminhamento dentro do limite de 15 minutos em ${nowStr}. O lead foi desbloqueado para nova oportunidade de atendimento.]`;
          
          lead.notes = `${lead.notes || ""}${expirationNote}`;
          
          // Reset forwarding details and put back to Novo to unlock opportunities
          lead.status = "Novo";
          const oldProfId = lead.assignedProfessionalId;
          lead.assignedProfessionalId = undefined;
          lead.forwardToken = undefined;
          lead.forwardExpiresAt = undefined;
          lead.forwardedAt = undefined;
          
          logger.info(`Lead auto-expired because professional failed to accept routing within 15 minutes`, {
            leadId: lead.id,
            assignedProfessionalId: oldProfId,
            professionalName: profName,
            expiredAt: nowStr,
            action: "auto_expire"
          });

          changed = true;
        }
      }
    });
  }

  if (changed) {
    saveDatabase();
  }
}

function expireLeadInDatabase(lead: any) {
  if (!lead) return;
  const professional = (dataStore.professionals || []).find((p) => p.id === lead.assignedProfessionalId);
  const profName = professional ? professional.name : "Desconhecido";
  
  const nowStr = new Date().toLocaleString("pt-BR");
  const expirationNote = `\n[SISTEMA - EXPIRADO: O profissional ${profName} não atendeu ao encaminhamento dentro do limite de 15 minutos em ${nowStr}. O lead foi desbloqueado para nova oportunidade de atendimento.]`;
  
  lead.notes = `${lead.notes || ""}${expirationNote}`;
  
  // Reset forwarding details and put back to Novo to unlock opportunities
  lead.status = "Novo";
  const oldProfId = lead.assignedProfessionalId;
  lead.assignedProfessionalId = undefined;
  lead.forwardToken = undefined;
  lead.forwardExpiresAt = undefined;
  lead.forwardedAt = undefined;
  
  logger.info(`Lead explicitly force-expired in database`, {
    leadId: lead.id,
    assignedProfessionalId: oldProfId,
    professionalName: profName,
    expiredAt: nowStr,
    action: "explicit_expire"
  });

  saveDatabase();
}

async function startServer() {
  const app = express();

  // Load Cloud DB in background prior to/while launching endpoints so we don't block server startup
  loadDataFromFirestore().catch((err) => {
    logger.error("Failed to load / seed data from Firestore initially in background:", err);
  });

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Custom permissive CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Template-Id");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Endpoints API

  // GET Templates
  app.get("/api/templates", (req, res) => {
    res.json(dataStore.templates);
  });

  // POST Create Template
  app.post("/api/templates", (req, res) => {
    const { name, siteUrl, fields } = req.body;
    if (!name || !siteUrl) {
      res.status(400).json({ error: "Nome e URL do site são obrigatórios." });
      return;
    }

    const simpleId = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const finalId = `${simpleId}-${Math.floor(100 + Math.random() * 900)}`;

    const colors = [
      { bgColor: "bg-sky-100 text-sky-800 border-sky-200", textColor: "#0369a1" },
      { bgColor: "bg-purple-100 text-purple-800 border-purple-200", textColor: "#7e22ce" },
      { bgColor: "bg-emerald-100 text-emerald-800 border-emerald-200", textColor: "#047857" },
      { bgColor: "bg-amber-100 text-amber-800 border-amber-200", textColor: "#b45309" },
      { bgColor: "bg-indigo-100 text-indigo-800 border-indigo-200", textColor: "#4338ca" },
      { bgColor: "bg-rose-100 text-rose-800 border-rose-200", textColor: "#be123c" }
    ];

    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTemplate: Template = {
      id: finalId,
      name,
      siteUrl,
      bgColor: randomColor.bgColor,
      textColor: randomColor.textColor,
      active: true,
      fields: fields || [
        { name: "name", label: "Nome Completo", type: "text", required: true },
        { name: "phone", label: "Telefone / WhatsApp", type: "tel", required: true },
        { name: "email", label: "E-mail", type: "email", required: false }
      ],
      leadsCount: 0,
      createdAt: new Date().toISOString()
    };

    dataStore.templates.push(newTemplate);
    saveDatabase();
    res.status(201).json(newTemplate);
  });

  // PUT Update Template (Active/Inactive or Details)
  app.put("/api/templates/:id", (req, res) => {
    const { id } = req.params;
    const { name, siteUrl, active, fields } = req.body;
    const tIndex = dataStore.templates.findIndex((t) => t.id === id);

    if (tIndex === -1) {
      res.status(404).json({ error: "Template não encontrado." });
      return;
    }

    const updated = {
      ...dataStore.templates[tIndex],
      ...(name && { name }),
      ...(siteUrl && { siteUrl }),
      ...(active !== undefined && { active }),
      ...(fields && { fields })
    };

    dataStore.templates[tIndex] = updated;
    saveDatabase();
    res.json(updated);
  });

  // DELETE Template
  app.delete("/api/templates/:id", (req, res) => {
    const { id } = req.params;
    const initialLen = dataStore.templates.length;
    dataStore.templates = dataStore.templates.filter((t) => t.id !== id);
    
    // Also remove or unlink leads? Let's keep leads but remove the template
    if (dataStore.templates.length === initialLen) {
      res.status(404).json({ error: "Template não encontrado." });
      return;
    }

    deleteTemplateFromFirestore(id).catch(err => console.error("Firestore template deletion fail:", err));
    saveDatabase();
    res.json({ success: true, message: "Template excluído com sucesso." });
  });

  // GET Leads
  app.get("/api/leads", (req, res) => {
    checkAndProcessExpiredLeads();
    // Return all sorted by date descending style
    const sortedLeads = [...dataStore.leads].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sortedLeads);
  });

  // GET Webhook logs
  app.get("/api/webhook-logs", (req, res) => {
    const logs = [...(dataStore.webhookLogs || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    res.json(logs);
  });

  // DELETE Webhook logs (clear history)
  app.delete("/api/webhook-logs", (req, res) => {
    const oldLogs = dataStore.webhookLogs || [];
    dataStore.webhookLogs = [];
    saveDatabase();

    if (db) {
      for (const log of oldLogs) {
        firestoreQueue.enqueueDelete("webhookLogs", log.id);
      }
    }
    res.json({ success: true, message: "Logs de Webhook excluídos permanentemente." });
  });

  // POST Lead capture (Webhook endpoint used by embed.js forms or test simulator)
  app.post("/api/leads", (req, res) => {
    // Match template early to find its name even if capture fails
    const { templateId } = req.body || {};
    const template = dataStore.templates.find((t) => t.id === templateId) || dataStore.templates[0];
    const templateName = template ? template.name : "Desconhecido";

    try {
      const { name, phone, email, address, city, description, referrer, browserInfo } = req.body || {};

      if (!name || !phone) {
        const errorMsg = "Nome e Telefone são os campos obrigatórios básicos de captação.";
        recordWebhookLog(req, 400, errorMsg, templateName);
        res.status(400).json({ error: errorMsg });
        return;
      }

      if (template && !template.active) {
        const errorMsg = "Este canal de captação de leads está desativado pelo administrador.";
        recordWebhookLog(req, 403, errorMsg, templateName);
        res.status(403).json({ error: errorMsg });
        return;
      }

      const templateIdToUse = template ? template.id : "geral";

      const newLead: Lead = {
        id: `lead-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        templateId: templateIdToUse,
        templateName,
        name: name.trim(),
        phone: phone.trim(),
        email: (email || "").trim(),
        address: (address || "").trim(),
        city: (city || "").trim(),
        description: (description || "").trim(),
        location: [address, city].filter(Boolean).join(", ").trim(), // Use address and city as starting location
        createdAt: new Date().toISOString(),
        status: "Novo",
        notes: (description || "").trim(),
        metadata: {
          browser: browserInfo || req.headers["user-agent"] || "Nav Desconhecido",
          referrer: referrer || req.headers["referer"] || template.siteUrl
        },
        notified: false // Marks that dashboard clients have not yet read this alert visual banner active state
      };

      dataStore.leads.push(newLead);

      // Update leads count on template
      if (template) {
        template.leadsCount += 1;
      }

      // Record successful webhook attempt
      recordWebhookLog(req, 201, undefined, templateName);

      saveDatabase();

      // Log simulations of outgoing integrations
      console.log(`[ALERT] Novo Lead recebido para: ${templateName}!`);
      if (dataStore.alertConfig.emailEnabled) {
        console.log(`[SIMULATED EMAIL SENT] Assunto: Novo Lead de "${newLead.name}" no site de ${templateName}. Enviado para: ${dataStore.alertConfig.emailAddress}`);
      }
      if (dataStore.alertConfig.whatsappEnabled) {
        const msgText = `Olá! Você recebeu um novo lead: ${newLead.name} - ${newLead.phone}. Origem: ${templateName}`;
        console.log(`[SIMULATED WHATSAPP SENT] Mensagem: "${msgText}". Enviado para: ${dataStore.alertConfig.whatsappNumber}`);
        if (dataStore.alertConfig.whatsappNumber) {
          sendWhatsAppMessage(dataStore.alertConfig.whatsappNumber, msgText).catch((err) => {
            logger.error(`Failed to dispatch alert WhatsApp to admin`, err);
          });
        }
      }

      res.status(201).json({
        success: true,
        lead: newLead,
        alertsSimulated: {
          email: dataStore.alertConfig.emailEnabled ? dataStore.alertConfig.emailAddress : null,
          whatsapp: dataStore.alertConfig.whatsappEnabled ? dataStore.alertConfig.whatsappNumber : null
        }
      });
    } catch (err: any) {
      logger.error("Error capturing lead via webhook/form api:", err);
      recordWebhookLog(req, 500, err?.message || "Internal server error during lead creation", templateName);
      res.status(500).json({ error: "Erro interno ao processar lead." });
    }
  });

  // PUT Update Lead Status or Notes
  app.put("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    const { status, notes, notified } = req.body;
    const lIndex = dataStore.leads.findIndex((l) => l.id === id);

    if (lIndex === -1) {
      res.status(404).json({ error: "Lead não encontrado." });
      return;
    }

    const oldLead = dataStore.leads[lIndex];
    const oldStatus = oldLead.status;

    const updated = {
      ...oldLead,
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(notified !== undefined && { notified })
    } as Lead;

    // Handle Concluído status for reviews PRD setup
    if (updated.status === "Concluído") {
      if (!updated.reviewToken) {
        updated.reviewToken = "rev-" + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
        const expires = new Date();
        expires.setDate(expires.getDate() + 30); // 30 days expiry
        updated.reviewTokenExpiresAt = expires.toISOString();
      }
      
      // Automatic WhatsApp review notification (only when transitioning to Concluído)
      if (oldStatus !== "Concluído") {
        const professional = (dataStore.professionals || []).find((p) => p.id === updated.assignedProfessionalId);
        const profName = professional ? professional.name : "Profissional";
        const host = req.headers.origin || `http://localhost:3000`;
        const evalLink = `${host}/?review=${updated.id}&token=${updated.reviewToken}`;
        const message = `Olá ${updated.name}! Seu atendimento com ${profName} foi concluído.\nQue tal deixar uma avaliação? Leva menos de 1 minuto:\n${evalLink}`;
        console.log(`[SIMULATED WHATSAPP SENT TO CLIENT ${updated.phone}] Message:\n`, message);
        if (updated.phone) {
          sendWhatsAppMessage(updated.phone, message).catch((err) => {
            logger.error(`Failed to dispatch automatic review WhatsApp to client`, err);
          });
        }
      }
    }

    dataStore.leads[lIndex] = updated;
    saveDatabase();
    res.json(updated);
  });

  // DELETE Lead
  app.delete("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    const initialLen = dataStore.leads.length;

    // Deduct count from template if found
    const targetLead = dataStore.leads.find((l) => l.id === id);
    if (targetLead) {
      const template = dataStore.templates.find((t) => t.id === targetLead.templateId);
      if (template && template.leadsCount > 0) {
        template.leadsCount -= 1;
      }
    }

    dataStore.leads = dataStore.leads.filter((l) => l.id !== id);

    if (dataStore.leads.length === initialLen) {
      res.status(404).json({ error: "Lead não encontrado." });
      return;
    }

    deleteLeadFromFirestore(id).catch(err => console.error("Firestore lead deletion fail:", err));
    saveDatabase();
    res.json({ success: true, message: "Lead excluído." });
  });

  // POST Batch Delete Leads
  app.post("/api/leads/batch-delete", (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "IDs não informados ou formato inválido." });
      return;
    }

    let deletedCount = 0;
    // We filter out any deleted items
    dataStore.leads = dataStore.leads.filter((lead) => {
      if (ids.includes(lead.id)) {
        const template = dataStore.templates.find((t) => t.id === lead.templateId);
        if (template && template.leadsCount > 0) {
          template.leadsCount -= 1;
        }
        deleteLeadFromFirestore(lead.id).catch(err => console.error("Firestore lead deletion fail:", err));
        deletedCount++;
        return false; // exclude this lead
      }
      return true; // keep this lead
    });

    if (deletedCount > 0) {
      saveDatabase();
    }

    res.json({ success: true, message: `${deletedCount} leads excluídos com sucesso.`, deletedCount });
  });

  // POST Forward Lead to Professional (Operação de Encaminhamento)
  app.post("/api/leads/:id/forward", (req, res) => {
    const { id } = req.params;
    const { professionalId, location, validityHours, templateId } = req.body;
    
    const leadIndex = dataStore.leads.findIndex((l) => l.id === id);
    if (leadIndex === -1) {
      res.status(404).json({ error: "Lead não encontrado." });
      return;
    }

    const professional = (dataStore.professionals || []).find((p) => p.id === professionalId);
    if (!professional) {
      res.status(404).json({ error: "Profissional não encontrado." });
      return;
    }

    const token = `fwd-${Math.random().toString(36).substring(2, 11)}`;
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    const updatedLead = {
      ...dataStore.leads[leadIndex],
      assignedProfessionalId: professionalId,
      forwardToken: token,
      forwardExpiresAt: expires.toISOString(),
      forwardedAt: new Date().toISOString(),
      location: (location || "").trim(),
      operatorNotifiedOfAcceptance: false,
      status: "Encaminhado" as const,
      acceptedAt: undefined // reset on re-forward
    };

    dataStore.leads[leadIndex] = updatedLead;
    saveDatabase();

    // Select the notification template
    const templates = dataStore.whatsappTemplates || DEFAULT_WHATSAPP_TEMPLATES;
    let selectedTemplate = templates.find((t) => t.id === templateId);
    if (!selectedTemplate) {
      selectedTemplate = templates.find((t) => t.isDefault) || templates[0];
    }

    const host = req.headers.origin || `http://localhost:${PORT}`;
    const secureLink = `${host}/?p=${token}`;

    const defaultFallbackTemplateText = "Olá, *{nome_profissional}*! Nova captação de serviço disponível [LeadCapture]:\n👤 *Cliente:* {nome_cliente}\n📞 *WhatsApp:* {fone_cliente}\n📍 *Local de Atendimento:* {endereco_cliente}\n🛠️ *Serviço:* {nome_servico}\n📝 *Detalhes:* {descricao_servico}\n\n👉 Acesse o link seguro abaixo para validar seu telefone e aceitar ou recusar o chamado:\n🔗 {link_unico}\n\n⚠️ *Atenção:* Este link expira em no máximo {validade_horas} horas por segurança.";
    const templateContent = selectedTemplate ? selectedTemplate.content : defaultFallbackTemplateText;

    const message = templateContent
      .replace(/{nome_profissional}/g, professional.name)
      .replace(/{nome_cliente}/g, updatedLead.name)
      .replace(/{fone_cliente}/g, updatedLead.phone)
      .replace(/{endereco_cliente}/g, (location || updatedLead.address || updatedLead.location || "Não Informado").trim())
      .replace(/{nome_servico}/g, updatedLead.templateName || "Serviço")
      .replace(/{descricao_servico}/g, (updatedLead.description || updatedLead.notes || "Nenhum detalhe adicional").trim())
      .replace(/{link_unico}/g, secureLink)
      .replace(/{validade_horas}/g, "15 minutos");

    console.log(`[SIMULATED WHATSAPP SENT TO PROFESSIONAL ${professional.phone}] Message:\n`, message);
    if (professional.phone) {
      sendWhatsAppMessage(professional.phone, message).catch((err) => {
        logger.error(`Failed to dispatch alert WhatsApp to professional`, err);
      });
    }

    res.json({
      success: true,
      message: `Lead encaminhado com sucesso para ${professional.name}. Link de acesso gerado.`,
      lead: updatedLead,
      whatsappMessageSimulated: message,
      token
    });
  });

  // GET Public forward details by Token (Exibe dados públicos pré-auth, ou dados completos pós-auth)
  app.get("/api/public/forward/:token", (req, res) => {
    const { token } = req.params;
    const lead = dataStore.leads.find((l) => l.forwardToken === token);
    
    if (!lead) {
      res.status(404).json({ error: "Este link de serviço é inválido ou não existe." });
      return;
    }

    const expiresAt = new Date(lead.forwardExpiresAt || "");
    const forwardedAtToUse = lead.forwardedAt || lead.createdAt;
    const forwardedTime = new Date(forwardedAtToUse).getTime();
    const fifteenMinutesMs = 15 * 60 * 1000;
    if (isNaN(expiresAt.getTime()) || expiresAt < new Date() || (Date.now() - forwardedTime > fifteenMinutesMs)) {
      expireLeadInDatabase(lead);
      res.status(410).json({ error: "Esta oportunidade expirou. Você tem no máximo 15 minutos para aceitar novos leads após o encaminhamento." });
      return;
    }

    const professional = (dataStore.professionals || []).find((p) => p.id === lead.assignedProfessionalId);
    if (!professional) {
      res.status(404).json({ error: "Profissional vinculado não encontrado." });
      return;
    }

    // Check active session
    const sessionProfId = getLoggedInProfessionalId(req);
    
    if (sessionProfId === professional.id) {
      // Session is valid for this professional! Return full lead and professional details
      res.json({
        success: true,
        authenticated: true,
        expiresAt: lead.forwardExpiresAt,
        professional: {
          id: professional.id,
          name: professional.name,
          specialty: professional.specialty,
          phone: professional.phone,
          email: professional.email,
          username: professional.username
        },
        leadOverview: {
          templateName: lead.templateName,
          createdAt: lead.createdAt,
          forwardedAt: forwardedAtToUse,
          location: lead.location || "Não especificado"
        },
        lead
      });
    } else {
      // Unauthenticated overview (Safe list - NO lead PII data is returned)
      res.json({
        success: true,
        authenticated: false,
        isDifferentProfessional: !!sessionProfId, // true if logged in as someone else
        expiresAt: lead.forwardExpiresAt,
        professional: {
          id: professional.id,
          name: professional.name,
          specialty: professional.specialty,
          username: professional.username
        },
        leadOverview: {
          templateName: lead.templateName,
          createdAt: lead.createdAt,
          forwardedAt: forwardedAtToUse
        }
      });
    }
  });

  // POST Authenticate Professional by registered username and password
  app.post("/api/public/forward/:token/auth", (req, res) => {
    const { token } = req.params;
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Por favor, informe seu usuário e senha." });
      return;
    }

    const lead = dataStore.leads.find((l) => l.forwardToken === token);
    if (!lead) {
      res.status(404).json({ error: "Link de acesso inválido ou expirado." });
      return;
    }

    const expiresAt = new Date(lead.forwardExpiresAt || "");
    const forwardedAtToUse = lead.forwardedAt || lead.createdAt;
    const forwardedTime = new Date(forwardedAtToUse).getTime();
    const fifteenMinutesMs = 15 * 60 * 1050; // 15 mins (with leeway)
    if (isNaN(expiresAt.getTime()) || expiresAt < new Date() || (Date.now() - forwardedTime > fifteenMinutesMs)) {
      expireLeadInDatabase(lead);
      res.status(410).json({ error: "Esta oportunidade expirou. O limite de 15 minutos foi excedido." });
      return;
    }

    const professional = (dataStore.professionals || []).find((p) => p.id === lead.assignedProfessionalId);
    if (!professional) {
      res.status(404).json({ error: "Profissional não cadastrado." });
      return;
    }

    // Authenticate by username and password of this professional
    const trimmedUserInput = username.trim().toLowerCase();
    const isMatched = (professional.username || "").toLowerCase().trim() === trimmedUserInput && professional.password === password;

    if (!isMatched) {
      res.status(401).json({ error: "Usuário ou senha incorretos." });
      return;
    }

    // Successful authentication! Create a session token
    const sessionTokenVal = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const isRemember = !!rememberMe;
    const sessionExpiry = isRemember ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    activeSessions.push({
      id: sessionTokenVal,
      professionalId: professional.id,
      expiresAt: sessionExpiry.toISOString()
    });

    res.setHeader(
      "Set-Cookie",
      `prof_session_token=${sessionTokenVal}; Path=/; SameSite=Lax; HttpOnly; ${isRemember ? `Max-Age=${30 * 24 * 60 * 60};` : ""}`
    );

    res.json({
      success: true,
      message: "Autenticação realizada com sucesso!",
      professional,
      lead,
      sessionToken: sessionTokenVal,
      expiresAt: sessionExpiry.toISOString()
    });
  });

  // POST Accept Lead Call by professional
  app.post("/api/public/forward/:token/accept", (req, res) => {
    const { token } = req.params;
    const { estimatedValue } = req.body; 

    const leadIndex = dataStore.leads.findIndex((l) => l.forwardToken === token);
    if (leadIndex === -1) {
      res.status(404).json({ error: "Link inválido ou lead inativo." });
      return;
    }

    const lead = dataStore.leads[leadIndex];
    const expiresAt = new Date(lead.forwardExpiresAt || "");
    const forwardedAtToUse = lead.forwardedAt || lead.createdAt;
    const forwardedTime = new Date(forwardedAtToUse).getTime();
    const fifteenMinutesMs = 15 * 60 * 1050; // 15 mins (with 50ms leeway)
    if (isNaN(expiresAt.getTime()) || expiresAt < new Date() || (Date.now() - forwardedTime > fifteenMinutesMs)) {
      expireLeadInDatabase(lead);
      res.status(410).json({ error: "Esta oportunidade expirou. O limite de 15 minutos foi excedido." });
      return;
    }

    const professional = (dataStore.professionals || []).find((p) => p.id === lead.assignedProfessionalId);
    if (!professional) {
      res.status(404).json({ error: "Profissional não encontrado." });
      return;
    }

    // Validate active session
    const sessionProfId = getLoggedInProfessionalId(req);
    if (!sessionProfId || sessionProfId !== professional.id) {
       res.status(401).json({ error: "Sessão inválida ou expirada. Por favor, faça login para aceitar." });
       return;
    }

    const valNum = Number(estimatedValue) || 0;

    // Update lead details in place
    const nowStr = new Date().toISOString();
    const updatedLead = {
      ...lead,
      status: "Em Atendimento" as const,
      acceptedAt: nowStr,
      estimatedValue: valNum,
      operatorNotifiedOfAcceptance: false, // will flag operator dashboard alert
      notes: `${lead.notes || ""}\n[SISTEMA - Chamado aceito pelo profissional ${professional.name} em ${new Date(nowStr).toLocaleString("pt-BR")} com valor estimado do serviço de R$ ${valNum.toFixed(2)}]`
    };

    dataStore.leads[leadIndex] = updatedLead;

    // Register details in the professional's profit records (as description + tracking history)
    // Find the professional index to mutate it
    const profIndex = (dataStore.professionals || []).findIndex((p) => p.id === professional.id);
    if (profIndex !== -1) {
      // Check if this profit record or log exists
      const alreadyRegistered = (dataStore.professionals[profIndex].profitRecords || []).some(
        (r) => r.description.includes(lead.id)
      );
      if (!alreadyRegistered) {
        if (!dataStore.professionals[profIndex].profitRecords) {
          dataStore.professionals[profIndex].profitRecords = [];
        }
        dataStore.professionals[profIndex].profitRecords.push({
          id: `fwd-acc-${Date.now()}`,
          date: nowStr.split("T")[0],
          description: `Novo Lead Aceito: ${lead.name} (Chamado #${lead.id}) - Canal: ${lead.templateName}`,
          value: valNum
        });
      }
    }

    saveDatabase();
    res.json({
      success: true,
      message: "Lead aceito com sucesso!",
      lead: updatedLead
    });
  });

  // POST Decline / Recuse Lead Call by professional
  app.post("/api/public/forward/:token/recuse", (req, res) => {
    const { token } = req.params;
    const { reason } = req.body;

    const leadIndex = dataStore.leads.findIndex((l) => l.forwardToken === token);
    if (leadIndex === -1) {
      res.status(404).json({ error: "Link inválido ou lead inativo." });
      return;
    }

    const lead = dataStore.leads[leadIndex];
    const professional = (dataStore.professionals || []).find((p) => p.id === lead.assignedProfessionalId);
    if (!professional) {
      res.status(404).json({ error: "Profissional não encontrado." });
      return;
    }

    // Validate active session
    const sessionProfId = getLoggedInProfessionalId(req);
    if (!sessionProfId || sessionProfId !== professional.id) {
       res.status(401).json({ error: "Sessão inválida ou expirada. Por favor, faça login para recusar." });
       return;
    }

    // Reset forward data, add notes of decline
    const updatedLead = {
      ...lead,
      assignedProfessionalId: undefined,
      forwardToken: undefined,
      forwardExpiresAt: undefined,
      status: "Recusado" as const,
      notes: `${lead.notes || ""}\n[SISTEMA - Chamado recusado pelo profissional ${professional.name} em ${new Date().toLocaleString("pt-BR")}. Motivo: ${reason || "Não especificado"}]`
    };

    dataStore.leads[leadIndex] = updatedLead;
    saveDatabase();

    res.json({
      success: true,
      message: "Chamado recusado com sucesso.",
      lead: updatedLead
    });
  });

  // POST operator dismiss / acknowledge the acceptance alert
  app.post("/api/leads/:id/acknowledge-acceptance", (req, res) => {
    const { id } = req.params;
    const leadIndex = dataStore.leads.findIndex((l) => l.id === id);
    if (leadIndex === -1) {
      res.status(404).json({ error: "Lead não encontrado." });
      return;
    }

    dataStore.leads[leadIndex].operatorNotifiedOfAcceptance = true;
    saveDatabase();
    res.json({ success: true, lead: dataStore.leads[leadIndex] });
  });

  // GET Professionals List
  app.get("/api/professionals", (req, res) => {
    res.json(dataStore.professionals || []);
  });

  // POST Add Professional
  app.post("/api/professionals", (req, res) => {
    const { name, specialty, phone, email, photoUrl, templateId, username, password } = req.body;
    if (!name || !specialty) {
      res.status(400).json({ error: "Nome e Especialidade são obrigatórios." });
      return;
    }

    if (username && username.trim()) {
      const trimmedUser = username.trim().toLowerCase();
      const userExists = (dataStore.professionals || []).some(
        (p) => p.username?.toLowerCase() === trimmedUser
      );
      if (userExists) {
        res.status(400).json({ error: "Este nome de usuário já está sendo utilizado por outro profissional." });
        return;
      }
    }

    const newProf: Professional = {
      id: `prof-${Date.now()}`,
      name: name.trim(),
      specialty: specialty.trim(),
      phone: (phone || "").trim(),
      email: (email || "").trim(),
      photoUrl: photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      templateId: templateId || "",
      username: username ? username.trim() : "",
      password: password || "",
      profitRecords: [],
      createdAt: new Date().toISOString()
    };

    if (!dataStore.professionals) {
      dataStore.professionals = [];
    }

    dataStore.professionals.push(newProf);
    saveDatabase();
    res.status(201).json(newProf);
  });

  // PUT Update Professional
  app.put("/api/professionals/:id", (req, res) => {
    const { id } = req.params;
    const { name, specialty, phone, email, photoUrl, templateId, username, password } = req.body;
    const pIndex = (dataStore.professionals || []).findIndex((p) => p.id === id);

    if (pIndex === -1) {
      res.status(404).json({ error: "Profissional não encontrado." });
      return;
    }

    if (username !== undefined && username.trim()) {
      const trimmedUser = username.trim().toLowerCase();
      const userExists = (dataStore.professionals || []).some(
        (p) => p.id !== id && p.username?.toLowerCase() === trimmedUser
      );
      if (userExists) {
        res.status(400).json({ error: "Este nome de usuário já está sendo utilizado por outro profissional." });
        return;
      }
    }

    const updated = {
      ...dataStore.professionals[pIndex],
      ...(name && { name: name.trim() }),
      ...(specialty && { specialty: specialty.trim() }),
      ...(phone !== undefined && { phone: phone.trim() }),
      ...(email !== undefined && { email: email.trim() }),
      ...(photoUrl !== undefined && { photoUrl: photoUrl }),
      ...(templateId !== undefined && { templateId: templateId }),
      ...(username !== undefined && { username: username.trim() }),
      ...(password !== undefined && { password: password })
    };

    dataStore.professionals[pIndex] = updated;
    saveDatabase();
    res.json(updated);
  });

  // POST Professional Login with username & password
  app.post("/api/public/professional/login", (req, res) => {
    const { username, password, rememberMe } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Usuário e senha são obrigatórios." });
      return;
    }

    const trimmedUser = username.trim().toLowerCase();
    const prof = (dataStore.professionals || []).find(
      (p) => p.username?.toLowerCase() === trimmedUser && p.password === password
    );

    if (!prof) {
      res.status(401).json({ error: "Usuário ou senha incorretos." });
      return;
    }

    // Successful authentication! Create a session token
    const sessionTokenVal = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const isRemember = !!rememberMe;
    const sessionExpiry = isRemember ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    activeSessions.push({
      id: sessionTokenVal,
      professionalId: prof.id,
      expiresAt: sessionExpiry.toISOString()
    });

    res.setHeader(
      "Set-Cookie",
      `prof_session_token=${sessionTokenVal}; Path=/; SameSite=Lax; HttpOnly; ${isRemember ? `Max-Age=${30 * 24 * 60 * 60};` : ""}`
    );

    res.json({ success: true, professional: prof, sessionToken: sessionTokenVal, expiresAt: sessionExpiry.toISOString() });
  });

  // DELETE Professional
  app.delete("/api/professionals/:id", (req, res) => {
    const { id } = req.params;
    const initialLen = (dataStore.professionals || []).length;
    dataStore.professionals = (dataStore.professionals || []).filter((p) => p.id !== id);

    if (dataStore.professionals.length === initialLen) {
      res.status(404).json({ error: "Profissional não encontrado." });
      return;
    }

    deleteProfessionalFromFirestore(id).catch(err => console.error("Firestore professional deletion fail:", err));
    saveDatabase();
    res.json({ success: true, message: "Profissional excluído com sucesso." });
  });

  // --- IN-MEMORY RATE LIMITER FOR PUBLIC REVIEWS ---
  const reviewIPRateLimits: Record<string, { attempts: number; expiresAt: number }> = {};

  function checkReviewLimiter(ip: string): boolean {
    const now = Date.now();
    if (!reviewIPRateLimits[ip] || reviewIPRateLimits[ip].expiresAt < now) {
      reviewIPRateLimits[ip] = { attempts: 1, expiresAt: now + 3600000 }; // 1hr expiring window
      return true;
    }
    if (reviewIPRateLimits[ip].attempts >= 3) {
      return false;
    }
    reviewIPRateLimits[ip].attempts += 1;
    return true;
  }

  // GET Review details (public validation)
  app.get("/api/review/:leadId", (req, res) => {
    const { leadId } = req.params;
    const { token } = req.query;

    const lead = (dataStore.leads || []).find(l => l.id === leadId);
    if (!lead) {
      res.status(404).json({ error: "Link inválido. Lead não encontrado." });
      return;
    }

    if (!token || lead.reviewToken !== token) {
      res.status(404).json({ error: "Link de avaliação inválido ou incorreto." });
      return;
    }

    if (lead.reviewTokenExpiresAt) {
      const expires = new Date(lead.reviewTokenExpiresAt);
      if (expires < new Date()) {
        res.status(410).json({ error: "Este link expirou. Entre em contato com o profissional." });
        return;
      }
    }

    if (lead.reviewedAt) {
      res.status(400).json({ error: "Você já enviou sua avaliação. Obrigado!" });
      return;
    }

    const professional = (dataStore.professionals || []).find(p => p.id === lead.assignedProfessionalId);
    if (!professional) {
      res.status(404).json({ error: "Profissional não encontrado para este atendimento." });
      return;
    }

    res.json({
      professionalName: professional.name,
      specialty: professional.specialty,
      templateName: lead.templateName || "Serviço"
    });
  });

  // POST Submit Review (public)
  app.post("/api/review/:leadId", (req, res) => {
    const { leadId } = req.params;
    const { token, rating, comment, clientName } = req.body;

    // Rate Limiting (máx. 3 tentativas por IP por hora)
    const clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
    const ipStr = Array.isArray(clientIP) ? clientIP[0] : String(clientIP);

    if (!checkReviewLimiter(ipStr)) {
      res.status(429).json({ error: "Limite de tentativas excedido. Tente novamente mais tarde (máximo de 3 tentativas por hora)." });
      return;
    }

    const lIndex = (dataStore.leads || []).findIndex(l => l.id === leadId);
    if (lIndex === -1) {
      res.status(404).json({ error: "Link inválido. Lead não encontrado." });
      return;
    }

    const lead = dataStore.leads[lIndex];

    if (!token || lead.reviewToken !== token) {
      res.status(404).json({ error: "Link de avaliação inválido." });
      return;
    }

    if (lead.reviewTokenExpiresAt) {
      const expires = new Date(lead.reviewTokenExpiresAt);
      if (expires < new Date()) {
        res.status(410).json({ error: "Este link expirou. Entre em contato com o profissional." });
        return;
      }
    }

    if (lead.reviewedAt) {
      res.status(400).json({ error: "Você já enviou sua avaliação. Obrigado!" });
      return;
    }

    const ratingVal = Number(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      res.status(400).json({ error: "A nota de avaliação é obrigatória e deve ser entre 1 e 5 estrelas." });
      return;
    }

    const professionalId = lead.assignedProfessionalId;
    if (!professionalId) {
      res.status(404).json({ error: "Profissional não associado a esta avaliação." });
      return;
    }

    const profIndex = (dataStore.professionals || []).findIndex(p => p.id === professionalId);
    if (profIndex === -1) {
      res.status(404).json({ error: "Profissional não cadastrado no sistema." });
      return;
    }

    const nowStr = new Date().toISOString();

    // 1. Create unique Review ID
    const reviewId = `rev-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const review: Review = {
      id: reviewId,
      leadId,
      professionalId,
      rating: ratingVal,
      comment: comment ? String(comment).trim().substring(0, 500) : undefined,
      clientName: clientName ? String(clientName).trim().substring(0, 100) : undefined,
      createdAt: nowStr,
      tokenUsed: token
    };

    // 2. Insert rating review in list
    if (!dataStore.reviews) {
      dataStore.reviews = [];
    }
    dataStore.reviews.push(review);

    // 3. Mark lead as reviewed
    lead.reviewedAt = nowStr;

    // 4. Recalculate status of professional review statistics
    const profReviews = dataStore.reviews.filter(r => r.professionalId === professionalId);
    const total = profReviews.length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of profReviews) {
      const star = Math.max(1, Math.min(5, Math.floor(r.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[star] = (distribution[star] || 0) + 1;
      sum += star;
    }
    const average = total > 0 ? parseFloat((sum / total).toFixed(1)) : 0;
    dataStore.professionals[profIndex].reviewStats = {
      average,
      total,
      distribution
    };

    // 5. Enqueue instantly Firestore writes so we save synchronously
    if (db) {
      firestoreQueue.enqueueWrite("reviews", review.id, review);
      firestoreQueue.enqueueWrite("leads", lead.id, lead);
      firestoreQueue.enqueueWrite("professionals", professionalId, dataStore.professionals[profIndex]);
    }

    saveDatabase();

    res.json({ success: true, message: "Avaliação salva com sucesso!", review });
  });

  // POST Manually Resend evaluation link
  app.post("/api/leads/:id/resend-review", (req, res) => {
    const { id } = req.params;
    const lead = (dataStore.leads || []).find(l => l.id === id);
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado." });
      return;
    }

    if (lead.status !== "Concluído") {
      res.status(400).json({ error: "Este lead ainda não foi Concluído. O link de avaliação só está disponível após a conclusão." });
      return;
    }

    if (lead.reviewedAt) {
      res.status(400).json({ error: "Este lead já foi avaliado pelo cliente final." });
      return;
    }

    // Check if token expired
    if (lead.reviewTokenExpiresAt && new Date(lead.reviewTokenExpiresAt) < new Date()) {
      res.status(400).json({ error: "O link de avaliação deste lead expirou." });
      return;
    }

    // Ensure token exists
    if (!lead.reviewToken) {
      lead.reviewToken = "rev-" + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      lead.reviewTokenExpiresAt = expires.toISOString();
      saveDatabase();
    }

    const professional = (dataStore.professionals || []).find(p => p.id === lead.assignedProfessionalId);
    const profName = professional ? professional.name : "Profissional";
    const host = req.headers.origin || `http://localhost:3000`;
    const evalLink = `${host}/?review=${lead.id}&token=${lead.reviewToken}`;
    const message = `[RE-ENVIADO] Olá ${lead.name}! Seu atendimento com ${profName} foi concluído.\nQue tal deixar uma avaliação? Leva menos de 1 minuto:\n${evalLink}`;
    console.log(`[SIMULATED MANUAL RE-SEND WHATSAPP TO CLIENT ${lead.phone}] Message:\n`, message);
    if (lead.phone) {
      sendWhatsAppMessage(lead.phone, message).catch((err) => {
        logger.error(`Failed to dispatch manual review WhatsApp to client`, err);
      });
    }

    res.json({ success: true, message: `Link de avaliação reenviado com sucesso via WhatsApp Simulado e Evolution API.`, evalLink });
  });

  // GET professional reviews (Pública/Admin, lists reviews of a single professional)
  app.get("/api/professionals/:id/reviews", (req, res) => {
    const { id } = req.params;
    const profReviews = (dataStore.reviews || []).filter(r => r.professionalId === id);
    profReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(profReviews);
  });

  // POST Add Profit Record to Professional
  app.post("/api/professionals/:id/profit", (req, res) => {
    const { id } = req.params;
    const { date, description, value } = req.body;

    const pIndex = (dataStore.professionals || []).findIndex((p) => p.id === id);
    if (pIndex === -1) {
      res.status(404).json({ error: "Profissional não encontrado." });
      return;
    }
    if (!description || value === undefined) {
      res.status(400).json({ error: "Descrição e valor de lucro são obrigatórios." });
      return;
    }

    const newRecord: ProfitRecord = {
      id: `pr-${Date.now()}`,
      date: date || new Date().toISOString().split("T")[0],
      description: description.trim(),
      value: Number(value)
    };

    dataStore.professionals[pIndex].profitRecords.push(newRecord);
    saveDatabase();
    res.status(201).json(dataStore.professionals[pIndex]);
  });

  // GET WhatsApp Templates
  app.get("/api/whatsapp-templates", (req, res) => {
    res.json(dataStore.whatsappTemplates || DEFAULT_WHATSAPP_TEMPLATES);
  });

  // POST Create WhatsApp Template
  app.post("/api/whatsapp-templates", (req, res) => {
    const { name, content, isDefault } = req.body;
    if (!name || !content) {
      res.status(400).json({ error: "Nome e conteúdo do template são obrigatórios." });
      return;
    }

    const newTemplate: WhatsAppTemplate = {
      id: `tmpl-${Date.now()}`,
      name: name.trim(),
      content: content.trim(),
      isDefault: !!isDefault
    };

    if (!dataStore.whatsappTemplates) {
      dataStore.whatsappTemplates = [];
    }

    if (newTemplate.isDefault) {
      dataStore.whatsappTemplates.forEach((t) => (t.isDefault = false));
    } else if (dataStore.whatsappTemplates.length === 0) {
      newTemplate.isDefault = true;
    }

    dataStore.whatsappTemplates.push(newTemplate);
    saveDatabase();
    res.status(201).json(newTemplate);
  });

  // PUT Update WhatsApp Template
  app.put("/api/whatsapp-templates/:id", (req, res) => {
    const { id } = req.params;
    const { name, content, isDefault } = req.body;

    if (!dataStore.whatsappTemplates) {
      dataStore.whatsappTemplates = [...DEFAULT_WHATSAPP_TEMPLATES];
    }

    const tIndex = dataStore.whatsappTemplates.findIndex((t) => t.id === id);
    if (tIndex === -1) {
      res.status(404).json({ error: "Template não encontrado." });
      return;
    }

    if (name) dataStore.whatsappTemplates[tIndex].name = name.trim();
    if (content) dataStore.whatsappTemplates[tIndex].content = content.trim();

    if (isDefault !== undefined) {
      const isDef = !!isDefault;
      if (isDef) {
        dataStore.whatsappTemplates.forEach((t) => (t.isDefault = false));
        dataStore.whatsappTemplates[tIndex].isDefault = true;
      } else {
        dataStore.whatsappTemplates[tIndex].isDefault = false;
        // If we set this to false, ensure at least one remains default
        const currentDefault = dataStore.whatsappTemplates.find((t) => t.isDefault);
        if (!currentDefault) {
          dataStore.whatsappTemplates[0].isDefault = true;
        }
      }
    }

    saveDatabase();
    res.json(dataStore.whatsappTemplates[tIndex]);
  });

  // DELETE WhatsApp Template
  app.delete("/api/whatsapp-templates/:id", (req, res) => {
    const { id } = req.params;

    if (!dataStore.whatsappTemplates) {
      dataStore.whatsappTemplates = [...DEFAULT_WHATSAPP_TEMPLATES];
    }

    const tIndex = dataStore.whatsappTemplates.findIndex((t) => t.id === id);
    if (tIndex === -1) {
      res.status(404).json({ error: "Template não encontrado." });
      return;
    }

    const wasDefault = dataStore.whatsappTemplates[tIndex].isDefault;
    dataStore.whatsappTemplates.splice(tIndex, 1);

    if (dataStore.whatsappTemplates.length === 0) {
      // Re-initialize with defaults to prevent empty system
      dataStore.whatsappTemplates = [...DEFAULT_WHATSAPP_TEMPLATES];
    } else if (wasDefault) {
      // Set the first remaining template as default
      dataStore.whatsappTemplates[0].isDefault = true;
    }

    deleteWhatsAppTemplateFromFirestore(id).catch(err => console.error("Firestore whatsappTemplate deletion fail:", err));
    saveDatabase();
    res.json({ success: true, message: "Template excluído com sucesso." });
  });

  // GET Alert Config
  app.get("/api/alerts/config", (req, res) => {
    res.json(dataStore.alertConfig);
  });

  // POST Update Alert Config
  app.post("/api/alerts/config", (req, res) => {
    const { emailEnabled, emailAddress, whatsappEnabled, whatsappNumber, soundEnabled, osNotificationEnabled } = req.body;

    dataStore.alertConfig = {
      emailEnabled: !!emailEnabled,
      emailAddress: emailAddress || "",
      whatsappEnabled: !!whatsappEnabled,
      whatsappNumber: whatsappNumber || "",
      soundEnabled: soundEnabled !== undefined ? !!soundEnabled : true,
      osNotificationEnabled: osNotificationEnabled !== undefined ? !!osNotificationEnabled : true
    };

    saveDatabase();
    res.json(dataStore.alertConfig);
  });

  // Reset demo databases to original
  app.post("/api/reset", (req, res) => {
    dataStore = {
      templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
      leads: JSON.parse(JSON.stringify(DEFAULT_LEADS)),
      alertConfig: { ...DEFAULT_ALERT_CONFIG },
      professionals: JSON.parse(JSON.stringify(DEFAULT_PROFESSIONALS)),
      whatsappTemplates: JSON.parse(JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES)),
      reviews: [],
      webhookLogs: []
    };
    saveDatabase();
    res.json({ success: true, message: "Banco de dados de demonstração reiniciado!" });
  });

  // Serve embed.js dynamically
  app.get("/embed.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    
    // Read local script and return it
    const HOST_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    
    const embedScript = `
/**
 * LeadCapture JS Embedded Widget Script
 * Auto-generated for external widgets
 */
(function() {
  // Find current running script setup
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  if (!currentScript) return;

  // Read config from data-attributes
  var templateId = currentScript.getAttribute('data-template') || 'conserto-em-casa';
  var placeholderName = currentScript.getAttribute('data-placeholder-name') || 'Qual o seu nome?';
  var placeholderPhone = currentScript.getAttribute('data-placeholder-phone') || 'WhatsApp (com DDD)';
  var placeholderEmail = currentScript.getAttribute('data-placeholder-email') || 'Seu e-mail (opcional)';
  var buttonText = currentScript.getAttribute('data-button-text') || 'Receber Orçamento';
  var buttonColor = currentScript.getAttribute('data-button-color') || '#22c55e'; // default green-500
  var formBg = currentScript.getAttribute('data-bg-color') || '#ffffff';
  var titleText = currentScript.getAttribute('data-title') || 'Solicite um Contato';

  // Create a container to place the form right before the script tag
  var container = document.createElement('div');
  container.className = 'leadcapture-embed-container';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style.maxWidth = '400px';
  container.style.width = '100%';
  container.style.boxSizing = 'border-box';
  container.style.padding = '20px';
  container.style.background = formBg;
  container.style.borderRadius = '12px';
  container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
  container.style.border = '1px solid #e2e8f0';
  container.style.margin = '10px auto';

  // Injecting custom CSS dynamically
  var formId = 'lc-form-' + Math.floor(Math.random() * 100000);
  
  var formHtml = [
    '<h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1e293b; text-align: center;">' + titleText + '</h3>',
    '<form id="' + formId + '" style="display: flex; flex-direction: column; gap: 12px; margin: 0;">',
      '<div style="display: flex; flex-direction: column; gap: 4px;">',
        '<label style="font-size: 12px; font-weight: 500; color: #64748b; margin-left: 2px;">Nome *</label>',
        '<input type="text" name="name" required placeholder="' + placeholderName + '" style="padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none; transition: border 0.2s;" onfocus="this.style.borderColor=\'' + buttonColor + '\'" onblur="this.style.borderColor=\'#cbd5e1\'">',
      '</div>',
      '<div style="display: flex; flex-direction: column; gap: 4px;">',
        '<label style="font-size: 12px; font-weight: 500; color: #64748b; margin-left: 2px;">Telefone / WhatsApp *</label>',
        '<input type="tel" name="phone" required placeholder="' + placeholderPhone + '" style="padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none; transition: border 0.2s;" onfocus="this.style.borderColor=\'' + buttonColor + '\'" onblur="this.style.borderColor=\'#cbd5e1\'">',
      '</div>',
      '<div style="display: flex; flex-direction: column; gap: 4px;">',
        '<label style="font-size: 12px; font-weight: 500; color: #64748b; margin-left: 2px;">E-mail (opcional)</label>',
        '<input type="email" name="email" placeholder="' + placeholderEmail + '" style="padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; outline: none; transition: border 0.2s;" onfocus="this.style.borderColor=\'' + buttonColor + '\'" onblur="this.style.borderColor=\'#cbd5e1\'">',
      '</div>',
      '<button type="submit" style="background: ' + buttonColor + '; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.1s; margin-top: 6px;">' + buttonText + '</button>',
      '<div style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 4px;">Protegido por LeadCapture SaaS</div>',
    '</form>',
    '<div class="success-msg" style="display: none; text-align: center; padding: 20px 10px;">',
      '<div style="background: #e8f5e9; color: #2e7d32; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 24px; font-weight: bold;">✓</div>',
      '<h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Obrigado!</h4>',
      '<p style="margin: 0; color: #64748b; font-size: 13px;">Seus dados foram enviados. Entraremos em contato em breve!</p>',
    '</div>'
  ].join('');

  container.innerHTML = formHtml;
  currentScript.parentNode.insertBefore(container, currentScript);

  // Setup Form Handler
  var formEl = document.getElementById(formId);
  var successEl = container.querySelector('.success-msg');

  formEl.addEventListener('submit', function(e) {
    e.preventDefault();
    
    var submitBtn = formEl.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    submitBtn.innerText = 'Enviando...';

    // Form values
    var nameVal = formEl.querySelector('input[name="name"]').value;
    var phoneVal = formEl.querySelector('input[name="phone"]').value;
    var emailVal = formEl.querySelector('input[name="email"]').value;

    var payload = {
      name: nameVal,
      phone: phoneVal,
      email: emailVal,
      templateId: templateId,
      referrer: window.location.href,
      browserInfo: 'Integrado / ' + navigator.userAgent
    };

    // Post to central LeadCapture backend
    fetch('${HOST_URL}/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Falha ao enviar lead');
      return res.json();
    })
    .then(function(data) {
      formEl.style.display = 'none';
      successEl.style.display = 'block';
    })
    .catch(function(err) {
      alert('Houve um erro ao enviar os dados. Por favor tente novamente.');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.innerText = buttonText;
    });
  });

})();
    `;
    res.send(embedScript);
  });

  // AI Chatbot endpoint for real-time lead extraction
  app.post("/api/chatbot/chat", async (req, res) => {
    const { 
      message, 
      history = [], 
      templateId, 
      conversationId, 
      extractedState = {},
      toneOfVoice = "amigavel-casual",
      personaDescription = "",
      systemRules = ""
    } = req.body;

    if (!message) {
      res.status(400).json({ error: "Mensagem é obrigatória." });
      return;
    }

    // Match template
    const template = dataStore.templates.find((t) => t.id === templateId) || dataStore.templates[0];
    const templateName = template ? template.name : "Canal Geral";
    const templateIdToUse = template ? template.id : "geral";
    const templateSiteUrl = template ? template.siteUrl : "https://leadcapture.io";

    // Build Tone guidelines
    let toneGuideline = "";
    if (toneOfVoice === "profissional-formal") {
      toneGuideline = "- Mantenha um tom profissional, respeitoso e formal. Evite gírias, seja direto, polido e use poucos emojis de maneira discreta.";
    } else if (toneOfVoice === "tecnico-especialista") {
      toneGuideline = "- Demonstre alto conhecimento técnico, utilize terminologia precisa e seja focado em prover soluções com segurança, robustez e autoridade profissional.";
    } else if (toneOfVoice === "entusiasmado-vendas") {
      toneGuideline = "- Seja enérgico, altamente persuasivo, otimista e foque com entusiasmo nos benefícios do serviço. Utilize gatilhos mentais sutis de urgência e valor.";
    } else if (toneOfVoice === "calmo-empatico") {
      toneGuideline = "- Transmita imensa empatia, seja acolhedor, calmo, paciente e demonstre total compreensão e escuta ativa com a situação ou problema relatado pelo cliente.";
    } else { // amigavel-casual
      toneGuideline = "- Use um tom de voz amigável, acolhedor, alegre e informal. Pode usar exclamações simpáticas e emojis moderados para criar conexão.";
    }

    // Reconstruct instruction with Persona and Tone of Voice
    const systemInstruction = `Você é um Assistente Virtual de Chatbot especializado para a empresa "${templateName}" (${templateSiteUrl}).
Seu nome ou identidade é definido pelas diretrizes da Persona abaixo.
Seu objetivo principal é interagir com o visitante do site, responder às suas dúvidas e capturar as seguintes informações de contato de forma natural durante a conversa para registrar uma oportunidade de negócio (Lead) no CRM:
1. Nome Completo (name)
2. Telefone/WhatsApp (phone)
3. E-mail (email) - se disponível/opcional
4. Endereço ou Cidade (address) - se aplicável/opcional
5. Descrição resumida da necessidade do cliente (description)

${personaDescription ? `Sua Persona de Atendimento:\n${personaDescription}\n` : `Sua Persona de Atendimento:\nVocê é um assistente virtual atencioso e especializado da empresa "${templateName}".\n`}

Diretrizes de Tom de Voz:
${toneGuideline}

${systemRules ? `Regras & Restrições de Negócio Adicionais:\n${systemRules}\n` : ""}

Instruções de Comportamento Gerais:
- Responda brevemente a qualquer dúvida ou saudação do usuário com foco no negócio dela. Nunca envie parágrafos gigantes de uma vez só.
- Solicite as informações de contato preferencialmente de forma progressiva e natural para não afugentar o lead.
- Sempre escreva suas respostas em Português do Brasil (pt-BR).
- Mantenha o cliente engajado.

INSTRUÇÃO IMPORTANTE: 
Você deve SEMPRE extrair as informações que o usuário mencionou ao longo de toda a conversa e retornar no objeto JSON estruturado solicitado.
Preencha o objeto "extractedData" com o que já foi extraído ou refinado. Seja persistente e atualize esse objeto a cada mensagem à medida que o usuário fornecer novos dados. 
Quando você tiver extraído PELO MENOS o Nome e o Telefone/WhatsApp válidos da pessoa, defina "hasCompleteBasicInfo" as true para que o sistema salve o lead automaticamente e notifique o administrador do CRM em tempo real!`;

    try {
      if (aiGenAI) {
        // Prepare formatted chat conversation so model knows history easily
        const chatHistoryFormatted = history
          .map((h: any) => `${h.sender === "user" ? "Usuário" : "Assistente"}: ${h.text}`)
          .join("\n");
        const promptWithContext = `Aqui está o histórico completo da conversa até o momento:\n${chatHistoryFormatted}\n\nUsuário acabou de enviar a mensagem: "${message}"\n\nAgora formule sua resposta conversacional curta em Português-BR para o usuário. Adicionalmente, analise toda a conversa para atualizar os dados de contato extraídos de ponta a ponta (nome, celular/whatsapp, email, endereço, descrição da necessidade). Se Name E Phone estiverem coletados com clareza, marque "hasCompleteBasicInfo" como true para salvarmos no CRM.`;

        const response = await aiGenAI.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptWithContext,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING, description: "A resposta atenciosa e simpática criada pelo assistente virtual." },
                extractedData: {
                  type: Type.OBJECT,
                  description: "As informações de contato identificadas em toda a conversa.",
                  properties: {
                    name: { type: Type.STRING, description: "Nome completo do usuário se fornecido" },
                    phone: { type: Type.STRING, description: "Telefone ou WhatsApp do usuário se fornecido" },
                    email: { type: Type.STRING, description: "Endereço de e-mail se fornecido" },
                    address: { type: Type.STRING, description: "Endereço, cidade ou localização se fornecido" },
                    description: { type: Type.STRING, description: "Dúvida, projeto, reparo ou necessidade do cliente resumida" }
                  }
                },
                hasCompleteBasicInfo: {
                  type: Type.BOOLEAN,
                  description: "Marcar true somente se houver um Nome e Telefone identificados na conversa."
                }
              },
              required: ["reply", "hasCompleteBasicInfo"]
            }
          }
        });

        // Safe parse
        const aiOutput = JSON.parse(response.text.trim());
        let finalReply = aiOutput.reply;
        let finalExtracted = aiOutput.extractedData || {};
        let finalHasComplete = !!aiOutput.hasCompleteBasicInfo;

        // Merge back-end derived values over extracted parameters
        let nameVal = (finalExtracted.name || "").trim();
        let phoneVal = (finalExtracted.phone || "").trim();
        let emailVal = (finalExtracted.email || "").trim();
        let addressVal = (finalExtracted.address || "").trim();
        let descVal = (finalExtracted.description || "").trim();

        // Enforce length limits to satisfy Firestore Rules and prevent errors
        if (nameVal.length > 128) nameVal = nameVal.substring(0, 128);
        if (phoneVal.length > 50) phoneVal = phoneVal.substring(0, 50);
        if (emailVal.length > 120) emailVal = emailVal.substring(0, 120);
        if (addressVal.length > 256) addressVal = addressVal.substring(0, 256);
        if (descVal.length > 1000) descVal = descVal.substring(0, 1000);

        let leadSaved = false;
        let leadId = "";

        if (finalHasComplete && nameVal && phoneVal) {
          // Look if lead already registered for this conversationId
          let existingLead = dataStore.leads.find(
            (l: any) => l.notes && l.notes.includes(`[ID Conversa: ${conversationId}]`)
          );

          if (existingLead) {
            existingLead.name = nameVal;
            existingLead.phone = phoneVal;
            if (emailVal) existingLead.email = emailVal;
            if (addressVal) {
              existingLead.address = addressVal;
              existingLead.location = addressVal;
            }
            if (descVal) {
              existingLead.description = descVal;
              existingLead.notes = `${descVal}\n[ID Conversa: ${conversationId}] [Atualizado via Chatbot IA]`;
            }
            leadId = existingLead.id;
            leadSaved = true;
          } else {
            const newLead: Lead = {
              id: `lead-chat-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
              templateId: templateIdToUse,
              templateName,
              name: nameVal,
              phone: phoneVal,
              email: emailVal,
              address: addressVal,
              description: descVal || "Interesse capturado via Chatbot IA",
              location: addressVal,
              createdAt: new Date().toISOString(),
              status: "Novo",
              notes: `${descVal || "Oportunidade capturada na conversa de chatbot"}\n[ID Conversa: ${conversationId}]`,
              metadata: {
                browser: req.headers["user-agent"] || "Chatbot IA Browser",
                referrer: `https://test-sandbox.leadcapture.io/chatbot-${templateIdToUse}`
              },
              notified: false
            };

            dataStore.leads.push(newLead);
            if (template) {
              template.leadsCount += 1;
            }
            leadId = newLead.id;
            leadSaved = true;
          }

          saveDatabase();
        }

        res.json({
          reply: finalReply,
          extractedData: finalExtracted,
          hasCompleteBasicInfo: finalHasComplete,
          leadSaved,
          leadId,
          isAI: true
        });
        return;
      }
    } catch (aiErr) {
      console.error("Gemini API Error, falling back to simulated chatbot:", aiErr);
    }

    // --- ENHANCED LOCAL SIMULATED FALLBACK ---
    // If Gemini is unavailable, we parse details from the text using simple heuristics
    const textLower = message.toLowerCase();
    
    // Attempt local heuristics
    let isNameCandidate = textLower.length > 3 && !textLower.includes("sim") && !textLower.includes("nao") && !textLower.includes("olá") && !textLower.includes("oi") && !textLower.includes("@");
    let phoneMatch = msgContainsPhone(message);
    let emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    let nextExtracted = { ...extractedState };

    if (phoneMatch) {
      nextExtracted.phone = phoneMatch;
    }
    if (emailMatch) {
      nextExtracted.email = emailMatch[0];
    }

    // Try to guess Name
    if (!nextExtracted.name) {
      // If user says "meu nome é Carlos" or "me chamo Carlos"
      const nameIntroMatch = message.match(/(?:meu nome é|me chamo|sou o|sou a)\s+([a-zA-Z\s]{2,30})/i);
      if (nameIntroMatch && nameIntroMatch[1]) {
        nextExtracted.name = nameIntroMatch[1].trim();
      } else if (isNameCandidate && !phoneMatch && !emailMatch && history.length < 3) {
        nextExtracted.name = message.trim();
      }
    }

    // If user provides additional text, treat as description
    if (history.length >= 2 && !phoneMatch && !emailMatch && textLower.length > 15) {
      nextExtracted.description = (nextExtracted.description ? nextExtracted.description + " | " : "") + message.trim();
    }

    let hasComplete = !!(nextExtracted.name && nextExtracted.phone);
    let replyMsg = "";

    // Conversational flow state machine based on what is missing
    if (!nextExtracted.name) {
      replyMsg = `Olá! Sou o assistente inteligente da ${templateName}. Seja muito bem-vindo! Como posso ajudar você hoje? Para começarmos, qual é o seu nome completo?`;
    } else if (!nextExtracted.phone) {
      replyMsg = `Muito prazer, ${nextExtracted.name}! Para podermos te responder rapidamente e enviar um orçamento detalhado, você poderia me informar o seu WhatsApp com DDD?`;
    } else if (!nextExtracted.email) {
      replyMsg = `Obrigado pelo contato! Anotei seu WhatsApp (${nextExtracted.phone}). Se for conveniente, qual é o seu melhor e-mail de contato?`;
    } else if (!nextExtracted.description) {
      replyMsg = `Excelente, ${nextExtracted.name}! Agora, conte-me em poucas palavras qual o serviço ou dúvida que você gostaria de tratar conosco?`;
    } else {
      replyMsg = `Perfeito! Já compilei todas as suas informações com segurança. Um de nossos especialistas da empresa ${templateName} entrará em contato em instantes no WhatsApp ${nextExtracted.phone}!`;
    }

    let leadSaved = false;
    let leadId = "";

    if (hasComplete && !extractedState.phone) {
      // First time we get name AND phone, let's register the lead
      let nameVal = nextExtracted.name || "";
      let phoneVal = nextExtracted.phone || "";
      let emailVal = nextExtracted.email || "";
      let addressVal = nextExtracted.address || "";
      let descVal = nextExtracted.description || "Inscrição rápida simulada no Chatbot";

      // Enforce length limits to satisfy Firestore Rules and prevent errors
      if (nameVal.length > 128) nameVal = nameVal.substring(0, 128);
      if (phoneVal.length > 50) phoneVal = phoneVal.substring(0, 50);
      if (emailVal.length > 120) emailVal = emailVal.substring(0, 120);
      if (addressVal.length > 256) addressVal = addressVal.substring(0, 256);
      if (descVal.length > 1000) descVal = descVal.substring(0, 1000);

      const newLead: Lead = {
        id: `lead-chat-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        templateId: templateIdToUse,
        templateName,
        name: nameVal,
        phone: phoneVal,
        email: emailVal,
        address: addressVal,
        description: descVal,
        location: addressVal,
        createdAt: new Date().toISOString(),
        status: "Novo",
        notes: `${descVal}\n[ID Conversa: ${conversationId}] [Simulador Local]`,
        metadata: {
          browser: req.headers["user-agent"] || "Chatbot Local Simulator",
          referrer: `https://test-sandbox.leadcapture.io/chatbot-chat-${templateIdToUse}`
        },
        notified: false
      };

      dataStore.leads.push(newLead);
      if (template) {
        template.leadsCount += 1;
      }
      leadId = newLead.id;
      leadSaved = true;
      saveDatabase();
    }

    res.json({
      reply: replyMsg,
      extractedData: nextExtracted,
      hasCompleteBasicInfo: hasComplete,
      leadSaved,
      leadId,
      isAI: false
    });
  });

  // Helper utility function for regex telephone candidates
  function msgContainsPhone(txt: string) {
    const numbersMatch = txt.replace(/\D/g, "");
    if (numbersMatch.length >= 8 && numbersMatch.length <= 15) {
      return txt.trim();
    }
    return null;
  }

  // Global Express error handling middleware to ensure unhandled route errors return JSON, not HTML
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error("Global uncaught express error caught on backend:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      success: false
    });
  });

  // Serves compiled React app files (or dynamic development ones via Vite)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to 0.0.0.0 and port 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LeadCapture backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
