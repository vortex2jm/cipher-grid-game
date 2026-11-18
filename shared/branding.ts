export const HUB_TITLE = 'Passeio dos Cria — Party Hub';

export const BRANDING = {
  title: HUB_TITLE,
  subtitle: 'CENTRAL DE PARTY GAMES // REDE LOCAL',
  version: 'v2.0 // PARTY HUB LAN',
  games: {
    codenames: {
      id: 'codenames',
      title: 'Código Secreto',
      subtitle: 'Associação tática de palavras em grade 5×5 por equipes',
      minPlayers: 4,
      badge: 'EQUIPES 2v2+',
    },
    spyfall: {
      id: 'spyfall',
      title: 'O Impostor',
      subtitle: 'Dedução social, blefe e interrogatório contra o relógio',
      minPlayers: 3,
      badge: 'DEDUÇÃO SOCIAL',
    },
  },
  teams: {
    azul: {
      name: 'Esquadrão Azul',
      shortName: 'AZUL',
    },
    vermelho: {
      name: 'Esquadrão Vermelho',
      shortName: 'VERMELHO',
    },
  },
  roles: {
    capitao: 'Capitão de Inteligência',
    portaVoz: 'Porta-voz de Campo',
    agente: 'Agente Operacional',
  },
} as const;
