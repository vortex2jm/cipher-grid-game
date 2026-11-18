# Cipher Grid Game (`cipher-grid`)

Aplicação web multiplayer em tempo real para rede local (LAN) de dedução e associação de palavras em uma grade tática **5×5**.

---

## Funcionalidades

- **Multiplayer em tempo real (LAN):** Comunicação via WebSocket (`Socket.io`) com detecção automática do IP local da máquina para jogar pelo celular ou navegador na mesma rede Wi-Fi.
- **Convite rápido com QR Code:** Modal de compartilhamento com link direto da sala e QR Code gerado localmente.
- **Gestão de Sala e Equipes:** Criação de salas com código de 4 caracteres, troca de time, sorteio/balanceamento automático de equipes pelo Host e rotação de capitães entre partidas.
- **Papéis claros na partida:** Distinção visual entre **Capitão de Inteligência**, **Porta-voz de Campo** e **Agente Operacional**.
- **Grade 5×5 responsiva:** Interface adaptada para desktop e celular, histórico de jogadas em tempo real e banco de palavras em português sem repetição entre partidas consecutivas.
- **Branding configurável:** Nome do jogo, subtítulo, times e papéis centralizados em [shared/branding.ts](file:///home/joao/projects/personal/cipher-grid/shared/branding.ts).

---

## Como Jogar

### Preparação
1. São necessários **pelo menos 4 jogadores** (mínimo de **2 no Esquadrão Azul** e **2 no Esquadrão Vermelho**).
2. O Host cria a sala, compartilha o código ou o **QR Code** com o grupo e inicia a partida (podendo usar o sorteio automático para equilibrar os times).
3. O sistema sorteia **25 palavras** no tabuleiro **5×5**:
   - **9 cartas** do time que começa a partida;
   - **8 cartas** do segundo time;
   - **7 cartas neutras**;
   - **1 carta Assassino** (preta).

### Papéis de Cada Jogador
- **Capitão de Inteligência (1 por time):** É o único do time que enxerga o mapa colorido com as posições reais de todas as cartas. Sua função é dar pistas para o time encontrar as cartas da sua cor sem acertar as dos adversários nem o Assassino.
- **Porta-voz de Campo (1 por time):** Recebe as sugestões dos colegas e é quem **confirma** a revelação da carta escolhida ou **passa a vez**.
- **Agente Operacional (demais jogadores do time):** Discute as possibilidades com a equipe e pode **apontar** cartas no tabuleiro para sinalizar palpites ao Porta-voz.

### Fluxo do Turno
1. **Dica do Capitão:** Na vez do seu time, o Capitão envia:
   - **1 única palavra** (sem espaços e que não seja igual a nenhuma palavra visível no tabuleiro);
   - **1 número de `1` a `9`**, indicando quantas cartas do tabuleiro se relacionam com aquela dica.
2. **Palpites do Time:** O time tem até **`número da dica + 1`** palpites na rodada (o `+1` serve como palpite bônus para recuperar alguma palavra de dicas anteriores).
   - **Acertou a cor do próprio time:** A carta é revelada e o time pode continuar tentando (até o limite de palpites) ou **Passar a Vez**.
   - **Acertou carta Neutra ou do time adversário:** O turno termina imediatamente (e, se for do adversário, conta ponto para ele).
   - **Acertou o Assassino:** **Derrota instantânea** para o time que revelou a carta!

### Vitória
Vence o esquadrão que **revelar todas as suas cartas** primeiro (9 ou 8, dependendo de quem começou) — ou se o time adversário revelar o **Assassino**.

Ao fim da partida, o Host pode iniciar uma **nova partida com rotação automática de Capitães** ou voltar para o Lobby.

---

## Como Executar

### Pré-requisitos
- **Node.js** (v18+ recomendado) e **npm**

### 1. Instalar dependências
```bash
npm install
```

### 2. Modo Desenvolvimento (LAN)
Inicia simultaneamente o servidor WebSocket/HTTP (`0.0.0.0:3000`) e o cliente Vite (`--host` na porta `5173`) com proxy para `/socket.io` e detecção automática do IP da rede local:
```bash
npm run dev
```
Acesse no navegador da máquina (`http://localhost:5173`) ou pelo celular na mesma rede Wi-Fi usando o endereço `Network` exibido no terminal (ex.: `http://192.168.x.x:5173`).

### 3. Modo Produção LAN (Porta Única `3000`)
Compila o frontend para `dist/` e serve tanto os arquivos estáticos quanto o servidor WebSocket na porta `3000` (`0.0.0.0:3000`):
```bash
npm run build
npm start
```

### 4. Executar com Docker (em segundo plano)
Para deixar a aplicação rodando continuamente em segundo plano na sua máquina (inclusive após reiniciar), sem precisar manter nenhum terminal aberto:
```bash
docker compose up -d --build
```
Comandos úteis para gerenciar o container:
- **Ver logs:** `docker compose logs -f`
- **Parar o container:** `docker compose down`

---

## Estrutura do Projeto

```text
cipher-grid/
├── client/          # Frontend React + Vite + Tailwind CSS
│   └── src/
│       ├── components/   # Telas (Home, Lobby, Tabuleiro, Modal de Compartilhamento)
│       ├── hooks/        # Hook de conexão Socket.io (useGameSocket.ts)
│       └── utils/        # Gerador de QR Code local (qrcode.ts)
├── server/          # Backend Node.js + Express + Socket.io
│   ├── gameEngine.ts     # Regras, turnos, validação de dicas e estado das salas
│   ├── words.ts          # Dicionário de palavras em PT-BR
│   └── index.ts          # Servidor HTTP/WebSocket e detecção de IP LAN
└── shared/          # Contratos e configurações compartilhadas
    ├── branding.ts       # Título, subtítulo, nomes de times e papéis
    └── types.ts          # Tipos e eventos WebSocket (Client/Server)
```

---

## Customização

Para alterar o nome do jogo, subtítulo, nomes dos esquadrões ou títulos dos papéis, edite [shared/branding.ts](file:///home/joao/projects/personal/cipher-grid/shared/branding.ts).
