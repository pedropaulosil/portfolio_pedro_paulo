// Função serverless (Vercel) e também usada pelo server.js local.
// Busca os repositórios públicos no GitHub e devolve só o que o site usa.
// Usa apenas res.statusCode / setHeader / end, que funcionam na Vercel e no Node puro.

const USER = process.env.GITHUB_USER || 'pedropaulosil';

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const headers = {
      'User-Agent': 'portfolio-pedro-paulo',
      Accept: 'application/vnd.github+json'
    };
    // Opcional: um token aumenta o limite de requisições da API do GitHub.
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(
      `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`,
      { headers }
    );
    if (!response.ok) throw new Error(`GitHub respondeu ${response.status}`);

    const data = await response.json();
    const repos = data
      .filter((repo) => !repo.fork)
      .map((repo) => ({
        name: repo.name,
        stars: repo.stargazers_count,
        language: repo.language,
        pushedAt: repo.pushed_at,
        url: repo.html_url
      }));

    // A Vercel guarda a resposta por 1 hora, então o limite da API não é um problema.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(JSON.stringify({ repos }));
  } catch (error) {
    // O site continua funcionando sem as estatísticas.
    res.setHeader('Cache-Control', 's-maxage=60');
    res.statusCode = 200;
    res.end(JSON.stringify({ repos: [], error: true }));
  }
};
