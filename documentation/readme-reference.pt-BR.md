# Retained README reference / Referência preservada do README

This document preserves the previous `README.pt-BR.md` for technical details, acknowledgments and history. Start with [README.md](../README.md) or [README.pt-BR.md](../README.pt-BR.md) for the current verified entry path. Older commands, release claims, third-party examples and API signatures here may need migration; consult the current source and linked guides.

Este documento preserva o `README.pt-BR.md` anterior com detalhes técnicos, agradecimentos e histórico. Comece pelo [README em português](../README.pt-BR.md) para as instruções iniciais conferidas. Comandos antigos, afirmações sobre releases, exemplos de terceiros e assinaturas de API podem exigir migração; consulte os fontes e guias atuais.

---

<!-- wppconnect-official-brand -->
<p align="center">
  <a href="https://wppconnect-team.github.io/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://wppconnect-team.github.io/brand/wppconnect-dark.png" />
      <img src="https://wppconnect-team.github.io/brand/wppconnect-light.png" alt="WPPConnect" width="220" height="121" />
    </picture>
  </a>
</p>
<!-- /wppconnect-official-brand -->

# WPPConnect Manager

Painel de código aberto para **gerenciar sessões e conversar pelo WPPConnect Server**. Este é o antigo `wppconnect-frontend`, reativado e modernizado com React, TypeScript, Vite e Material UI.

![Visão geral](../docs/screenshots/overview-desktop.png)

_Captura real da aplicação com dados de demonstração. Não representa validação com conta WhatsApp conectada._

## O que oferece

- Perfis de múltiplos servidores, selecionando um por vez.
- Sessões com busca, filtros, status, QR atualizado, conexão/reconexão, encerramento, logout e limpeza de dados.
- Acesso administrativo por `SECRET_KEY` ou restrito por nome e token de sessão.
- Conversas, histórico disponível, contatos, criação de grupos, texto e anexos de até 20 MB.
- Imagens, stickers, áudio, vídeo e download de arquivos.
- Eventos autenticados por sessão, temas claro/escuro, português/inglês e layout responsivo.

## Começar com Docker

```bash
docker run --rm -p 8080:80 \
  -e MANAGER_SERVER_URL=http://localhost:21465 \
  ghcr.io/wppconnect-team/wppconnect-manager:2.0.0
```

Abra **http://localhost:8080/manager/**. A URL do server precisa ser acessível pelo navegador. O [Compose](../compose.yaml) também pode ser usado com `docker compose up -d`.

Na imagem integrada do WPPConnect Server, abra **http://localhost:21465/manager/**. O painel usa o mesmo servidor por padrão; `MANAGER_ENABLED=false` desativa somente a interface. A versão integrada verifica o checksum do bundle durante o build.

É necessário um server com **Manager protocol 1**, disponível em `/api/manager/info`. Versões anteriores precisam ser atualizadas. As APIs antigas são preservadas no server.

## Credenciais

A `SECRET_KEY` permite administrar todas as sessões. Para acesso restrito, use o nome da sessão e seu token. Credenciais ficam apenas em memória e são solicitadas novamente ao recarregar, trocar de servidor ou sair. Somente nomes, URLs, idioma e tema são persistidos no navegador.

Não coloque credenciais na URL ou em `config.js`. Ao acessar remotamente, use HTTPS na interface e no server. O proxy precisa encaminhar `/api/` e `/socket.io/`, incluindo upgrade WebSocket; `/manager` é o namespace autenticado dos eventos.

## Desenvolvimento e validação

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

O CI usa Node 22.22.2. Cadastre a URL do seu server em **Servidores**; o Vite serve a interface, não a API WhatsApp. O Docker gera `config.js` no início e aceita mudança de URL sem rebuild.

Os testes de navegador usam dados sintéticos. Pareamento e envio/recebimento reais exigem uma conta de teste autorizada e são uma validação separada.

## Atualização

Os antigos `IP_SERVER`, `IP_SOCKET_IO` e tokens locais não são importados. Cadastre os perfis novamente. As sessões existentes permanecem no server. Fixe tags/digests das imagens e registre a versão anterior para rollback; o painel não cria banco nem migração.

Para limpar dados, encerre primeiro a sessão. Logout desvincula o WhatsApp; encerramento apenas para a sessão. Erros de mídia e histórico são exibidos e dependem do conteúdo disponível no server.

[Documentação completa em inglês](../README.md) · [WPPConnect Server](https://github.com/wppconnect-team/wppconnect-server) · [Releases](https://github.com/wppconnect-team/wppconnect-manager/releases)

## Patrocínio

[joaosouz4dev](https://github.com/sponsors/joaosouz4dev) · [manfe](https://github.com/sponsors/manfe) · [Open Collective WPPConnect](https://opencollective.com/wppconnect)

Licença [Apache-2.0](../LICENSE). WPPConnect Team e colaboradores.
