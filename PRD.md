# Documento de Requisitos de Produto (PRD) - Plataforma SaaS de Captura e Distribuição de Leads

Este documento fornece as especificações, arquitetura técnica e o escopo funcional completo do sistema SaaS de Captura e Distribuição de Leads em tempo real. Ele detalha a arquitetura fiduciária de dados, as personas de usuário, as páginas/visualizações, o funcionamento de cada módulo integrado, segurança, autenticação e conformidade com a LGPD.

---

## 1. Visão Geral do Produto
O software é um ecossistema full-stack projetado para centralizar a atração de potenciais clientes através de canais customizáveis, processar e organizar esses contatos em tempo real, e distribuí-los automaticamente para uma rede de profissionais de saúde, serviços ou consultoria cadastrados.

O sistema opera sob duas frentes de controle principais em uma interface SPA (Single Page Application) responsiva:
1. **Painel do Administrador (SaaS Admin)**: Visão macro com controle de formulários de captura, monitoramento geral de leads (Kanban, Listas e Gráficos), encaminhamento manual/automático, gestão de profissionais parceiros, e estatísticas financeiras gerais.
2. **Portal do Profissional Parceiro**: Uma experiência de uso otimizada com foco em dispositivos móveis, onde os profissionais recebem alertas sonoros de novas oportunidades exclusivas recebidas, realizam o autoatendimento e mantêm dados financeiros consolidados de fecho/conversão de negócios.

---

## 2. Personas e Fluxos de Usuário

### A. Administrador (Master Dashboard)
* **Objetivo principal**: Configurar os canais de captura (templates), visualizar o desempenho de marketing e garantir que cada oportunidade receba suporte profissional ágil.
* **Ações principais**:
  * Gerenciar as regras de distribuição e tempos de expiração.
  * Criar, editar e excluir templates/modelos de coleta de dados.
  * Criar, editar, monitorar e remover profissionais credenciados da rede.
  * Monitorar as estatísticas financeiras gerais e o faturamento do ecossistema.
  * Encaminhar e revogar leads manualmente se necessário.
  * Realizar operações em lote (exclusão e triagem múltipla).

### B. Profissional Parceiro (Portal Dedicado)
* **Objetivo principal**: Atender leads qualificados recebidos na sua área de atuação o mais rápido possível para otimizar as taxas de conversão.
* **Ações principais**:
  * Receber notificações imediatas e alertas sonoros quando uma nova oportunidade correspondente é gerada.
  * Aceitar o lead e mudar o progresso para "Em Atendimento" ou concluí-lo como convertido.
  * Lançar taxas de lucro/honorários gerados pelo fechamento de contratos para consolidação de estatísticas.
  * Modificar informações de contato profissional e senha de acesso.

---

## 3. Funcionalidades Detalhadas por Módulo

### 1. Sistema de Captura Dinâmica (Web-Forms & Widgets)
* **Estrutura de Modelos (Templates)**: O administrador cria canais que têm parâmetros como link direto, nome do canal, especialidade técnica exigida, valor estimado e perguntas customizadas.
* **Simulação Interativa**: Uma área de testes que renderiza o formulário exatamente como o usuário final o visualizaria, permitindo simular a entrada e inserção de dados que alimentam a fila principal de imediato (com persistência em Firestore).

### 2. Quadro de Controle Principal (Kanban & Gestão de Funil)
* **Painel de Colunas Dinâmicas**: Permite visualizar de forma clara o status de conversão de cada oportunidade:
  * **Novo**: Leads que se cadastraram recentemente e ainda não foram atribuídos ou encaminhados.
  * **Encaminhado**: Leads cujo token de redirecionamento ou link único de resposta foi enviado ou distribuído para um profissional selecionado pela rede, restando aguardar confirmação sob prazo limite de expiração.
  * **Em Atendimento**: Leads aceitos que estão sob coordenação direta e comunicação ativa do profissional parceiro.
  * **Concluído**: Clientes já assessorados com sucesso.
  * **Recusado**: Casos onde houve declínio do profissional ou expiração de tempo.
* **Mecanismo Drag-and-Drop / Modificação Rápida**: Atualização instantânea da base de dados e emissão de avisos em tempo real ao alterar o progresso.

### 3. Central de Leads & Edição em Massa (Tabelas Centralizadas)
* **Filtragem de Alta Precisão**: Filtros inteligentes por período, canal de origem, termo de texto, status do funil ou responsável técnico atribuído.
* **Seleção Unificada e Ações em Lote (Batch Actions)**:
  * Checkboxes integradas que dão controle individual ou geral de registros visíveis.
  * Barra de tarefas suspensa com contador dinâmico e botões de comando.
  * **Exclusão em Lote**: Permite limpar toda a base de lixo ou duplicadas com apenas um clique, com solicitação de confirmação segura antes de persistir a limpeza definitiva em banco de dados.

### 4. Sistema Seguro de Confirmação Integrado (Iframe Friendly)
* Visando a eliminação de travamentos em browsers e as restrições que ocorrem no carregamento dentro de sandboxes e Iframes, a aplicação implementa um padrão nativo de pop-up customizado animado em camadas superiores (`z-[100]`), substituindo as funções nativas e limitantes `window.confirm`.

### 5. Portal do Profissional Responsivo e Adaptativo (Mobile-First)
* Menu de abas simplificado, compacto e limpo para evitar cortes de tela em smartphones.
* **Grelha de Oportunidades Flexível**: No celular, a tabela e o painel de detalhes do lead dividem-se em fluxos contínuos. Clicar em um lead esconde a lista e foca inteiramente no detalhamento com botão claro de retrocesso (Voltar do Lead/Detail), preservando o contexto espacial do profissional que trabalha na rua.
* **Atendimento Ágil**: Botões com integrações profundas de mensagens para WhatsApp preenchidos automaticamente com o nome do cliente e informações do serviço solicitado.

---

## 4. Segurança, Autenticação e Controle de Acesso

O sistema implementa regras estritas de segurança para impedir o vazamento ou furto de informações comerciais e dados pessoais sensíveis:

1. **Autenticação de Profissionais**: baseada em credenciais cadastradas (Username/Senha únicos). O login gera uma sessão segura ou retorna dados validados persistidos que segregam as oportunidades por especialidade (`templateId`), de modo que um parceiro **nunca** tenha acesso direto à base geral de leads de outros setores.
2. **Distribuição via Tokens Temporários**: A distribuição dinâmica com links externos de aceite ou recusa opera usando UUIDs de uso e validação unívocos gerados no servidor (`/api/public/forward/:token`). Um token é expirante e assinado digitalmente, impedindo a manipulação e engenharia reversa por agentes externos.
3. **Barreiras de Role-Based Check (Administrador/User)**: Os endpoints de administração do sistema (criação de templates, faturamento macro de parceiros, reset do banco de dados e remoção em lote) exigem tokens ou sessões de nível de privilégio superior (`admin`). Em ambiente de produção real, qualquer requisição para `/api/leads/batch-delete` ou `/api/professionals` sem cabeçalhos de autorização legítimos recebe bloqueio imediato por middleware HTTP (`401 Unauthorized` / `403 Forbidden`).

---

## 5. Estrutura Completa de Rotas e Endpoints da API

Abaixo estão detalhadas todas as rotas de comunicação integradas do back-end (`server.ts`) para suporte absoluto da persistência e interatividade da plataforma:

### A. Controle e Operação de Leads
* **GET `/api/leads`**
  * *Uso*: Recupera a lista completa de leads cadastrados na nuvem para renderização no dashboard do administrador.
* **POST `/api/leads`**
  * *Uso*: Cria um novo lead na base de dados. Utilizado por formulários públicos integrados, simulador de leads e widgets externos.
* **PUT `/api/leads/:id`**
  * *Uso*: Altera o status, anotações, histórico ou dados do lead selecionado especificamente.
* **DELETE `/api/leads/:id`**
  * *Uso*: Exclui de forma singular e definitiva um lead cadastrado do ecossistema.
* **POST `/api/leads/batch-delete`**
  * *Uso*: Purga em bloco múltiplos leads cujos IDs foram marcados via checkboxes. Evita a sobrecarga de requisições individuais.
* **POST `/api/leads/:id/forward`**
  * *Uso*: Vincula e encaminha manualmente um lead a um profissional parceiro, criando o status `Encaminhado` com token seguro temporário.
* **POST `/api/leads/:id/acknowledge-acceptance`**
  * *Uso*: Registra o ciente de recebimento e visualização do profissional.

### B. Gestão de Parceiros Técnicos (Profissionais)
* **GET `/api/professionals`**
  * *Uso*: Retorna lista completa de parceiros e respectivas frentes de especialização.
* **POST `/api/professionals`**
  * *Uso*: Cadastra um novo profissional de serviço com senha criptografada de autoatendimento.
* **PUT `/api/professionals/:id`**
  * *Uso*: Atualiza informações cadastrais de um determinado profissional.
* **DELETE `/api/professionals/:id`**
  * *Uso*: Remove um profissional e expurga seus históricos financeiros associados.
* **POST `/api/public/professional/login`**
  * *Uso*: Realiza a autenticação segura do profissional para concessão de acesso ao Portal do Parceiro.

### C. Mapeamento de Oportunidades Públicas via Tokens
* **GET `/api/public/forward/:token`**
  * *Uso*: Valida e exibe a oportunidade associada ao link seguro temporário recebido via notificação externa.
* **POST `/api/public/forward/:token/auth`**
  * *Uso*: Autentica o recebimento de oportunidades individuais.
* **POST `/api/public/forward/:token/accept`**
  * *Uso*: Transforma o lead em status "Em Atendimento", atribuindo permanentemente a responsabilidade pelo cliente ao profissional portador do link.
* **POST `/api/public/forward/:token/recuse`**
  * *Uso*: Altera o status do lead para "Recusado", permitindo a realocação na base para novos parceiros ou retorno à fila pública.

### D. Controle Financeiro (Honorários & Lucro de Conversão)
* **POST `/api/professionals/:id/profit`**
  * *Uso*: Lança um novo registro financeiro de lucro derivado de uma venda ou de fechamento de contrato de assessoria por parte do profissional.
* **GET `/api/whatsapp-templates`**
  * *Uso*: Recupera os scripts de atendimento rápido disponíveis.
* **POST `/api/whatsapp-templates`** | **PUT `/api/whatsapp-templates/:id`** | **DELETE `/api/whatsapp-templates/:id`**
  * *Uso*: Módulos de manutenção de mensagens pré-formuladas de abordagem por parte do administrador.

### E. Utilidades e Automações Auxiliares
* **POST `/api/reset`**
  * *Uso*: Redefine a base do SaaS para a simulação inicial de demonstração comercial de fábrica.
* **POST `/api/chatbot/chat`**
  * *Uso*: Envia e recebe interações no chatbot de suporte ao cliente com inteligência artificial embarcada por IA Generativa.
* **GET `/api/alerts/config`** | **POST `/api/alerts/config`**
  * *Uso*: Coleta e define limites de alerta por tempo médio de ociosidade de um lead na fila sem encaminhamento atribuído.

---

## 6. Conformidade Legal e LGPD (Lei Geral de Proteção de Dados)

Por lidar ativamente com dados pessoais identificáveis (PII) de clientes finais (Nome, E-mail, Telefone de contato e localização), o ecossistema foi projetado sob os requisitos legais de proteção de dados:

1. **Consentimento Explícito (Opt-in)**: Todos os templates dinâmicos de captura integrados e o simulador contêm obrigatoriamente um aviso legal e checkbox de livre manifestação onde o prospecto autoriza expressamente a coleta, transferência e o tratamento de seus dados pessoais para fins de recebimento de propostas de profissionais e contato comercial.
2. **Minimização de Dados**: Coleta-se estritamente o necessário para operacionalizar o atendimento (Nome, Meio de Contato e Localização). Campos de preenchimento desnecessários ou intrusivos são evitados.
3. **Direito à Exclusão (Direito ao Esquecimento)**: A qualquer momento o titular pode solicitar a remoção permanente de seus registros. Os administradores contam com as ferramentas integradas de eliminação única e eliminação em bloco (Batch Delete) que fazem o expurgo completo e irreversível dos dados no banco de dados Firestore.
4. **Criptografia e Tráfego Seguro**: Toda a troca de pacotes de dados de clientes, transações financeiras e logs de login opera exclusivamente sob conexões criptografadas usando protocolo HTTPS/TLS, prevenindo interceptação maliciosa (Sniffing) de contatos comerciais.
5. **Prevenção contra Vazamentos**: O Portal do Profissional limita as informações exibidas de leads não aceitos. O número de contato do cliente e detalhes de notas privadas só são liberados de forma visível na UI após o profissional realizar o aceite explícito daquela oportunidade.

---

## 7. Teoria dos Dados (Interfaces de Sistema)

### Lead Layout Schema
```ts
interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  notes: string;
  templateId: string;
  templateName: string;
  status: "Novo" | "Encaminhado" | "Em Atendimento" | "Concluído" | "Recusado";
  createdAt: string;
  assignedProfessionalId?: string;
  forwardToken?: string;
  forwardExpiresAt?: string;
  acceptedAt?: string;
  estimatedValue?: number;
}
```

### Professional Layout Schema
```ts
interface Professional {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  photoUrl: string;
  templateId: string; // Vínculo ao template correspondente de distribuição
  username?: string;
  password?: string;
  profitRecords?: Array<{
    id: string;
    description: string;
    value: number;
    createdAt: string;
  }>;
}
```

---

## 8. Layout, Design e Coesão Visual
* **Esquema de Cores**: Slate/Cosmic Theme. Mesclas de tons azuis de altíssima profundidade (`#070920`, `#0c0f2a`) combinadas a contornos sutis de divisórias violetas e gradientes focados em conversão e usabilidade.
* **Responsividade Estrita**: Prazos de transição curtos através de animações do `@motion` e flexibilização de visualização usando técnicas de visibilidade condicional Tailwind, suportando desde telas de alta definição a smartphones compactos.

---

## 9. Diretrizes de Interface (UI Guidelines)

Para assegurar consistência estética e evitar regressões no visual fiduciário de alta densidade da plataforma, as seguintes diretrizes devem ser estritamente seguidas:

### A. Paleta de Cores Semântica (Centralizada em `@theme`)
Não declare códigos hexadecimais arbitrários nos arquivos de componentes. Prefira sempre as classes utilitárias semânticas mapeadas no CSS global:
* **`bg-brand-primary`** (`#4F46E5`): Utilizado para botões e gatilhos de ação principal.
* **`bg-brand-secondary`** (`#0EA5E9`): Para secundários e ações alternativas que exijam menos destaque.
* **`bg-brand-success`** (`#10B981`): Estados confirmados, alertas positivos, status "Concluído" de leads.
* **`bg-brand-warning`** (`#F59E0B`): Prazos expirantes, status "Em Atendimento" ou alertas de inatividade.
* **`bg-brand-danger`** (`#EF4444`): Exclusão de dados, erros de validação e status "Recusado".
* **`bg-brand-bg`** (`#070920`): Fundo primário do painel administrativo.
* **`bg-whatsapp`** (`#128C7E`): Linha WhatsApp e integrações diretas.

### B. Componentes Globais Atômicos (Reutilizáveis)
Sempre importe os seguintes elementos criados em `/src/components/` para novos fluxos:
1. **Botões (`Button.tsx`)**: Recebe a propriedade `variant` (`primary`, `secondary`, `success`, `warning`, `danger`, `outline`, `ghost`, `whatsapp`) e `size` (`sm`, `md`, `lg`). Utiliza o padrão `cursor-pointer`, transição suave de escala de 98% e desativação condicional opaca.
2. **Campos de Entrada (`Input.tsx`)**: Padroniza as margens internas, cores de borda neutras e contrastes do modo escuro. Suporta as propriedades de `label`, `error` com suporte visual inline e `icon`.
3. **Áreas de Texto Inteligentes (`TextArea.tsx`)**: Integrado com detecção de redimensionamento dinâmico inteligente (`autoResize=true`). Ajusta a altura com base no volume de entrada do usuário de forma automática, eliminando barras de rolagem desnecessárias.
4. **Contêineres de Layout (`Card.tsx`)**: Wrapper padrão com cantos arredondados suavizados (`rounded-xl`), bordas finas com sombras discretas para organizar relatórios, kanban e cadastros de maneira consistente.

### C. Integração Segura de Gráficos (Eliminação de Alertas)
Para evitar que o motor do `Recharts` emita avisos críticos sobre largura/altura inválidas (`width(-1)` e `height(-1)`) no console do navegador, siga as regras de invólucro:
* **Uso Obrigatório do `ChartContainer`**: Todos os seletores de gráficos e áreas de plotagem responsivas devem ser agrupados por uma tag `<ChartContainer height={x}>`.
* **Mecanismo de Resiliência**: O container gerencia um gancho `ResizeObserver` ativo e um barramento `mounted` do lado do cliente que atrasa a injeção do canvas até que o espaço de geometria de pixels esteja totalmente desenhado e disponível na página.

### D. Regras de Clean Code & Visual Fiduciário
* **Sem Lixo Técnico**: Nunca introduza termos promocionais automáticos, créditos desnecessários de infraestrutura (como o número da porta `PORT: 3000`) ou carimbos redundantes nos rodapés.
* **Sons e Animações**: Use feedbacks curtos e controlados do `@motion` para transições de tela e caixas flutuantes, respeitando preferências de acessibilidade e tempos curtos.

