/* streams.js
   Lida com a exibição de detalhes do filme, carregamento e envio de comentários da integração. (IA)
*/

import { MOVIE_DATA } from './data.js';

const URL_API_COMENTARIOS = 'http://localhost:3001/comentarios';
const DBSTREAMS_API = 'http://localhost:3001/dbstreams';
import { slugForNumericId, numericIdForSlug } from './api.js';


function getMovieIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}


function slugifyName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function extractYoutubeId(urlOrId) {
  if (!urlOrId) return null;

  if (!urlOrId.includes('youtube') && !urlOrId.includes('youtu.be') && !urlOrId.includes('/')) {
    return urlOrId;
  }
  try {
    const u = new URL(urlOrId);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes('youtube')) {
      return u.searchParams.get('v');
    }
  } catch (e) {

    const m = urlOrId.match(/v=([^&]+)/);
    if (m && m[1]) return m[1];
    const m2 = urlOrId.match(/youtu\.be\/([^?&]+)/);
    if (m2 && m2[1]) return m2[1];
  }
  return null;
}


const GENRE_KEYWORDS = {
  'Terror': ['terror','horror','assombração','assombr','medo','invoca','anabelle','dahmer','chainsaw'],
  'Romance': ['romance','love','amor','romântico','gata','casal','namoro'],
  'Ação': ['ação','ação','aventure','aventura','guerra','luta','batalha','vingadores','gladiador','esquadrao'],
  'Animação': ['anime','anima','ghibli','animation','cartoon','pikachu','pokemon','bob_esponja','frozen'],
  'Drama': ['drama','emocion','emocionante','tragedia','drama','forrest','clube_da_luta'],
  'Suspense': ['suspense','mistério','mistério','misterio','thriller','psychological','psicose'],
  'Ficção Científica': ['ficção','ficcao','sci','science','espacial','interestelar','matrix','nolan'],
  'Comédia': ['comédia','comedia','comedy','cômico','engraçado','friends','the_office','family_guy']
};

function detectGenreForStream(s) {
  const text = String(`${s.nome || ''} ${s.descricao || ''} ${s.classificacao || ''}`).toLowerCase();
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return genre;
    }
  }
  return 'Outros';
}

function tryExtractCastFromDescription(s) {
  const desc = String(s.descricao || '').replace(/\s+/g, ' ');
  const m = desc.match(/(?:elenco|cast)[:\-]\s*([^\n\r\-]+)/i);
  if (m && m[1]) {
    const names = m[1].split(/,|;| e /).map(x => x.trim()).filter(Boolean);
    if (names.length) return names.join(', ');
  }
  return '';
}


function renderizarComentarios(comentarios) {
  const container = document.getElementById('lista-comentarios');
  container.innerHTML = '';

  if (!comentarios || comentarios.length === 0) {
    container.innerHTML = '<p>Seja o primeiro a comentar este filme!</p>';
    return;
  }


  comentarios.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  comentarios.forEach(c => {
    const dataFormatada = new Date(c.createdAt).toLocaleDateString('pt-BR', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    const divComentario = document.createElement('div');
    divComentario.className = 'comentario-item';

    divComentario.innerHTML = `
      <p class="comentario-cabecalho">
        <strong>${c.nomeUsuario}:</strong> 
        <span class="comentario-texto">${c.textoComentario}</span> 
      </p>
      <small class="comentario-data">em ${dataFormatada}</small>
      <hr>
    `;
    container.appendChild(divComentario);
  });
}

async function carregarComentarios(primaryId, secondaryId = null) {
  const container = document.getElementById('lista-comentarios');
  container.innerHTML = '<p>Carregando comentários...</p>';

  const collected = [];
  const seen = new Set();


  async function tryFetchAndCollect(id) {
    if (!id) return;
    try {
      const res = await fetch(`${URL_API_COMENTARIOS}/${encodeURIComponent(id)}`);
      if (!res.ok) return; 
      const data = await res.json();
      const list = data.comentarios || data || [];
      for (const c of list) {
        const key = `${c.nomeUsuario}::${c.textoComentario}`; 
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(c);
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar comentarios para id', id, e);
    }
  }


  await tryFetchAndCollect(primaryId);


  if (secondaryId && secondaryId !== primaryId) {
    await tryFetchAndCollect(secondaryId);
  }

  renderizarComentarios(collected);
}


function configurarEnvioComentario(idFilmeCardToUse) {
  const form = document.getElementById('form-novo-comentario');
  if (!form) return;


  form.replaceWith(form.cloneNode(true));
  const newForm = document.getElementById('form-novo-comentario');

  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nomeUsuario = document.getElementById('input-nome').value.trim();
    const textoComentario = document.getElementById('textarea-comentario').value.trim();
    if (!nomeUsuario || !textoComentario) {
      alert('Preencha seu nome e comentário.');
      return;
    }

    const body = {
      nomeUsuario,
      textoComentario,
      idFilmeCard: String(idFilmeCardToUse || getMovieIdFromUrl())
    };

    try {
      const response = await fetch(URL_API_COMENTARIOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resJson = await response.json();
      if (!response.ok) throw new Error(resJson.message || 'Erro ao enviar comentário');
      newForm.reset();
      alert('Comentário enviado com sucesso!');

      await carregarComentarios(body.idFilmeCard);
    } catch (err) {
      console.error('Falha no envio do comentário', err);
      alert(`Falha ao enviar comentário: ${err.message}`);
    }
  });
}


async function loadMovieDetails() {
  let movieId = getMovieIdFromUrl();
  console.log('[streams] loadMovieDetails start, id=', movieId);

  if (/^\d+$/.test(movieId)) {
    const slug = slugForNumericId(movieId);
    if (slug) {
      console.log('[streams] numeric id resolved to slug=', slug);
      movieId = slug;
    } else {
      console.log('[streams] numeric id has no matching local slug, will try DB lookup by id');
    }
  }
  console.log('[streams] loadMovieDetails start, id=', movieId);

  const localMovie = MOVIE_DATA[movieId];
  console.log('[streams] localMovie found?', !!localMovie);
  if (localMovie) {

    let localNumeric = null;
    try {
      localNumeric = numericIdForSlug(movieId);
    } catch (e) {
      localNumeric = null;
    }

    if (localNumeric) {
      const mappedLocal = Object.assign({}, localMovie, { id: movieId, numericId: String(localNumeric) });
      preencherPaginaComMovie(mappedLocal);
      await carregarComentarios(String(localNumeric), movieId);
      configurarEnvioComentario(String(localNumeric));
      return;
    }


    try {
      const resDb = await fetch(DBSTREAMS_API);
      if (resDb && resDb.ok) {
        const bodyDb = await resDb.json();
        const streams = Array.isArray(bodyDb) ? bodyDb : (bodyDb.streams || []);
        const ids = streams.map(s => Number(s.id)).filter(n => Number.isFinite(n));
        const maxExisting = ids.length ? Math.max(...ids) : 100;
        const nextId = String(Math.max(101, maxExisting + 1));
        const mappedLocal = Object.assign({}, localMovie, { id: movieId, numericId: nextId });
        preencherPaginaComMovie(mappedLocal);
        await carregarComentarios(nextId, movieId);
        configurarEnvioComentario(nextId);
        return;
      }
    } catch (e) {
      console.warn('Não foi possível acessar dbstreams para calcular numericId', e);
    }


    const fallbackId = numericIdForSlug(movieId) || '101';
    const mappedLocal = Object.assign({}, localMovie, { id: movieId, numericId: String(fallbackId) });
    preencherPaginaComMovie(mappedLocal);
    await carregarComentarios(String(fallbackId), movieId);
    configurarEnvioComentario(String(fallbackId));
    return;
  }

  try {
    const res = await fetch(DBSTREAMS_API);
    console.log('[streams] fetched dbstreams, status=', res.status);
    if (!res.ok) {

      document.getElementById('movie-title').textContent = 'Conteúdo Não Encontrado';
      document.getElementById('movie-description').textContent = 'Não foi possível acessar o backend.';
      console.warn('[streams] dbstreams endpoint not ok');
      return;
    }
    const body = await res.json();
    console.log('[streams] dbstreams body length=', Array.isArray(body) ? body.length : (body.streams || []).length);

    const streams = Array.isArray(body) ? body : (body.streams || []);
    const targetBySlug = streams.find(s => slugifyName(s.nome) === movieId);
    const targetById = streams.find(s => String(s.id) === movieId);
    console.log('[streams] targetById?', !!targetById, 'targetBySlug?', !!targetBySlug);

    const stream = targetById || targetBySlug;

    if (!stream) {
      console.warn('[streams] stream not found for id', movieId);
      const mt = document.getElementById('movie-title'); if (mt) mt.textContent = 'Conteúdo Não Encontrado';
      const md = document.getElementById('movie-description'); if (md) md.textContent = 'Verifique o link e tente novamente.';
      return;
    }


    let genres = stream.generos || stream.genres || [];
    if (Array.isArray(genres)) genres = genres.join(', ');
    else if (typeof genres === 'object' && genres !== null) genres = Object.values(genres).join(', ');
    genres = genres || detectGenreForStream(stream);

    let cast = stream.elenco || stream.cast || stream.atores || '';
    if (Array.isArray(cast)) cast = cast.join(', ');
    else if (typeof cast === 'object' && cast !== null) cast = Object.values(cast).join(', ');
    if (!cast) cast = tryExtractCastFromDescription(stream) || 'Desconhecido';

    const mapped = {
      title: stream.nome,
      description: stream.descricao || '',
      youtube_id: extractYoutubeId(stream.video) || null,
      poster_url: stream.poster || stream.cardCapa || stream.logo || stream.fundo || '',
      logo_url: stream.logo || '',
      info: `${stream.classificacao || ''} · ${stream.anoLancamento || ''}`.trim(),
      score: null,
      rating: stream.classificacao || '',
      duration: null,
      episodes: null,
      cast,
      genres,
      background_img: stream.fundo || '',
      numericId: stream.id !== undefined ? String(stream.id) : null
    };

    preencherPaginaComMovie(mapped);

    const primaryCommentId = String(stream.id);

    const slug = slugifyName(stream.nome);
    await carregarComentarios(primaryCommentId, slug);

    configurarEnvioComentario(primaryCommentId);

  } catch (err) {
    console.error('Erro ao buscar dbstreams:', err);
    const mt = document.getElementById('movie-title'); if (mt) mt.textContent = 'Conteúdo Não Encontrado';
    const md = document.getElementById('movie-description'); if (md) md.textContent = 'Erro interno ao carregar o conteúdo.';
  }
}


function preencherPaginaComMovie(movie) {

  const trailerPlaceholder = document.getElementById('trailer-placeholder');
  if (movie.youtube_id) {
    const embedUrl = `https://www.youtube.com/embed/${movie.youtube_id}?autoplay=1&controls=1&rel=0&modestbranding=1`;
    trailerPlaceholder.innerHTML = `
      <iframe 
        width="100%" 
        height="100%" 
        src="${embedUrl}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen
      ></iframe>
    `;
  } else {
    trailerPlaceholder.innerHTML = ''; 
  }

  document.title = movie.title || 'Stream';


  const titleElement = document.getElementById('movie-title');
  if (movie.logo_url) {
    titleElement.innerHTML = `<img src="${movie.logo_url}" alt="${movie.title} Logo" class="movie-logo">`;
  } else {
    titleElement.textContent = movie.title || '';
  }


  const idElement = document.getElementById('movie-id');
  if (idElement) {
    if (movie.numericId) {
      idElement.textContent = `ID: ${movie.numericId}`;
      idElement.style.display = '';
    } else if (movie.id) {
      idElement.textContent = `ID: ${movie.id}`;
      idElement.style.display = '';
    } else {
      idElement.textContent = '';
      idElement.style.display = 'none';
    }
  }


  document.getElementById('movie-description').innerHTML = movie.description || '';
  document.getElementById('movie-info').textContent = movie.info || '';


  if (movie.score) document.getElementById('movie-score').textContent = `⭐ ${movie.score}`;
  if (movie.rating) document.getElementById('movie-rating').textContent = `🔞 ${movie.rating}`;
  if (movie.duration) document.getElementById('movie-duration').textContent = `⏱️ ${movie.duration}`;
  if (movie.episodes) document.getElementById('movie-episodes').textContent = `🎬 ${movie.episodes}`;

  document.getElementById('movie-cast').textContent = movie.cast || '';
  document.getElementById('movie-genres').textContent = movie.genres || '';

  if (movie.poster_url) {
    const poster = document.getElementById('movie-poster');
    poster.src = movie.poster_url;
    poster.alt = `Pôster de ${movie.title}`;
  }

  if (movie.background_img) {
    const body = document.body;
    body.style.backgroundImage = `url('${movie.background_img}')`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundBlendMode = 'overlay';
    body.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    body.style.backgroundPosition = 'center center';
  }
}

document.addEventListener('DOMContentLoaded', loadMovieDetails);