# Invest P/ Futuro

# PRD – App de Organização de Finanças com Conversa Natural

Aplicativo de organização de finanças pessoais desenvolvido para permitir que o usuário controle sua vida financeira por meio de **conversas naturais**, combinando Inteligência Artificial, ferramentas de projeção financeira, dados de mercado e visualizações simples.

O projeto busca tornar o controle financeiro mais acessível, educativo e motivador, conectando pequenas decisões financeiras do dia a dia com objetivos de longo prazo.

---

## 1. Contexto

Criar um aplicativo de organização de finanças pessoais que funcione por meio de conversas naturais com o usuário e ofereça ferramentas visuais de projeção patrimonial.

O objetivo é simplificar o controle financeiro do dia a dia e desmistificar conceitos de investimentos de curto e longo prazo.

---

## 2. Problema

A maioria dos aplicativos de finanças exige muita entrada manual, oferece pouca personalização e aborda temas como juros compostos de forma puramente matemática e abstrata.

Isso leva muitos usuários a desistirem do controle financeiro por não enxergarem o impacto do acúmulo de riqueza no longo prazo.

O desafio é oferecer uma experiência fluida, personalizada, motivadora e educativa, conectando o hábito diário de economizar com grandes metas de vida.

---

## 3. Público-Alvo

* Pessoas que desejam iniciar o controle financeiro de forma prática e acessível.

* Usuários iniciantes que não têm familiaridade com planilhas ou aplicativos tradicionais. Usuários avançados podem baixar os dados em `.csv` e utilizá-los em outros softwares.

* Pessoas que buscam dicas simples de economia ou que estão iniciando no mundo das finanças.

* Usuários motivados a planejar sua independência financeira e alcançar grandes objetivos, como o primeiro milhão.

---

## 4. Funcionalidades-Chave

1. Registro de gastos via chat em linguagem natural.

2. Classificação automática de transações.

3. Definição e acompanhamento de metas financeiras.

4. Agente Financeiro com dicas de economia e educação financeira.

5. Cotação diária do Dólar, Bitcoin e SELIC.

6. Relatórios simples e personalizados.

7. Calculadora interativa de juros compostos com explicações de conceitos avançados, como efeito bola de neve e impacto do tempo e da taxa.

8. Simulador do Primeiro Milhão com projeções personalizadas de tempo e aportes.

9. Página de Dicas com informações financeiras e indicadores de mercado atualizados automaticamente.

10. Design moderno com Dark Mode.

---

## 5. Inteligência Artificial

A Inteligência Artificial possui duas funções distintas no projeto: **auxílio durante o desenvolvimento** e **processamento das conversas dentro da aplicação**.

### IA utilizada no desenvolvimento

O desenvolvimento e aprimoramento do projeto foram realizados localmente no VS Code com auxílio de diferentes modelos de Inteligência Artificial:

* **Qwen 3.8 Max**
* **GLM 5.3 Free**
* **MiniMax M3**
* **Anthropic Claude Haiku 4.5**

Esses modelos foram utilizados como ferramentas de apoio para desenvolvimento, análise, correção, refatoração e evolução do código.

### IA utilizada na aplicação

O chat de linguagem natural utiliza a **Groq API** para realizar o processamento das conversas.

O modelo utilizado atualmente é:

* **OpenAI GPT-OSS-120B**

A comunicação com a Groq é realizada diretamente por meio de requisições HTTP para o endpoint compatível com a API da OpenAI.

A aplicação utiliza **JSON Schema** para estruturar as respostas do agente financeiro, permitindo que os dados retornados pela IA sejam processados de maneira previsível pela aplicação.

### Fluxo da IA

```text
Usuário
   ↓
Interface da aplicação
   ↓
Agente Financeiro
   ↓
Servidor
   ↓
Groq API
   ↓
OpenAI GPT-OSS-120B
   ↓
Resposta estruturada em JSON
   ↓
Aplicação
   ↓
Usuário
```

---

## 6. APIs e Dados de Mercado

A página **Dicas** utiliza APIs externas para obter informações financeiras e indicadores de mercado.

Os dados são consultados através da função `getMarketRates()`, que centraliza as consultas às fontes externas e permite que a aplicação apresente as informações de mercado de forma integrada.

### Fontes de dados

#### HG Brasil Finance

API utilizada para obtenção do **CDI** e como fonte de fallback para o preço do **Bitcoin**.

Endpoint:

```text
https://api.hgbrasil.com/finance
```

Implementação:

```text
market.functions.ts
```

#### CoinGecko

API utilizada para obter o preço do **Bitcoin em USD e BRL**, além da sua **variação nas últimas 24 horas**.

Endpoint utilizado para consulta de preços do Bitcoin.

Implementação:

```text
market.functions.ts
```

#### Banco Central do Brasil — BCB SGS

O sistema utiliza dados do **Banco Central do Brasil**, através do SGS (Sistema Gerenciador de Séries Temporais).

As séries utilizadas são:

* **Série 1** — Dólar.
* **Série 432** — Selic.

Implementação:

```text
market.functions.ts
```

### Atualização dos dados

A página **Dicas** consulta os indicadores através de `getMarketRates()` e realiza uma **atualização automática a cada 5 minutos**.

Fluxo simplificado:

```text
Página Dicas
     ↓
getMarketRates()
     ↓
┌─────────────────────────────┐
│ HG Brasil Finance           │
│ CoinGecko                   │
│ Banco Central do Brasil    │
└──────────────┬──────────────┘
               ↓
        Dados de mercado
               ↓
          Página Dicas
```

### Indicadores utilizados

| Indicador | Fonte                         | Utilização              |
| --------- | ----------------------------- | ----------------------- |
| CDI       | HG Brasil Finance             | Informações financeiras |
| Bitcoin   | HG Brasil Finance / CoinGecko | Preço e variação        |
| Dólar     | Banco Central do Brasil — SGS | Cotação                 |
| Selic     | Banco Central do Brasil — SGS | Indicador de juros      |

> **Observação:** os dados apresentados pela aplicação dependem da disponibilidade e das condições de funcionamento das APIs externas utilizadas como fontes.

---

## 7. Tecnologias

### Frontend

* **React 19** — construção da interface da aplicação.
* **TypeScript 5** — desenvolvimento com tipagem estática.
* **TanStack Start** — framework utilizado na aplicação React.
* **TanStack Router** — gerenciamento de rotas.
* **TanStack React Query** — gerenciamento de dados e requisições.
* **Vite** — desenvolvimento e processo de build.
* **Tailwind CSS 4** — estilização da interface.
* **Radix UI** — componentes de interface acessíveis.
* **Lucide React** — biblioteca de ícones.
* **Recharts** — criação de gráficos e visualizações.
* **Motion** — animações e transições da interface.

### Formulários e validação

* **React Hook Form** — gerenciamento de formulários.
* **Zod** — validação e definição de schemas.

### Inteligência Artificial

* **Groq API** — processamento das conversas de linguagem natural.
* **OpenAI GPT-OSS-120B** — modelo de linguagem utilizado pelo agente financeiro.
* **JSON Schema** — estruturação das respostas da Inteligência Artificial.

### Dados de mercado

* **HG Brasil Finance** — CDI e fallback do Bitcoin.
* **CoinGecko** — preço e variação do Bitcoin.
* **Banco Central do Brasil — BCB SGS** — Dólar e Selic.

### Ferramentas de desenvolvimento

* **Node.js**
* **npm**
* **ESLint**
* **Prettier**
* **TypeScript**

---

## 8. Entregável da IA

Plano de MVP contendo:

* Principais telas:

  * Conversa
  * Metas
  * Relatórios
  * Dicas
  * Calculadora de Juros
  * Calculadora do Primeiro Milhão

* Recursos mínimos necessários para funcionamento inicial.

* Estratégia de validação com usuários por meio de testes rápidos e coleta de feedback.

* Linguagem acessível e educativa em português.

---

## 9. Desenvolvimento

Este projeto foi inicialmente criado utilizando o **Lovable** e posteriormente desenvolvido e aprimorado localmente no **VS Code**, com auxílio de diferentes ferramentas de Inteligência Artificial.

O código presente neste repositório representa a versão atual do projeto.

---

## 10. Pré-requisitos

Para executar o projeto localmente, é necessário ter instalado:

* **Node.js**
* **npm**
* Uma **chave de API da Groq**

---

## 11. Instalação

Clone o repositório:

```bash
git clone <URL-DO-SEU-REPOSITÓRIO>
```

Entre na pasta do projeto:

```bash
cd <NOME-DO-REPOSITÓRIO>
```

Instale as dependências:

```bash
npm install
```

---

## 12. Configuração da API

A aplicação utiliza uma variável de ambiente para armazenar a chave da Groq.

Crie um arquivo chamado:

```text
.env
```

e adicione:

```env
GROQ_API_KEY="SUA_CHAVE_API_DA_GROQ"
```

### Importante

O arquivo `.env` contém informações privadas e **não deve ser enviado para o GitHub**.

Para facilitar a configuração de outros ambientes, utilize o arquivo:

```text
.env.example
```

com o seguinte conteúdo:

```env
GROQ_API_KEY="COLOQUE_SUA_CHAVE_API_AQUI"
```

O `.env.example` pode ser versionado no GitHub, enquanto o `.env` deve permanecer local.

O projeto utiliza:

```typescript
process.env["GROQ_API_KEY"]
```

para acessar a chave no ambiente de execução do servidor.

---

## 13. Ambiente de Desenvolvimento

Execute o projeto em modo de desenvolvimento:

```bash
npm run dev
```

Após iniciar o servidor, o endereço da aplicação será exibido no terminal.

---

## 14. Build de Produção

Para gerar a versão de produção:

```bash
npm run build
```

Para visualizar a build localmente:

```bash
npm run preview
```

---

## 15. Qualidade e Formatação do Código

### ESLint

Para verificar possíveis problemas no código:

```bash
npm run lint
```

### Prettier

Para formatar os arquivos do projeto:

```bash
npm run format
```

---

## 16. Estrutura do Projeto

A aplicação utiliza uma arquitetura baseada principalmente em **React + TypeScript**.

O projeto contém diferentes tipos de arquivos, incluindo:

* `.tsx` — componentes e interfaces React.
* `.ts` — lógica e módulos TypeScript.
* `.js` — scripts JavaScript.
* `.json` — configurações e dados.
* `.html` — estrutura HTML.
* `.css` — estilos da aplicação.

A estrutura interna pode evoluir conforme novas funcionalidades forem adicionadas.

---

## 17. Segurança

A chave utilizada para acesso à Groq API deve ser mantida como uma variável de ambiente.

O projeto não deve armazenar chaves de API diretamente no código-fonte.

O arquivo `.env` está configurado no `.gitignore` para evitar seu versionamento.

O arquivo `.env.example` pode ser utilizado como modelo para configuração do ambiente.

### Exemplo

```text
.env
   ↓
Chave real da Groq
   ↓
NÃO enviar para o GitHub

.env.example
   ↓
Apenas variável de exemplo
   ↓
Pode ser enviado para o GitHub
```

Antes de realizar o primeiro `git push`, verifique se o arquivo `.env` não está sendo incluído nos arquivos que serão enviados.

---

## 18. Objetivo do Projeto

O objetivo é transformar o controle financeiro em uma experiência simples e conversacional.

Em vez de exigir que o usuário compreenda termos financeiros ou preencha diversos formulários, a aplicação busca permitir uma interação mais próxima de uma conversa cotidiana.

A proposta é utilizar Inteligência Artificial para facilitar o registro e a compreensão das informações financeiras, enquanto ferramentas visuais e dados de mercado ajudam o usuário a enxergar o impacto de suas decisões ao longo do tempo.

---

## 19. Status do Projeto

🚧 **Em desenvolvimento**

O projeto encontra-se em fase de desenvolvimento e evolução contínua.

Novas funcionalidades, melhorias de interface, integrações e recursos de Inteligência Artificial poderão ser adicionados ao longo do desenvolvimento.

---

## 20. Origem do Projeto

O projeto teve sua primeira versão desenvolvida utilizando o **Lovable**.

Posteriormente, o código foi levado para um ambiente local no **VS Code**, onde passou por desenvolvimento, modificações, correções e expansão utilizando diferentes ferramentas de Inteligência Artificial.

O repositório atual representa a evolução desse processo de desenvolvimento.

---

## 21. Licença

Este projeto ainda não possui uma licença definida.

A licença poderá ser adicionada posteriormente de acordo com a estratégia de distribuição e utilização do projeto.
