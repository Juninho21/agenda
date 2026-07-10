# Documento de Requisitos do Produto (PRD) - Sistema de Gestão de Controle de Pragas.

## 1. Visão Geral do Produto
O objetivo deste projeto é desenvolver uma plataforma robusta e multiplataforma (Web e Mobile) para o gerenciamento Multi Empresas de controle de pragas urbanas (dedetizadoras). O sistema visa digitalizar o fluxo de trabalho operacional, desde o agendamento de visitas até a execução de Ordens de Serviço (OS) e Certificados e Relatórios de Não Conformidade em campo, geração de relatórios e gestão administrativa, cada administrador pode cadastrar sua empresa, seu Responsável técnico com sua assinatura canvas nos relatórios, bem como o cadastro e as assinaturas dos Controladores de pragas, produtos, clientes, com foco em funcionamento offline e sincronização em nuvem.


## 2. Objetivos Principais
*   **Digitalização Completa:** Eliminar o uso de papel para Ordens de Serviço e Certificados.
*   **Mobilidade:** Permitir que técnicos utilizem o sistema em campo via aplicativo móvel (Android/iOS), mesmo sem conexão com a internet.
*   **Gestão Centralizada:** Oferecer um painel administrativo para controle total de clientes, agendamentos, estoque e faturamento.
*   **Confiabilidade:** Garantir sincronização de dados segura entre o dispositivo local e a nuvem.

## 3. Público-Alvo
*   **Super-usuários:** Dono do aplicativo, tem controle total do sistema.
*   **Administradores:** Proprietários e gerentes que precisam de visão macro do negócio, relatórios financeiros e controle de equipes.
*   **Controladores de pragas:** Profissionais que executam os serviços, necessitando de uma interface simples, rápida e que funcione offline.
*   **Clientes:** Acesso a histórico de serviços, Download de relatórios e certificados via portal ou envio automático.

## 4. Escopo Funcional

### 4.1. Módulo Administrativo (Web/Desktop)
*   **Dashboard Intuitivo:** Visão geral de OSs do dia, faturamento mensal, status de atendimentos e alertas de estoque.
*   **Gestão de Clientes:** Cadastro completo (Pessoa Física/Jurídica), histórico de atendimentos e gestão de contratos.
*   **Gestão de Produtos:** Cadastro de insumos, controle de lotes, validade e ficha técnica (FISPQ/Manejo).
*   **Agendamento e Calendário:** Interface de calendário para Administradores e controladores de pragas agendarem os serviços dos clientes.
*   **Relatórios e BI:** Geração de relatórios estatísticos mensais, gráficos do controle de pragas do cliente, uma seção completa juntando todos os dados inseridos pelo controlador de pragas.
*   **Configurações do Sistema:** Parametrização de dados da empresa, logotipos para relatórios, controle de usuários e permissões.

### 4.2. Módulo Operacional (App Mobile/Campo)
*   **Minha Agenda:** Visualização das OSs atribuídas ao técnico para o dia.
*   **Execução de Serviços (Fluxo de OS):**
    *   Check-in/Check-out (registro de tempo).
    *   Checklist de atividades (inspeção, identificação de pragas, aplicação).
    *   Registro de produtos utilizados, ou seja, a quantidade que o controlador de pragas usou para realizar o serviço.
    *   Evidências fotográficas, gera um relatório de Não conformidade que é enviada ao cliente juntamente com o relatório de serviços.
    *   Mapeamento de Dispositivos: Porta Isca, Placa Adesiva, Armadilha Mecânica, Armadilha Luminosa, Armadilha Biológica, Armadilha de Feromônio (cada dispositivo tem opções de status especificas),
 Status de Porta Isca: Conforme, Mofada, Consumida, Deteriorada, Dispositivo Obstruído, Dispositivo Danificado, Sem Dispositivo, Praga Encontrada, Novo Dispositivo.
 Status de Placa Adesiva: Conforme, Refil Substituído, Dispositivo Obstruído, Dispositivo Danificado, Sem Dispositivo, Praga Encontrada, Novo Dispositivo.
 Status de Armadilha Mecânica: Conforme, Desarmada, Dispositivo Obstruído, Dispositivo Danificado, Sem Dispositivo, Praga Encontrada, Novo Dispositivo.
 Status de Armadilha Luminosa: Conforme, Refil Substituído, Desligada, Lâmpada Queimada, Dispositivo Obstruído, Dispositivo Danificado, Sem Dispositivo, Praga Encontrada, Novo Dispositivo.
 Status de Armadilha Biológica: Conforme, Atrativo Biológico Substituído, Dispositivo Obstruído, Dispositivo Danificado, Sem Dispositivo, Praga Encontrada, Novo Dispositivo.
 Status de Armadilha de Feromônio: Conforme, Refil Substituído, Dispositivo Obstruído, Dispositivo Danificado, Sem Dispositivo, Praga Encontrada, Novo Dispositivo.
*   **Assinatura Digital:** Coleta de assinatura do cliente na tela do dispositivo (canvas).
*   **Modo Offline:** Capacidade completa de criar e editar OSs sem internet, com fila de sincronização automática.
*   **Impressão/Envio:** Geração automática do Relatório de Execução de Serviço e Certificado de Execução de Serviço (PDF) e envio por WhatsApp/E-mail.

### 4.3. Módulo Financeiro & Assinaturas
*   **Planos de Assinatura (SaaS):** Integração com Stripe para gestão de assinaturas do próprio software (Básico, Pro, Enterprise).
*   **Billing:** Geração de links de pagamento para cobrança de clientes finais.

## 5. Requisitos Não Funcionais
*   **Compatibilidade:** Web (Navegadores modernos, totalmente responsivo), Android (via Capacitor) e iOS.
*   **Performance:** Carregamento inicial rápido e transições fluídas no app móvel.
*   **Segurança:** Autenticação robusta, criptografia de dados sensíveis e regras de acesso (RAG) no banco de dados.
*   **Escalabilidade:** Arquitetura preparada para suportar múltiplas empresas (Multi-tenant).

## 6. Arquitetura e Stack Tecnológico Sugerido

### Frontend
*   **Framework:** React 18+ com TypeScript.
*   **Build Tool:** Vite (para performance de desenvolvimento).
*   **UI Library:** TailwindCSS (estilização) + Shadcn/UI ou Radix UI (componentes acessíveis).
*   **Ícones:** Lucide React.
*   **Gerenciamento de Estado:** React Query (TanStack Query) para server state + Zustand para client state.

### Mobile
*   **Framework Híbrido:** Capacitor 6+ (mantendo a base de código web).
*   **Plugins Essenciais:** Camera, Filesystem, Geolocation, Share, Network Status.

### Backend & BaaS (Backend as a Service)

*    **Supabase**.
    *   Banco: Supabase.
    *   Auth: Supabase Auth.
    *   Functions: Serverless para lógicas complexas.

### Ferramentas Auxiliares
*   **Geração de PDF:** `pdf-lib` ou `react-pdf` ou ferramenta atualizada superior.
*   **Datas:** `date-fns` ou ferramenta atualizada superior.
*   **Validação:** `Zod` ou ferramenta atualizada superior.
*   **Formulários:** `React Hook Form` ou ferramenta atualizada superior.

## 7. Estrutura de Dados (Entidades Principais)
*   `Users`: Perfis de acesso (Super Usuário, Admin, Controlador de pragas, Cliente).
*   `Clients`: Dados cadastrais e endereços.
*   `ServiceOrders`: Cabeçalho da OS (Data, Status, Cliente).
*   `ServiceOrderItems`: Detalhes (Pragas alvo, Locais tratados).
*   `ProductUsage`: Relacionamento N:N entre OS e Produtos (consumo) cada controlador de pragas tem seu inventário de produtos.
*   `Devices`: Armadilhas/Dispositivos monitorados.
*   `DeviceInspections`: Histórico de monitoramento de cada dispositivo.

## 8. Roadmap de Implementação
1.  **Fase 1 (MVP):** Autenticação, CRUD de Clientes/Produtos, Criação de OS (comprovante de execução de serviços), PDF.
2.  **Fase 2 (Mobile):** Integração Capacitor, Modo Offline, Câmera e Assinatura.
3.  **Fase 3 (Gestão):** Dashboard, Relatórios Avançados, Controle de Estoque automático.
4.  **Fase 4 (SaaS):** Integração com Stripe e Isolamento de dados por Tenant (Empresa - Administradores - Controladores de pragas - Clientes).
