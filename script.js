// ---------- MOTOR REAL: Netlify Function + OpenAI ----------
// El generador principal (Crear contenido / Crear 5 ideas / Crear semana completa)
// llama a esta función, que a su vez llama a /.netlify/functions/generate-content.
// La API key de OpenAI vive solo en el servidor (Netlify), nunca en este archivo.
async function fetchAIContent(params, mode){
  const resp = await fetch('/.netlify/functions/generate-content', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({...params, mode})
  });
  let data;
  try{ data = await resp.json(); }catch(e){ data = {}; }
  if(!resp.ok){
    throw new Error(data.error || 'No se pudo generar el contenido. Inténtalo de nuevo.');
  }
  return data.items;
}

// ---------- MOTOR LOCAL (solo para la vista previa del Calendario) ----------
function generateContent(params){
  const {tipo, publico, desc, objetivo, plataforma, tipoContenido, tono} = params;
  const negocio = tipo || 'tu negocio';
  const pub = publico || 'tu público ideal';

  const hooksBase = {
    'Conseguir clientes': [`¿Sabías que ${negocio.toLowerCase()} puede resolver esto hoy mismo?`, `Esto es lo que ${pub} necesita saber antes de elegir`],
    'Vender': [`Lo que nadie te cuenta antes de comprar en un ${negocio.toLowerCase()}`, `La razón por la que esto se agota siempre`],
    'Conseguir seguidores': [`Esto no lo vas a ver en cualquier ${negocio.toLowerCase()}`, `Sigue leyendo si esto te representa`],
    'Generar confianza': [`Así trabajamos cuando nadie está mirando`, `La verdad detrás de cada detalle`],
    'Dar a conocer la marca': [`Así nació esta forma de hacer las cosas`, `No somos un ${negocio.toLowerCase()} más`],
    'Fidelizar clientes': [`Gracias por seguir eligiéndonos`, `Esto es para quienes ya forman parte de esto`]
  };
  const cuerpo = {
    Profesional:'Con rigor y claridad, mostramos por qué cada detalle importa.',
    Cercano:'Como si te lo contara alguien de confianza, sin rodeos.',
    Divertido:'Con un guiño, sin perder de vista lo importante.',
    Elegante:'Con cuidado en cada palabra, sin excesos.',
    Directo:'Sin vueltas: esto es lo que hay y por qué te interesa.',
    Inspirador:'Una idea que invita a mirar las cosas de otra forma.',
    Premium:'Cada palabra pensada para transmitir nivel y confianza.'
  };
  const ctaBase = {
    'Conseguir clientes':'Escríbenos y lo hablamos.',
    'Vender':'Consíguelo antes de que se acabe.',
    'Conseguir seguidores':'Síguenos para no perderte lo que viene.',
    'Generar confianza':'Conócenos un poco más.',
    'Dar a conocer la marca':'Descubre nuestra historia.',
    'Fidelizar clientes':'Sigue cerca, esto es solo el principio.'
  };
  const visualIdeas = {
    Post:'Fotografía cuidada del producto o servicio con luz natural, texto superpuesto breve.',
    Carrusel:'Secuencia de 4-6 tarjetas: problema, contexto, solución, cierre con llamada a la acción.',
    Reel:'Plano corto inicial que capte la atención en 2 segundos, ritmo ágil, texto en pantalla con la idea clave.',
    Historia:'Encuesta o pregunta interactiva con fondo de marca, texto breve y directo.',
    Anuncio:'Imagen o vídeo con beneficio principal en el primer segundo y CTA visible.',
    'Idea de contenido':'Formato flexible: elige imagen, vídeo corto o texto según lo que mejor cuente la idea.'
  };
  const hooks = hooksBase[objetivo] || hooksBase['Conseguir clientes'];
  const hook = hooks[Math.floor(Math.random()*hooks.length)];
  const base = desc ? desc.trim().replace(/\.$/,'') : `lo que hace especial a ${negocio.toLowerCase()}`;
  const copy = `${hook}. ${cuerpo[tono]||cuerpo.Profesional} Hablamos de ${base}, pensado para ${pub}. ${ctaBase[objetivo]||ctaBase['Conseguir clientes']}`;
  const tag1 = ('#'+negocio.replace(/\s+/g,'')).toLowerCase();
  const tag2 = ('#'+(objetivo||'contenido').split(' ')[0]).toLowerCase();
  const hashtags = `${tag1} ${tag2} #${plataforma.toLowerCase()} #ciceronias #contenidoconestrategia`;
  const idea = `${tipoContenido} para ${plataforma} sobre ${base}, con tono ${(tono||'').toLowerCase()} orientado a ${(objetivo||'').toLowerCase()}.`;

  return {idea, copy, hook, cta: ctaBase[objetivo]||ctaBase['Conseguir clientes'], hashtags, visual: visualIdeas[tipoContenido]||visualIdeas.Post};
}
// ---------- FIN DEL MOTOR LOCAL ----------

function activeChip(id){ return document.querySelector('#'+id+' .chip.active').dataset.v; }
document.querySelectorAll('.chipset').forEach(set=>{
  set.addEventListener('click', e=>{
    if(!e.target.classList.contains('chip')) return;
    set.querySelectorAll('.chip').forEach(c=>{ c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
    e.target.classList.add('active');
    e.target.setAttribute('aria-pressed','true');
  });
});

function currentParams(){
  return {
    tipo: document.getElementById('f-tipo').value,
    publico: document.getElementById('f-publico').value,
    desc: document.getElementById('f-desc').value,
    objetivo: activeChip('f-objetivo'),
    plataforma: activeChip('f-plataforma'),
    tipoContenido: activeChip('f-tipocontenido'),
    tono: activeChip('f-tono')
  };
}

function cardText(c){
  return `${c.hook}\n\n${c.copy}\n\nCTA: ${c.cta}\n${c.hashtags}\nIdea visual: ${c.visual}`;
}
function cardHTML(c, idx, label){
  return `<div class="card" data-idx="${idx}">
    ${label ? `<h4 style="color:var(--cream-dim)">${label}</h4>` : ''}
    <h4 style="margin-top:${label?12:0}px">Hook</h4><p class="hook">${c.hook}</p>
    <h4 style="margin-top:18px">Idea</h4><p>${c.idea}</p>
    <h4 style="margin-top:18px">Copy</h4><p>${c.copy}</p>
    <h4 style="margin-top:18px">CTA</h4><p>${c.cta}</p>
    <h4 style="margin-top:18px">Hashtags</h4><p class="hashtags">${c.hashtags}</p>
    <h4 style="margin-top:18px">Idea visual</h4><p>${c.visual}</p>
    <div class="card-actions">
      <button class="smallbtn" onclick="copyCard(${idx})">Copiar</button>
      <button class="smallbtn" onclick="regenCard(${idx})">Regenerar</button>
      <button class="smallbtn" onclick="saveCard(${idx})">Guardar</button>
    </div>
  </div>`;
}
function savedCardHTML(c, idx){
  return `<div class="card">
    <h4>Hook</h4><p class="hook">${c.hook}</p>
    <h4 style="margin-top:18px">Idea</h4><p>${c.idea}</p>
    <h4 style="margin-top:18px">Copy</h4><p>${c.copy}</p>
    <h4 style="margin-top:18px">CTA</h4><p>${c.cta}</p>
    <h4 style="margin-top:18px">Hashtags</h4><p class="hashtags">${c.hashtags}</p>
    <h4 style="margin-top:18px">Idea visual</h4><p>${c.visual}</p>
    <div class="card-actions">
      <button class="smallbtn" onclick="copySaved(${idx})">Copiar</button>
      <button class="smallbtn" onclick="deleteSaved(${idx})">Eliminar</button>
    </div>
  </div>`;
}

let lastCards = [];

function renderResults(items){
  lastCards = items;
  document.getElementById('results').innerHTML = items.map((c,idx)=>cardHTML(c, idx, c.dia)).join('');
  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
}
function showLoading(msg){
  document.getElementById('results').innerHTML =
    `<div class="card loading-card"><div class="spinner" aria-hidden="true"></div><p>${msg||'Generando contenido con IA…'}</p></div>`;
  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
}
function showGenError(message, retryFn){
  document.getElementById('results').innerHTML =
    `<div class="card error-card"><p>${message}</p>
      <div class="card-actions"><button class="smallbtn" id="retry-gen">Reintentar</button></div>
    </div>`;
  document.getElementById('retry-gen').addEventListener('click', retryFn);
}

async function handleGenerate(n){
  const p = currentParams();
  const mode = n === 5 ? 'ideas5' : 'single';
  showLoading();
  try{
    const items = await fetchAIContent(p, mode);
    renderResults(items);
  }catch(e){
    showGenError(e.message, ()=>handleGenerate(n));
  }
}

async function regenCard(i){
  const old = lastCards[i];
  const p = currentParams();
  const overrideP = {...p, plataforma: old.plataforma || p.plataforma, tipoContenido: old.tipoContenido || p.tipoContenido};
  const cardEl = document.querySelectorAll('#results .card')[i];
  const prevHTML = cardEl.outerHTML;
  cardEl.outerHTML = `<div class="card loading-card"><div class="spinner" aria-hidden="true"></div><p>Regenerando…</p></div>`;
  try{
    const items = await fetchAIContent(overrideP, 'single');
    const newItem = items[0];
    newItem.dia = old.dia || '';
    lastCards[i] = newItem;
    document.querySelectorAll('#results .card')[i].outerHTML = cardHTML(newItem, i, newItem.dia);
  }catch(e){
    document.querySelectorAll('#results .card')[i].outerHTML = prevHTML;
    showToast('No se pudo regenerar');
  }
}
function copyCard(i){
  navigator.clipboard.writeText(cardText(lastCards[i])).then(()=>showToast('Copiado')).catch(()=>showToast('No se pudo copiar'));
}
const SAVE_KEY = 'ciceronias_saved';
function getSaved(){
  try{ return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); }catch(e){ return []; }
}
function saveCard(i){
  try{
    const existing = getSaved();
    existing.unshift(lastCards[i]);
    localStorage.setItem(SAVE_KEY, JSON.stringify(existing));
    showToast('Guardado');
    renderSaved();
  }catch(e){ showToast('No se pudo guardar'); }
}
function renderSaved(){
  const list = getSaved();
  const wrap = document.getElementById('saved-list');
  const empty = document.getElementById('saved-empty');
  if(!list.length){ wrap.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  wrap.innerHTML = list.map((c,i)=>savedCardHTML(c,i)).join('');
}
function copySaved(i){
  navigator.clipboard.writeText(cardText(getSaved()[i])).then(()=>showToast('Copiado')).catch(()=>showToast('No se pudo copiar'));
}
function deleteSaved(i){
  const list = getSaved();
  list.splice(i,1);
  localStorage.setItem(SAVE_KEY, JSON.stringify(list));
  renderSaved();
  showToast('Eliminado');
}
async function crearSemana(){
  const p = currentParams();
  showLoading('Generando la semana completa con IA…');
  try{
    const items = await fetchAIContent(p, 'semana');
    renderResults(items);
  }catch(e){
    showGenError(e.message, crearSemana);
  }
}
document.addEventListener('DOMContentLoaded', renderSaved);
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}
function goToCalendar(){ document.getElementById('calendario').scrollIntoView({behavior:'smooth'}); }

// ---------- CALENDARIO ----------
const platforms = ['Instagram','TikTok','Facebook','LinkedIn'];
const types = ['Post','Carrusel','Reel','Historia','Idea de contenido'];
let calendarData = [];
function buildCalendar(days){
  const p = currentParams();
  calendarData = [];
  const today = new Date();
  for(let i=0;i<days;i++){
    const d = new Date(today); d.setDate(today.getDate()+i);
    const plat = platforms[i % platforms.length];
    const tc = types[i % types.length];
    const c = generateContent({...p, plataforma:plat, tipoContenido:tc});
    calendarData.push({date:d, plat, tc, idea:c.idea, status:'Idea'});
  }
  renderCalendar();
}
function renderCalendar(){
  document.getElementById('cal-grid').innerHTML = calendarData.map((d,i)=>`
    <div class="day">
      <div class="d">${d.date.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}</div>
      <div class="plat">${d.plat} · ${d.tc}</div>
      <div class="idea">${d.idea}</div>
      <span class="status ${d.status}" onclick="cycleStatus(${i})">${d.status}</span>
      <div style="margin-top:10px"><button class="smallbtn" onclick="copyDay(${i})">Copiar</button></div>
    </div>`).join('');
}
function cycleStatus(i){
  const order = ['Idea','Preparado','Publicado'];
  const next = order[(order.indexOf(calendarData[i].status)+1)%order.length];
  calendarData[i].status = next;
  renderCalendar();
}
function copyDay(i){
  const d = calendarData[i];
  navigator.clipboard.writeText(`${d.plat} · ${d.tc}\n${d.idea}`).then(()=>showToast('Copiado')).catch(()=>showToast('No se pudo copiar'));
}
