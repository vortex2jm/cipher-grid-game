Para o repositório no GitHub, um ótimo nome técnico, limpo e livre de marcas registradas (como *Codenames*) é **`cipher-grid`**. Ele passa a ideia de tabuleiro de decodificação/espionagem, soa bem em um portfólio open-source e é totalmente desacoplado do título customizado da interface.

Abaixo está o prompt estruturado e completo, pronto para você copiar e colar no seu agente de código (Cursor, Claude Code, Windsurf, etc.):

```markdown
# Role & Objective
Atue como um Engenheiro Fullstack Sênior especialista em TypeScript, sistemas real-time (WebSockets) e Game UI Design. Sua tarefa é criar do zero uma aplicação web multiplayer em tempo real para rede local (LAN) inspirada na mecânica de associação de palavras em grade 5x5.

- **Nome técnico do repositório/pacote (`package.json`, README):** `cipher-grid` (sem menções a marcas registradas no código-fonte ou metadados).
- **Título de exibição na interface:** `"Código Secreto do Passeio dos Cria"`.
  - **IMPORTANTE:** Centralize o título, subtítulo e textos de marca em um único arquivo de configuração (`shared/branding.ts`) para que possam ser alterados em 1 linha sem precisar caçar strings nos componentes.

---

## 1. Stack Tecnológica e Arquitetura
- **Linguagem:** 100% TypeScript (Backend, Frontend e tipos compartilhados).
- **Backend:** Node.js + Express + `socket.io` (executado via `tsx` em dev). Estado mantido 100% em memória RAM (dicionário de salas).
- **Frontend:** Vite + React + Tailwind CSS + `socket.io-client` + `lucide-react` (ícones) + `canvas-confetti` (efeito de vitória).
- **Estrutura de diretórios (Monorepo simples ou estrutura unificada):**
  ```text
  cipher-grid/
  ├── shared/
  │   ├── types.ts          # Contratos WebSocket, interfaces de estado e DTOs
  │   └── branding.ts       # Constantes de nome do jogo, subtítulo e tema
  ├── server/
  │   ├── index.ts          # Servidor Express + Socket.io escutando em 0.0.0.0:3000
  │   ├── gameEngine.ts     # Lógica de salas, fila circular, turnos e anti-cheat
  │   └── words.ts          # Dicionário com pelo menos 350 palavras em PT-BR
  ├── client/
  │   ├── src/
  │   │   ├── components/   # Telas (Home, Lobby, GameBoard, EndScreen) e modais
  │   │   ├── hooks/        # Hook customizado useGameSocket + persistência localStorage
  │   │   ├── App.tsx
  │   │   └── main.tsx
  │   └── vite.config.ts    # Com proxy de /socket.io (ws: true) apontando para localhost:3000
  └── package.json          # Scripts para rodar dev (concorrente) e build/start para produção LAN

```

* **Modo Produção LAN:** O script `npm run build` deve gerar o `dist` do Vite, e `npm start` deve fazer o Express servir os arquivos estáticos do `dist` na mesma porta `3000` (em `0.0.0.0`), permitindo que celulares na mesma rede Wi-Fi acessem tudo por um único IP e porta.

---

## 2. Identidade Visual ("Cara de Game" — Neo-Spy Arcade / Tactical Night)

Construa uma interface imersiva, responsiva (Mobile-First, já que todos jogarão pelo celular, mas que também fique incrível em telas grandes/TV):

* **Estética:** Tema escuro tático ("Classified Dossier / Cyber Spy"). Fundo em `slate-950` com sutil grid tático de fundo e detalhes em neon suave.
* **Tipografia:** Fonte mono/tática para cabeçalhos, códigos de sala e contadores; fonte sans-serif ultra legível e em caixa alta (`uppercase tracking-wider font-extrabold`) para as palavras das cartas.
* **Estilo das Cartas (Grid 5x5):**
* Aparência física de cartas/blocos táticos (bordas chanfradas ou `rounded-xl`, sombra interna/3D sutil com `border-b-4` que afunda ao clicar).
* **Cartas Ocultas (Agentes):** Fundo creme/ossi (`#e8dfca` ou `slate-800` de alto contraste) com texto bem legível em telas pequenas (`text-[11px] sm:text-base` com quebra segura ou auto-scale).
* **Cartas Reveladas:**
* **Time Azul:** Azul elétrico vibrante (`bg-blue-600 border-blue-400 text-white`).
* **Time Vermelho:** Vermelho carmesim intenso (`bg-rose-600 border-rose-400 text-white`).
* **Neutro (Civil):** Cinza/bege apagado com opacidade reduzida (`bg-slate-600/60 text-slate-300`).
* **Assassino:** Preto profundo com borda pulsante vermelha/roxa e ícone de caveira (`bg-zinc-950 border-red-500 text-red-400`).


* **Visão Exclusiva do Capitão:** Cartas ainda não reveladas devem exibir uma borda luminosa colorida e um badge discreto no canto indicando a cor real, enquanto cartas já reveladas ficam mais escuras/riscadas para facilitar a leitura rápida do que ainda falta.


* **HUD Superior:** Placar estilo placar eletrônico de e-sports mostrando cartas restantes de cada time, indicador claro de quem é o turno, dica ativa em destaque (`"DICA: [PALAVRA] — [N]"`), palpites restantes e o nome do **Porta-voz da vez** e do **Capitão da vez**.

---

## 3. Regras de Negócio, Fluxo de Salas e Persistência de Sessão

### 3.1. Identificação e Reconexão (`localStorage`)

* Celulares bloqueiam a tela com frequência. Ao abrir o app, gere e salve um `playerId` (UUID) e o `nickname` no `localStorage`.
* Em toda conexão/reconexão WebSocket, envie `{ playerId, nickname, roomCode }`. Se o jogador cair e voltar no meio da partida, o servidor deve reassociar o novo `socket.id` ao `playerId` existente na sala sem que ele perca seu lugar na fila, seu time ou seu papel atual.

### 3.2. Fluxo de Telas

1. **Tela Inicial (Home):**
* Exibe o título vindo de `branding.ts`.
* Campo para digitar o **Nickname**.
* Botão **"Criar Nova Sala"** (gera código de 4 letras maiúsculas, ex: `K9P2`, define o criador como `hostId`) ou campo para digitar o **Código da Sala** + botão **"Entrar"**.


2. **Tela de Lobby (`fase: 'LOBBY'`):**
* Exibe o código da sala em destaque (com botão de copiar).
* **Todo mundo entra apenas como Jogador/Agente (não há escolha manual de Capitão ou Porta-voz).**
* Duas colunas: **Time Azul** e **Time Vermelho**, mostrando a fila ordenada de jogadores em cada time.
* Botão **"Trocar de Time"** para o próprio jogador alternar entre Azul e Vermelho.
* Controles exclusivos do **Host**:
* Botão **"Sortear/Balancear Times"** (embaralha todos os presentes igualmente entre Azul e Vermelho).
* Botão **"Iniciar Partida"** (só fica habilitado se houver **pelo menos 2 jogadores no Time Azul e 2 jogadores no Time Vermelho**).





### 3.3. Sistema de Fila Circular Dupla (Capitão e Porta-voz Automáticos)

Cada time mantém um array ordenado de `playerId`s (`filas: { azul: string[], vermelho: string[] }`) e dois ponteiros numéricos no servidor:

1. **`indiceCapitao: { azul: number, vermelho: number }`**
* Na primeira partida, o índice `0` de cada fila é o **Capitão** daquele time.
* Todos os demais jogadores da fila (`total - 1`) atuam como **Agentes** naquela partida, mantendo a ordem circular logo após o Capitão.
* Ao clicar em **"Próxima Partida"** no fim do jogo, `indiceCapitao` avança em `+1` (`(indiceCapitao + 1) % fila.length`) para ambos os times, garantindo que na partida seguinte o próximo jogador da fila vire Capitão e o antigo Capitão volte a ser Agente.


2. **`indicePortaVoz: { azul: number, vermelho: number }`**
* Dentro da lista de Agentes ativos daquela partida (excluindo o Capitão atual), apenas **1 Agente por turno** é o **Porta-voz**.
* Na Partida 1, Turno 1 do time, o primeiro Agente após o Capitão é o Porta-voz.
* Sempre que o turno de um time se encerra, o servidor incrementa `indicePortaVoz[time]` em `+1` (`% agentesAtivos.length`). Assim, no próximo turno daquele time, o próximo Agente da roda assume o controle do clique.



---

## 4. Mecânica da Partida e Blindagem Anti-Cheat

### 4.1. Geração do Tabuleiro (5x5 = 25 cartas)

* Sorteie aleatoriamente qual time começa (`timeInicial`: `'azul'` ou `'vermelho'`).
* O time que começa recebe **9 cartas** da sua cor; o segundo time recebe **8 cartas**; **7 cartas** são `'neutro'` e **1 carta** é `'assassino'`.
* Sorteie 25 palavras únicas do dicionário sem repetir as palavras da partida imediatamente anterior daquela sala.

### 4.2. Segurança Anti-Cheat no Backend (Obrigatório)

* **NUNCA envie as cores reais das cartas não reveladas para quem não é Capitão.**
* Ao emitir o estado da sala (`atualizar_estado`), o servidor deve montar um payload individualizado para cada jogador conectado:
* Se `papel !== 'capitao'` e `fase !== 'FIM'`, qualquer carta com `revelada === false` DEVE ser enviada com `cor: 'oculta'`.
* Somente os dois Capitães da partida atual (ou todos os jogadores quando `fase === 'FIM'`) recebem as cores reais das cartas fechadas.



### 4.3. Fases do Turno e Interação do Porta-voz

1. **Fase 1 do Turno — `aguardandoDica: true`:**
* Apenas o **Capitão do time da vez** vê um formulário ativo para digitar a **Palavra da Dica** (1 palavra única, não pode conter espaços nem ser igual a uma carta aberta/fechada do tabuleiro) e o **Número** (`1` a `9`).
* Todos os outros jogadores veem um banner animado: *"Aguardando dica do Capitão [Nickname]..."* e o tabuleiro fica bloqueado para cliques.
* Ao enviar a dica, `aguardandoDica` vira `false` e `palpitesRestantes` passa a ser `numero + 1`.


2. **Fase 2 do Turno — `aguardandoDica: false` (Adivinhação):**
* Apenas o **Porta-voz atual do time da vez** tem permissão para selecionar e confirmar cartas.
* **Prevenção de clique acidental (Two-Step Confirm):** Quando o Porta-voz toca em uma carta fechada, ela fica destacada/selecionada (pode emitir um evento opcional `apontar_carta` para que todos vejam qual carta o Porta-voz destacou) e abre um botão claro de confirmação: **"Confirmar Palpite: [PALAVRA]"**.
* O servidor **rejeita** qualquer evento `revelar_carta` ou `passar_turno` que não venha exatamente do `playerId` do Porta-voz do time da vez.


3. **Resolução do Clique (`revelar_carta`):**
* **Carta da cor do próprio time:** Revela a carta. Se zerar as cartas restantes desse time, encerra o jogo (`fase: 'FIM'`, `vencedor: timeAtual`). Caso contrário, decrementa `palpitesRestantes`. Se `palpitesRestantes === 0`, encerra o turno automaticamente e avança o Porta-voz.
* **Botão "Encerrar Turno":** Disponível para o Porta-voz parar de chutar a qualquer momento e passar a vez.
* **Carta Neutra:** Revela a carta e passa o turno imediatamente para o outro time (avançando o `indicePortaVoz` do time que jogou).
* **Carta do Time Inimigo:** Revela a carta. Se for a última carta que faltava para o inimigo, o time inimigo vence imediatamente. Caso contrário, passa o turno imediatamente.
* **Carta Assassino:** Revela a carta, define `fase: 'FIM'` e declara o **time adversário como vencedor** imediatamente.



### 4.4. Fim de Jogo (`fase: 'FIM'`)

* Revela as cores de todas as 25 cartas para todos os jogadores na sala.
* Exibe banner de vitória do time vencedor (e motivo: encontrou todos os agentes ou adversário acionou o Assassino) com efeito de confete.
* Botões para o Host:
* **"Próxima Partida (Rotacionar Capitães)"**: Mantém os times, avança `indiceCapitao` de ambos os times circularmente, reseta `indicePortaVoz` e gera um novo tabuleiro.
* **"Voltar ao Lobby"**: Volta para `fase: 'LOBBY'` caso queiram reorganizar os times.



---

## 5. Dicionário de Palavras (`server/words.ts`)

Popule o arquivo `server/words.ts` com **pelo menos 350 substantivos e palavras em Português (PT-BR)**, todas em CAIXA ALTA, escolhidas especificamente por terem múltiplos significados (polissemia) e gerarem boas conexões criativas.

* Inclua palavras clássicas de jogos de associação e elementos da cultura brasileira (ex: `BANCO`, `MANGA`, `BATERIA`, `COROA`, `PLANTA`, `REDE`, `OPERACAO`, `FANTASMA`, `SATELITE`, `PIRAMIDE`, `CARNAVAL`, `BOTECO`, `CHURRASCO`, `GARRAFA`, `ESPELHO`, `VAMPIRO`, `CATEDRAL`, `SUBMARINO`, `TORNADO`, `LASER`, `CODIGO`, `RAIO`, `PONTE`, `LINHA`, `QUADRO`, `NOTA`, `CHAVE`, `VELA`, `CASCA`, `PENALTI`, `SAMBA`, `SERRA`, `MINA`, `CARGA`, `ESTRELA`, `CAMPO`, `FOLHA`, `PENA`, `SOLA`, `GRAU`, etc. — gere a lista completa com 350+ palavras variadas diretamente no arquivo, sem usar placeholders).

---

## 6. Entregáveis Esperados

1. Crie todos os arquivos do projeto completos, sem omitir trechos com comentários do tipo `// resto do código aqui`.
2. Configure o `package.json` raiz (ou scripts integrados) para que `npm install` e `npm run dev` subam o servidor e o cliente prontos para uso na rede local (`--host`), incluindo um log no terminal do servidor que mostre automaticamente o IP local da máquina (usando `os.networkInterfaces()`) para facilitar o compartilhamento com os amigos no Wi-Fi.

```

### Dica extra para rodar
Quando o agente terminar de gerar o projeto, como ele já vai incluir a detecção de IP via `os.networkInterfaces()`, você pode até colocar um pacote como `qrcode-terminal` ou `qrcode.react` na tela do Lobby depois — assim seus amigos só apontam a câmera do celular para a tela do seu notebook/PC e já caem direto na sala sem digitar o IP.

```