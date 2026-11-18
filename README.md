# cipher-grid

Aplicação web multiplayer em tempo real para rede local (LAN) com mecânica de associação de palavras em grade tática 5x5.

- **Título padrão de exibição:** `"Código Secreto do Passeio dos Cria"` (configurável em 1 linha em `shared/branding.ts`).
- **Stack:** 100% TypeScript, Node.js, Express, Socket.io, React, Vite e Tailwind CSS.

## Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Modo Desenvolvimento (LAN)
Inicia simultaneamente o servidor WebSocket (`0.0.0.0:3000`) e o cliente Vite (`--host` em `5173`) com detecção automática do IP local da máquina:
```bash
npm run dev
```

### 3. Modo Produção LAN (Porta Única 3000)
Compila o frontend para `dist/` e serve tanto os arquivos estáticos quanto o servidor WebSocket na porta `3000` (`0.0.0.0:3000`):
```bash
npm run build
npm start
```

