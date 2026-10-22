# Portfólio · Pedro Paulo

Site estático em `public/` com uma função serverless em `api/` (Node.js) que busca dados ao vivo no GitHub.
Sem dependências: só precisa do Node 18 ou mais novo.

## Rodar localmente

```bash
npm start
# abre em http://localhost:3000
```

## Publicar na Vercel

1. Crie um repositório no GitHub e envie esta pasta:
   ```bash
   git init
   git add .
   git commit -m "Portfólio"
   git branch -M main
   git remote add origin https://github.com/pedropaulosil/portfolio.git
   git push -u origin main
   ```
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. Em **Framework Preset**, deixe **Other**. Não precisa de Build Command nem de Output Directory.
4. Clique em **Deploy**. A Vercel serve `public/` como site e transforma `api/stats.js` em `/api/stats`.

Opcional: em **Settings → Environment Variables**, adicione `GITHUB_TOKEN` (um token sem permissões extras) para
aumentar o limite de requisições da API do GitHub. O site funciona sem ele.

## Como editar

- **Projetos, tecnologias e e-mail:** `public/portfolio.json`. Preencha `"email"` para mostrar o botão "Copiar e-mail".
- **Link do Gastos Residenciais:** em `portfolio.json`, troque a `url` do projeto pelo link do repositório e preencha `"repo"` com o nome exato dele.
- **Imagem do fundo interativo:** substitua `public/img/hero.jpg`. Qualquer foto funciona, porque o site transforma a imagem em pontos que reagem ao mouse. Imagens com fundo escuro e um assunto claro ficam melhores.
- **Capas dos projetos:** coloque a imagem em `public/img/` e adicione `"image": "img/nome.png"` ao projeto no JSON. Sem imagem, o site usa um padrão em preto e branco com as iniciais.
- **Textos de Sobre, Resumo e Contato:** `public/index.html`.
- **Cores e fontes:** variáveis no início de `public/styles.css`.
