/* Parte da Integração, como não se sabe como fazer, foi usado Inteligência Artificial */

import { MOVIE_DATA } from './data.js';
import { numericIdForSlug } from './api.js';

const DBSTREAMS_API = 'http://localhost:3001/dbstreams';

const LOCAL_KEYS = Object.keys(MOVIE_DATA).sort();
let SEARCH_INDEX = LOCAL_KEYS.map((k) => {
  const f = MOVIE_DATA[k];
  return {
    id: k,
    title: f.title || f.name || f.nome || '',
    poster_url: f.poster_url || f.poster || f.cardCapa || '',
    numericId: (f.numericId !== undefined && f.numericId !== null) ? String(f.numericId) : (numericIdForSlug(k) || null),
    info: f.info || '',
    rating: f.rating || f.classificacao || '',
    genres: f.genres || f.genre || '',
    cast: f.cast || f.elenco || f.cast || f.casts || f.actors || f.cast || '',
    _source: 'local',
    _raw: f,
  };
});

function slugifyName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function mapStreamDBToMovie(s) {
  const poster = s.poster || s.poster_url || s.logo || s.fundo || '';
  const card = s.card || s.cardCapa || s.card_url || s.cover || '';
  const idFromName = slugifyName(s.nome) || `db_${s.id}`;
  let genres = s.generos || s.genres || [];
  if (Array.isArray(genres)) genres = genres.join(', ');
  else if (typeof genres === 'object' && genres !== null) genres = Object.values(genres).join(', ');
  genres = genres || detectGenreForStream(s);

  let cast = s.elenco || s.cast || s.atores || '';
  if (Array.isArray(cast)) cast = cast.join(', ');
  else if (typeof cast === 'object' && cast !== null) cast = Object.values(cast).join(', ');

  return {
    id: idFromName,
    title: s.nome || s.title || `Stream ${s.id}`,
    poster_url: poster,
    card_url: card,
    numericId: (s.id !== undefined ? String(s.id) : null),
    genres,
    cast,
    _source: 'dbstream',
    _raw: s,
  };
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

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function criarCardElement(filme, vertical = false) {
  const a = document.createElement('a');
  a.href = `streams.html?id=${filme.id}`;
  a.className = 'card' + (vertical ? ' card-vertical' : '');
  a.dataset.id = filme.id;
  if (filme.numericId !== undefined && filme.numericId !== null) a.dataset.numId = String(filme.numericId);
  try { a.dataset.genres = String(filme.genres || (filme._raw && (filme._raw.generos || filme._raw.genres)) || '').toLowerCase(); } catch(e) { a.dataset.genres = ''; }

  const img = document.createElement('img');
  img.src = (!vertical && filme.card_url) ? filme.card_url : (filme.poster_url || 'https://via.placeholder.com/300x170?text=Sem+Imagem');
  img.alt = filme.title || 'Poster';

  a.appendChild(img);
  const infoDiv = document.createElement('div');
  infoDiv.className = 'card-info';
  infoDiv.innerHTML = `
    <div class="card-genres"><strong>Gêneros:</strong> ${filme.genres || ''}</div>
    <div class="card-cast"><strong>Elenco:</strong> ${filme.cast || ''}</div>
  `;
  a.appendChild(infoDiv);
  return a;
}

const SIDEBAR_GENRE_MAP = {
  terror: ['terror','horror','assombra','medo'],
  acao: ['ação','acao','ação','luta','batalha','aventura'],
  animacao: ['anime','anima','animação','animation','cartoon'],
  aventura: ['aventura'],
  suspense: ['suspense','mistério','misterio','thriller','psychological'],
  ficcao_cientifica: ['ficção','ficcao','sci','science','espacial','ficcao cientifica','ficção científica'],
  drama: ['drama','emocion','tragédia','tragedia'],
  comedia: ['comédia','comedia','comedy','engraçado','engracado'],
  romance: ['romance','love','amor']
};

let activeSidebarGenre = null;

function clearGenreFilterUI() {
  const resultsContainer = document.getElementById('resultsContainer');
  if (resultsContainer) resultsContainer.innerHTML = '';
  const originalContent = document.getElementById('originalContent'); if (originalContent) originalContent.style.display = 'block';
  const dbRoot = document.getElementById('dbstreamsColumns'); if (dbRoot) dbRoot.style.display = 'block';
  document.querySelectorAll('#leftSidebar nav ul li').forEach(li => li.classList.remove('active'));
  activeSidebarGenre = null;
}

function filterByGenreKey(key) {
  const genreKey = String(key || '').toLowerCase();
  if (!genreKey) { clearGenreFilterUI(); return; }
  if (activeSidebarGenre === genreKey) { clearGenreFilterUI(); return; }


  const searchInput = document.getElementById('searchInput');
  if (searchInput) { searchInput.value = ''; document.getElementById('resultsContainer').innerHTML = ''; }

    const keywords = SIDEBAR_GENRE_MAP[genreKey] || [genreKey];

    const resultsContainer = document.getElementById('resultsContainer');
    const matches = [];
    getSearchSource().forEach(item => {
      let genresText = '';
      if (item._source === 'local') {
        const d = MOVIE_DATA[item.id];
        if (d && d.genres) genresText = String(d.genres).toLowerCase();
      } else {
        genresText = String(item.genres || (item._raw && (item._raw.generos || item._raw.genres)) || '').toLowerCase();
      }
      if (genresText && keywords.some(kw => genresText.includes(kw))) matches.push(item);
    });

    if (resultsContainer) {
      if (matches.length > 0) {
        resultsContainer.innerHTML = `<h3>Filtrando: ${key.replace(/_/g,' ')} <button class="btn" id="btn-reset-filters">Voltar</button></h3>`;
        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'card-grid';
        matches.forEach(filme => { resultsGrid.innerHTML += criarCardHTML(filme); });
        resultsContainer.appendChild(resultsGrid);
        const resetBtn = document.getElementById('btn-reset-filters');
        if (resetBtn) resetBtn.addEventListener('click', () => clearGenreFilterUI());
        if (!resultsContainer.dataset.clickHandlerAttached) {
          resultsContainer.addEventListener('click', (ev) => {
            const a = ev.target.closest && ev.target.closest('a.card');
            if (a && a.href) window.location.href = a.href;
          });
          resultsContainer.dataset.clickHandlerAttached = '1';
        }

        Array.from(resultsGrid.querySelectorAll('a.card')).forEach(a => {
          if (a.dataset.directNavAttached) return;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = a.href;
          });
          a.dataset.directNavAttached = '1';
        });
      } else {
        resultsContainer.innerHTML = '<p class="no-results">Nenhum título encontrado para esse gênero.</p>';
      }
    }

    const originalContent = document.getElementById('originalContent'); if (originalContent) originalContent.style.display = 'none';
    const dbRoot = document.getElementById('dbstreamsColumns'); if (dbRoot) dbRoot.style.display = 'none';

    document.querySelectorAll('#leftSidebar nav ul li').forEach(li => li.classList.toggle('active', li.dataset.cat === genreKey));
    activeSidebarGenre = genreKey;
}

function setupSidebarHandlers() {
  const lis = document.querySelectorAll('#leftSidebar nav ul li');
  lis.forEach(li => {
    li.addEventListener('click', () => {
      const key = li.dataset.cat || li.textContent.trim().toLowerCase().replace(/\s+/g,'_');
      if (key === 'todos') { clearGenreFilterUI(); return; }
      filterByGenreKey(key);
      // close sidebar on mobile
      const sidebar = document.getElementById('leftSidebar'); if (sidebar && sidebar.classList.contains('show')) sidebar.classList.remove('show');
    });
  });
}

// ------------------ Filtros (classificação / ano (IA)) ------------------
// tenta extrair o ano de lançamento de um item (procura por campos comuns)
function extractYearFromItem(item) {

  try {
    const raw = item._raw || {};
 
    const candidates = [raw.ano, raw.anoLancamento, raw.ano_lancamento, raw.year, item.year, item.ano, raw.release_year, raw.releaseYear, item.info, raw.info, item.rating];
    for (const c of candidates) {
      if (!c && c !== 0) continue;
      const s = String(c).trim();
      const m = s.match(/(19|20)\d{2}/);
      if (m) return m[0];
      if (/^\d{4}$/.test(s)) return s;
    }

    const text = String((item.title || '') + ' ' + (raw.descricao || raw.description || '')).match(/(19|20)\d{2}/);
    if (text) return text[0];
  } catch (e) {}
  return null;
}

function populateYearFilter() {
  const yearSet = new Set();
  getSearchSource().forEach(it => {
    const y = extractYearFromItem(it);
    if (y) yearSet.add(y);
  });
  const years = Array.from(yearSet).sort((a,b) => Number(b) - Number(a));
  const sel = document.getElementById('filterYear');
  if (!sel) return;
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    sel.appendChild(opt);
  });
}

function applySidebarFilters() {
  const rating = document.getElementById('filterRating') ? document.getElementById('filterRating').value : '';
  const year = document.getElementById('filterYear') ? document.getElementById('filterYear').value : '';
  const resultsContainer = document.getElementById('resultsContainer');
  if (!resultsContainer) return;
  const matches = [];
  getSearchSource().forEach(item => {

    let itemRating = '';
    try { itemRating = String((item._raw && (item._raw.classificacao || item._raw.rating)) || item.classificacao || item.rating || item._raw.rating || '').trim(); } catch(e) { itemRating = ''; }
    const itemYear = extractYearFromItem(item);

    let ok = true;
    if (rating) {
      if (!itemRating || !String(itemRating).toLowerCase().includes(String(rating).toLowerCase())) ok = false;
    }
    if (year) {
      if (!itemYear || String(itemYear) !== String(year)) ok = false;
    }
    if (ok) matches.push(item);
  });

  const originalContent = document.getElementById('originalContent'); if (originalContent) originalContent.style.display = 'none';
  const dbRoot = document.getElementById('dbstreamsColumns'); if (dbRoot) dbRoot.style.display = 'none';

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<p class="no-results">Nenhum título encontrado pelos filtros selecionados.</p>';
    return;
  }

  resultsContainer.innerHTML = '<h3>Resultados por Filtro</h3>';
  const grid = document.createElement('div'); grid.className = 'card-grid';
  matches.forEach(m => { grid.innerHTML += criarCardHTML(m); });
  resultsContainer.appendChild(grid);

  if (!resultsContainer.dataset.clickHandlerAttached) {
    resultsContainer.addEventListener('click', (ev) => {
      const a = ev.target.closest && ev.target.closest('a.card');
      if (a && a.href) window.location.href = a.href;
    });
    resultsContainer.dataset.clickHandlerAttached = '1';
  }
  Array.from(grid.querySelectorAll('a.card')).forEach(a => {
    if (a.dataset.directNavAttached) return;
    a.addEventListener('click', (e) => { e.preventDefault(); window.location.href = a.href; });
    a.dataset.directNavAttached = '1';
  });
}

function clearFilters() {
  const selR = document.getElementById('filterRating'); if (selR) selR.value = '';
  const selY = document.getElementById('filterYear'); if (selY) selY.value = '';
  const resultsContainer = document.getElementById('resultsContainer'); if (resultsContainer) resultsContainer.innerHTML = '';
  const originalContent = document.getElementById('originalContent'); if (originalContent) originalContent.style.display = 'block';
  const dbRoot = document.getElementById('dbstreamsColumns'); if (dbRoot) dbRoot.style.display = 'block';
  document.querySelectorAll('#leftSidebar nav ul li').forEach(li => li.classList.remove('active'));
  activeSidebarGenre = null;
}

function renderGenresColumns(genresMap, targetRoot) {
  targetRoot.innerHTML = '';

  Object.entries(genresMap).forEach(([genreName, items]) => {
    const section = document.createElement('div');
    section.className = 'row';

    const h3 = document.createElement('h3');
    h3.textContent = genreName;
    section.appendChild(h3);

    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    items.forEach(item => {
      carousel.appendChild(criarCardElement(item, false));
    });

    section.appendChild(carousel);
    targetRoot.appendChild(section);
  });
}

async function loadAndInjectDBStreams() {
  try {
    const res = await fetch(DBSTREAMS_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dbstreamsRaw = await res.json();

    const dbstreams = Array.isArray(dbstreamsRaw) ? dbstreamsRaw : (dbstreamsRaw.streams || []);

    if (!Array.isArray(dbstreams) || dbstreams.length === 0) {
      console.info('Nenhum dbstream retornado pelo backend.');
      return;
    }

    const mergedById = {};
    SEARCH_INDEX.forEach(m => mergedById[m.id] = m);
    const mapped = dbstreams.map(mapStreamDBToMovie);
    mapped.forEach(m => { if (!mergedById[m.id]) mergedById[m.id] = m; });

    SEARCH_INDEX = Object.values(mergedById);

    const existingNums = SEARCH_INDEX.map(x => {
      const n = x.numericId;
      if (n === null || n === undefined) return -1;
      return Number(n);
    }).filter(n => !isNaN(n) && n >= 0);
    const maxExisting = existingNums.length ? Math.max(...existingNums) : -1;
    let nextId = Math.max(101, maxExisting + 1);
    SEARCH_INDEX.forEach(item => {
      if (item.numericId === null || item.numericId === undefined || item.numericId === '') {
        item.numericId = String(nextId++);
      } else {
        item.numericId = String(item.numericId);
      }
    });

    const USER_GENRES_TABLE = {
      'Harry Potter e a Pedra Filosofal': 'Fantasia, Aventura',
      'Harry Potter e a Câmara Secreta': 'Fantasia, Aventura',
      'Harry Potter e o Prisioneiro de Azkaban': 'Fantasia, Aventura, Mistério',
      'Harry Potter e o Cálice de Fogo': 'Fantasia, Aventura, Mistério',
      'Harry Potter e a Ordem da Fênix': 'Fantasia, Aventura',
      'Harry Potter e o Enigma do Príncipe': 'Fantasia, Aventura, Mistério',
      'Harry Potter e as Relíquias da Morte: Parte 1': 'Fantasia, Aventura',
      'Harry Potter e as Relíquias da Morte: Parte 2': 'Fantasia, Aventura',
      'O Vingador do Futuro (Total Recall - 1990)': 'Ficção Científica, Ação, Aventura',
      'Star Trek (2009)': 'Ficção Científica, Ação, Aventura',
      'O Jogo de Ender': 'Ficção Científica, Ação, Drama',
      'Minority Report': 'Ficção Científica, Ação, Mistério',
      'O Quinto Elemento': 'Ficção Científica, Ação, Aventura',
      '300': 'Ação, Drama, Fantasia',
      'Kingsman: Serviço Secreto': 'Ação, Comédia, Aventura',
      'Sicario: Terra de Ninguém': 'Ação, Suspense, Drama',
      'Fúria em Alto Mar (Under Siege)': 'Ação, Suspense',
      'Velocidade Máxima (Speed)': 'Ação, Suspense, Aventura',
      'A Cor Púrpura': 'Drama',
      'O Menino do Pijama Listrado': 'Drama',
      'Lion: Uma Jornada para Casa': 'Drama',
      'A Teoria de Tudo': 'Drama, Romance',
      'O Pianista': 'Drama',
      'Prenda-me Se For Capaz': 'Drama, Mistério',
      'O Segredo dos Seus Olhos': 'Mistério, Suspense, Drama',
      'Uma Mente Brilhante': 'Drama, Romance',
      'Na Natureza Selvagem': 'Aventura, Drama',
      'O Artista': 'Romance, Comédia, Drama',
      'Seven: Os Sete Crimes Capitais': 'Mistério, Suspense, Drama',
      'O Suspeito (Prisoners)': 'Suspense, Mistério, Drama',
      'O Grande Truque (The Prestige)': 'Mistério, Suspense, Drama',
      'A Garota com a Tatuagem de Dragão': 'Suspense, Mistério, Drama',
      'Los Angeles: Cidade Proibida (L.A. Confidential)': 'Suspense, Mistério, Drama',
      'Instinto Selvagem': 'Suspense, Mistério',
      'O Fugitivo': 'Ação, Suspense, Drama',
      'O Poderoso Chefão II': 'Drama, Suspense',
      'O Poderoso Chefão III': 'Drama, Suspense',
      'A Fuga das Galinhas': 'Animação, Comédia, Aventura',
      'Toy Story (1995)': 'Animação, Comédia, Aventura',
      'Zootopia': 'Animação, Comédia, Mistério',
      'Valente': 'Animação, Aventura, Fantasia',
      'Monstros S.A.': 'Animação, Comédia, Aventura',
      'Meu Malvado Favorito': 'Animação, Comédia, Aventura',
      'Ace Ventura: Um Detetive Diferente': 'Comédia',
      'Quem Vai Ficar Com Mary?': 'Comédia, Romance',
      'Escola de Rock': 'Comédia',
      'Superbad: É Hoje': 'Comédia',
      'Todo Mundo Quase Morto (Shaun of the Dead)': 'Terror, Comédia, Ação',
      'O Exorcista': 'Terror, Suspense',
      'Alien, O Oitavo Passageiro': 'Ficção Científica, Terror, Suspense',
      'O Chamado (The Ring)': 'Terror, Mistério',
      'O Iluminado (The Shining)': 'Terror, Drama',
      'Corrente do Mal (It Follows)': 'Terror, Mistério',
      'A Entidade (Sinister)': 'Terror, Mistério',
      'A Vila (The Village)': 'Mistério, Drama, Suspense',
      'A Noite dos Mortos-Vivos (1968)': 'Terror, Drama',
      'Demon Slayer: Mugen Train (Filme)': 'Animação, Ação, Fantasia',
      'Your Name. (Filme - Kimi no Na Wa)': 'Animação, Romance, Drama',
      'A Voz do Silêncio (Filme - A Silent Voice)': 'Animação, Drama, Romance',
      'The Sopranos': 'Drama',
      'Succession': 'Drama',
      'Fargo': 'Suspense, Drama, Comédia',
      'The Good Place': 'Comédia, Fantasia',
      'Fleabag': 'Comédia, Drama',
      'Yellowstone': 'Drama',
      'Severance': 'Ficção Científica, Drama, Suspense',
      'Only Murders in the Building': 'Comédia, Mistério',
      'This Is Us': 'Drama, Romance',
      'Mindhunter': 'Suspense, Drama',
      'Big Little Lies': 'Drama, Mistério, Suspense',
      'The Umbrella Academy': 'Ação, Aventura, Fantasia',
      'Homeland': 'Drama, Suspense',
      'Oz (Série HBO)': 'Drama, Suspense',
      'Billions': 'Drama',
      'The Handmaid s Tale': 'Ficção Científica, Drama',
      'The Mandalorian': 'Ficção Científica, Ação, Aventura',
      'Reservation Dogs': 'Comédia, Drama',
      'Better Call Saul': 'Drama, Suspense',
      'Grey s Anatomy': 'Drama, Romance',
      'Seinfeld': 'Comédia',
      'Parks and Recreation': 'Comédia',
      'It: A Coisa - Bem-Vindos a Derry (Série)': 'Terror, Mistério, Suspense',
      'O Senhor dos Anéis: Os Anéis de Poder (Série)': 'Fantasia, Aventura, Drama',
      'Fallout (Série - 2024)': 'Ficção Científica, Ação, Aventura',
      'Erased (Série - Boku dake ga Inai Machi)': 'Animação, Mistério, Suspense',
      'Jojo s Bizarre Adventure': 'Animação, Ação, Aventura, Fantasia',
      'Kino s Journey (Série - Kino no Tabi)': 'Animação, Aventura, Fantasia',
      "Kino's Journey": 'Animação',
      'Kino Journey': 'Animação',
      'Kino no Tabi': 'Animação',
      'Kino s Journey': 'Animação',
      'Dexter': 'Suspense, Mistério',
      'Gente Grande': 'Comédia',
      'Grown Ups': 'Comédia',
      'Made in Abyss (Série)': 'Animação, Aventura, Fantasia',
      'Baccano! (Série)': 'Animação, Ação, Mistério, Fantasia',
      'Psycho-Pass': 'Animação, Ficção Científica, Ação',
      'Terror in Resonance (Série - Zankyou no Terror)': 'Animação, Suspense, Drama',
      'Avatar: A Lenda de Aang': 'Animação, Aventura, Fantasia',
      'She-Ra e as Princesas do Poder (2018)': 'Animação, Aventura, Fantasia',
      'Castlevania (Anime/Série Animada)': 'Animação, Ação, Fantasia',
      'Bob s Burgers': 'Animação, Comédia',
      'Futurama': 'Animação, Comédia, Ficção Científica',
      'O Máskara: A Série Animada': 'Animação, Comédia, Fantasia',
      'A Vaca e o Frango': 'Animação, Comédia',
      'Johnny Bravo': 'Animação, Comédia',
      'As Aventuras de Tintim (Série Animada)': 'Animação, Aventura, Mistério',
    };

    const normalizedUserTable = {};
    Object.entries(USER_GENRES_TABLE).forEach(([k, v]) => {
      const nk = String(k || '').toLowerCase().replace(/\s+/g, ' ').trim();
      normalizedUserTable[nk] = v;
    });

    const genresMap = {};

    mapped.forEach(item => {
      const rawName = (item.title || (item._raw && item._raw.nome) || '').trim();
      const lookupKey = rawName.toLowerCase().replace(/\s+/g, ' ').trim();


      let genresStr = normalizedUserTable[lookupKey] || null;


      if (!genresStr) {
        const alt = Object.keys(normalizedUserTable).find(k => k.includes(lookupKey) || lookupKey.includes(k));
        if (alt) genresStr = normalizedUserTable[alt];
      }


      if (lookupKey.includes('your name') || lookupKey.includes('kimi no na wa')) {
        if (!genresStr) genresStr = 'Romance';
        else if (!genresStr.toLowerCase().includes('romance')) genresStr = `${genresStr}, Romance`;
      }

      let genreList = [];
      if (genresStr) {
        genreList = String(genresStr).split(',').map(g => g.trim()).filter(Boolean);
      } else {

        genreList = String(item.genres || '').split(',').map(g => g.trim()).filter(Boolean);
      }

      if (genreList.length === 0) {

      } else {

        genreList.forEach(genre => {
          if (!genresMap[genre]) genresMap[genre] = [];
          genresMap[genre].push(item);
        });
      }
    });


    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    Object.keys(genresMap).forEach(g => {
      try { shuffleArray(genresMap[g]); } catch (e) {  }
    });


    let dbRoot = document.getElementById('dbstreamsColumns');
    const originalContent = document.getElementById('originalContent');
    if (!dbRoot) {
      dbRoot = document.createElement('div');
      dbRoot.id = 'dbstreamsColumns';

      originalContent.parentNode.insertBefore(dbRoot, originalContent.nextSibling);
    }


    dbRoot.innerHTML = '';

    renderGenresColumns(genresMap, dbRoot);

  } catch (err) {
    console.error('Erro carregando dbstreams:', err);
  }
}


function getSearchSource() {
  return SEARCH_INDEX;
}


function criarCardHTML(filme) {

  const href = `streams.html?id=${filme.id}`;
  const dataNum = filme.numericId ? ` data-num-id="${filme.numericId}"` : '';
  return `
    <a href="${href}" class="card card-vertical" data-id="${filme.id}"${dataNum}>
      <img src="${filme.poster_url}" alt="Pôster de ${filme.title}">
      <div class="card-info">
        <div class="card-genres"><strong>Gêneros:</strong> ${filme.genres || ''}</div>
        <div class="card-cast"><strong>Elenco:</strong> ${filme.cast || ''}</div>
      </div>
    </a>
  `;
}

function filtrarConteudo() {
    const termo = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('resultsContainer');
  const originalContent = document.getElementById('originalContent'); 
  const dbRoot = document.getElementById('dbstreamsColumns');

    resultsContainer.innerHTML = '';
    
    if (termo.length < 1) {
      originalContent.style.display = 'block'; 
      if (dbRoot) dbRoot.style.display = 'block';
        return; 
    }


    originalContent.style.display = 'none';
    if (dbRoot) dbRoot.style.display = 'none';

    const resultadosEncontrados = [];
    const isNumericQuery = /^\d+$/.test(termo);
    if (isNumericQuery) {

      getSearchSource().forEach(filme => {
        if (filme.numericId && String(filme.numericId) === termo) {
          resultadosEncontrados.push(filme);
        } else if (String(filme.id) === termo) {
          resultadosEncontrados.push(filme);
        }
      });
    } else {

      getSearchSource().forEach(filme => {
        const title = (filme.title || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (title.includes(termo)) resultadosEncontrados.push(filme);
      });
    }

    const seen = new Set();
    const uniqueResults = [];
    resultadosEncontrados.forEach(f => {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        uniqueResults.push(f);
      }
    });

    if (resultadosEncontrados.length > 0) {
        resultsContainer.innerHTML = '<h3>Resultados da Pesquisa</h3>';
        
        const resultsCarousel = document.createElement('div');
        resultsCarousel.className = 'card-grid'; 
        
        resultadosEncontrados.forEach(filme => {

          const isNumericQuery = /^\d+$/.test(termo);
          const cardHtml = criarCardHTML(filme);
          resultsCarousel.innerHTML += cardHtml;
        });

        resultsContainer.appendChild(resultsCarousel);

        if (!resultsContainer.dataset.clickHandlerAttached) {
          resultsContainer.addEventListener('click', (ev) => {
            const a = ev.target.closest && ev.target.closest('a.card');
            if (a && a.href) {

              window.location.href = a.href;
            }
          });
          resultsContainer.dataset.clickHandlerAttached = '1';
        }

        Array.from(resultsCarousel.querySelectorAll('a.card')).forEach(a => {
          if (a.dataset.directNavAttached) return;
          a.addEventListener('click', (e) => {

            e.preventDefault();
            window.location.href = a.href;
          });
          a.dataset.directNavAttached = '1';
        });

    } else {
        resultsContainer.innerHTML = '<p class="no-results">Nenhum título encontrado para sua pesquisa.</p>';
    }
}


function configurarBarraDePesquisa() {
    const searchInput = document.getElementById('searchInput');


    let timeout = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(timeout); 
        timeout = setTimeout(filtrarConteudo, 300);
    });


    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            clearTimeout(timeout); 
            filtrarConteudo(); 
        }
    });
}


async function init() {
    document.getElementById("menuBtn").addEventListener("click", () => {
        const sidebar = document.getElementById("leftSidebar");
        sidebar.classList.toggle("show");
    });
    
    configurarBarraDePesquisa(); 


    await loadAndInjectDBStreams();

    setupSidebarHandlers();

    populateYearFilter();
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (applyBtn) applyBtn.addEventListener('click', (e) => { e.preventDefault(); applySidebarFilters(); });
    if (clearBtn) clearBtn.addEventListener('click', (e) => { e.preventDefault(); clearFilters(); });

    const ratingSel = document.getElementById('filterRating'); if (ratingSel) ratingSel.addEventListener('change', () => applySidebarFilters());
    const yearSel = document.getElementById('filterYear'); if (yearSel) yearSel.addEventListener('change', () => applySidebarFilters());
  }

  document.addEventListener("DOMContentLoaded", init);