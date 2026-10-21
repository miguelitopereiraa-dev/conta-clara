# ContaClara

Aplicação de controle financeiro pessoal construída com React e TypeScript.

## Requisitos

- Node.js e npm

## Executar localmente

Instale as dependências:

```powershell
npm install
```

Inicie o app:

```powershell
npm start
```

O comando compila a aplicação com esbuild, serve os arquivos estáticos e mostra no terminal o endereço local. Use `Ctrl+C` para encerrar.

Para gerar somente os arquivos de produção:

```powershell
npm run build
```

Os arquivos prontos ficam na pasta `dist/` e podem ser publicados em qualquer servidor de arquivos estáticos.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie o projeto para a branch `main`.
2. No repositório, abra **Settings > Pages** e escolha **GitHub Actions** como fonte de publicação.
3. A cada envio para `main`, o workflow `.github/workflows/deploy.yml` compila e publica o site.

Para um repositório de projeto, o endereço será `https://<usuario>.github.io/<repositorio>/`. Para um repositório chamado `<usuario>.github.io`, o site será publicado na raiz `https://<usuario>.github.io/`.

O código-fonte ficará visível se o repositório for público. Os lançamentos financeiros não são enviados pelo deploy: permanecem no armazenamento local do navegador de cada pessoa.

## Verificações

```powershell
npm run typecheck
npm run lint
```
