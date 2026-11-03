[English](./README.md) | **Português (Brasil)**

<p align="center">
  <a href="https://wppconnect.io/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://wppconnect-team.github.io/brand/v2/wppconnect-dark.png" />
      <img src="https://wppconnect-team.github.io/brand/v2/wppconnect-light.png" alt="WPPConnect" width="220" height="121" />
    </picture>
  </a>
</p>

# WPPConnect Manager

Gerencie sessões e conversas do WPPConnect Server em uma aplicação web auto-hospedada.

Um projeto do ecossistema WPPConnect, mantido pela WPPConnect Team.

[Primeiros passos](#primeiros-passos) | [Documentação](#documentação) | [Como contribuir](#como-contribuir) | [Apoie a WPPConnect](#apoie-o-projeto)

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE) [![CI](https://github.com/wppconnect-team/wppconnect-manager/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wppconnect-team/wppconnect-manager/actions/workflows/ci.yml) [![Documentation](https://img.shields.io/badge/docs-WPPConnect-blue)](https://wppconnect.io/) [![Open Collective](https://img.shields.io/badge/Open%20Collective-WPPConnect-blue)](https://opencollective.com/wppconnect)

## Visão geral

Para operadores do WPPConnect Server. Antes chamado `wppconnect-frontend`, a versão 2 substitui o frontend demonstrativo por React, TypeScript, Vite e Material UI, preservando histórico e licença. A interface exige um Server separado com o protocolo Manager 1 (`GET /api/manager/info`).

## Funcionalidades

- Múltiplos perfis de servidor; inventário de sessões, atualização do QR, início/reconexão, encerramento, logout e limpeza.
- Acesso administrativo ou restrito à sessão; as credenciais permanecem em memória.
- Conversas, contatos, grupos e mídia com limite de 20 MB por anexo na interface; eventos autenticados em tempo real.
- Inglês/português, temas claro/escuro e layouts para computador/celular.

![Visão geral do Manager com dados sintéticos de demonstração](docs/screenshots/overview-desktop.png)

Capturas e testes de navegador usam dados sintéticos. Pareamento real, envio/recepção e disponibilidade de mídia dependem do Server e do WhatsApp conectados; histórico/mídia indisponíveis são informados como erros.

## Primeiros passos

Use um WPPConnect Server existente com o protocolo Manager 1 e Docker:

```sh
docker run --rm -p 8080:80 \
  -e MANAGER_SERVER_URL=http://localhost:21465 \
  ghcr.io/wppconnect-team/wppconnect-manager:2.0.0
```

Abra `http://localhost:8080/manager/`. Informe o segredo do servidor para administrar ou nome/token de sessão para acesso restrito. A imagem integrada do Server oferece a interface em `http://localhost:21465/manager/`. Para desenvolver a interface use Node.js `>=22.12` (o CI usa 22.22.2), `npm ci` e `npm run dev`.

## Configuração

`MANAGER_SERVER_URL` deve ser acessível pelo navegador, sem credenciais na URL. O container cria `/manager/config.js` ao iniciar; reinicie/recrie para alterar. Builds pelos fontes usam [public/config.js](public/config.js). Use HTTPS na interface e na API para acesso remoto. Proxies devem encaminhar `/api/`, `/manager/` e `/socket.io/` com upgrade WebSocket. Apenas nomes/URLs de perfis, idioma e tema persistem no navegador. Recarregar exige informar as credenciais novamente. As configurações antigas `window.IP_SERVER`, `window.IP_SOCKET_IO` e `@WPPConnect-Token` não são importadas. Encerre a sessão antes de limpar seus dados. Fixe versões das imagens; o rollback exige Server e interface com protocolos compatíveis.

## Documentação

- [Configuração do Compose independente](./compose.yaml)
- [Integração com o Server](https://github.com/wppconnect-team/wppconnect-server/blob/main/docs/manager.md)
- [Pacotes de versão e checksums](https://github.com/wppconnect-team/wppconnect-manager/releases)
- [Detalhes técnicos e agradecimentos preservados](documentation/readme-reference.md)

## Ecossistema WPPConnect

| Projeto | Finalidade | Quando usar |
| --- | --- | --- |
| [WPPConnect Server](https://github.com/wppconnect-team/wppconnect-server) | Execute uma API REST para sessões, mensagens e webhooks do WhatsApp. | Expor operações de sessão e mensagens por HTTP. |
| [WPPConnect Server CLI](https://github.com/wppconnect-team/server-cli) | Inicie o WPPConnect Server pelo comando `wppserver`. | Iniciar o Server Node.js pelo terminal. |

## Apoie o projeto

A WPPConnect é mantida por uma comunidade de código aberto. Seu apoio ajuda a financiar a manutenção, a infraestrutura, a documentação e o trabalho das pessoas que desenvolvem o ecossistema.

Se a WPPConnect ajuda seu projeto ou sua empresa, considere fazer uma contribuição pontual ou apoiar de forma recorrente.

**[Apoie a WPPConnect no Open Collective](https://opencollective.com/wppconnect)**

As contribuições são voluntárias. Consulte a página oficial para acompanhar as informações financeiras atuais. Você também pode ajudar com código, testes, documentação, traduções e relatos de problemas bem descritos.

Beneficiários oficiais adicionais em [.github/FUNDING.yml](.github/FUNDING.yml): [joaosouz4dev](https://github.com/sponsors/joaosouz4dev), [manfe](https://github.com/sponsors/manfe).

## Como contribuir

Contribuições de código, testes, exemplos, documentação e traduções são bem-vindas. Para mudanças maiores, discuta a proposta em uma issue primeiro. Ao relatar um problema, informe as versões do projeto/runtime, uma reprodução mínima e logs sem dados sensíveis. Atualize `README.md` e `README.pt-BR.md` na mesma alteração quando mudar instalação, configuração, funcionalidades, exemplos, licença ou arrecadação.

Após instalar as dependências de desenvolvimento, use as verificações pertinentes à sua alteração:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Exemplos e testes que dependem de conta exigem validação separada com uma conta de teste autorizada. Nunca anexe credenciais ou arquivos de sessão a uma issue.

## Comunidade e suporte

Use as [issues do repositório](https://github.com/wppconnect-team/wppconnect-manager/issues) para bugs reproduzíveis e propostas de funcionalidades. Para dúvidas de uso, participe pelos canais oficiais:

- [Discord](https://discord.gg/JU5JGGKGNG)
- [Telegram](https://t.me/wppconnect)
- [YouTube](https://www.youtube.com/c/wppconnect)

Este projeto é independente e não é afiliado nem endossado pelo WhatsApp ou pela Meta. Siga os termos aplicáveis e obtenha autorização para operações de conta e mensagens.

## Licença

[Apache License 2.0 (Apache-2.0)](./LICENSE).

Copyright WPPConnect Team and contributors.

O documento jurídico original e os avisos de autoria existentes são preservados. Componentes de terceiros mantêm seus próprios termos.
