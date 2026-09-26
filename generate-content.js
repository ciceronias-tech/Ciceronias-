// netlify/functions/generate-content.js
// Genera contenido para Ciceronias usando la API de OpenAI.
// La clave se lee EXCLUSIVAMENTE desde process.env.OPENAI_API_KEY (variable de entorno de Netlify).
// Esta función corre en el servidor: la clave nunca llega al navegador.

const PLATFORMS_CYCLE = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn'];
const TYPES_CYCLE = ['Post', 'Carrusel', 'Reel', 'Historia', 'Idea de contenido'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const SYSTEM_PROMPT = `Eres el motor de generación de contenido de Ciceronias, un estudio de comunicación y marketing inspirado en la retórica clásica. Actúas como un estratega profesional de contenido y comunicación para negocios reales.

Reglas estrictas que debes cumplir siempre:
- Escribe en español de España, con redacción natural, profesional y variada.
- Adapta el contenido de verdad al tipo de negocio, a la descripción proporcionada y al público objetivo. No generes textos genéricos que podrían servir para cualquier negocio.
- Respeta el objetivo, la plataforma, el formato y el tono indicados en cada petición.
- No inventes datos concretos del negocio (nombres propios, cifras, direcciones, premios, testimonios) que no te hayan dado.
- Evita clichés y frases hechas de marketing vacías ("no te lo puedes perder", "el mejor del mercado", etc.).
- El CTA debe ser coherente con el objetivo indicado.
- En Instagram: contenido atractivo, fácil de leer y publicable tal cual.
- En TikTok o Reels: incluye un gancho claro en las primeras líneas y una estructura pensada para vídeo corto (qué se ve y se dice en cada momento).
- En LinkedIn: tono profesional, aportando valor real, sin lenguaje comercial excesivo.
- En anuncios: estructura beneficio + propuesta + llamada a la acción.

Debes responder ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, con esta forma exacta:
{"items":[{"dia":"","plataforma":"","tipoContenido":"","hook":"","idea":"","copy":"","cta":"","hashtags":"","visual":""}]}
El campo "dia" debe ir vacío ("") si la petición no especifica días concretos.`;

function buildItemsSpec(mode, plataforma, tipoContenido) {
  if (mode === 'semana') {
    return DIAS.map((dia, i) => ({
      dia,
      plataforma: PLATFORMS_CYCLE[i % PLATFORMS_CYCLE.length],
      tipoContenido: TYPES_CYCLE[i % TYPES_CYCLE.length]
    }));
  }
  const n = mode === 'ideas5' ? 5 : 1;
  return Array.from({ length: n }, () => ({ dia: '', plataforma, tipoContenido }));
}

function buildUserPrompt(data, itemsSpec) {
  const { tipo, desc, publico, objetivo, tono } = data;
  const lista = itemsSpec
    .map((it, i) => {
      const diaTxt = it.dia ? `Día: ${it.dia}. ` : '';
      return `${i + 1}. ${diaTxt}Plataforma: ${it.plataforma}. Formato: ${it.tipoContenido}.`;
    })
    .join('\n');

  return `Datos del negocio:
- Tipo de negocio: ${tipo}
- Descripción del negocio: ${desc && desc.trim() ? desc.trim() : 'no proporcionada, no inventes detalles concretos'}
- Público objetivo: ${publico && publico.trim() ? publico.trim() : 'no especificado, usa un público general acorde al tipo de negocio'}
- Objetivo de la comunicación: ${objetivo}
- Tono deseado: ${tono}

Genera exactamente ${itemsSpec.length} pieza(s) de contenido distintas entre sí, una por cada combinación siguiente (respeta el orden y, si se indica día, inclúyelo tal cual en el campo "dia"):
${lista}

Responde solo con el JSON indicado en las instrucciones del sistema.`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido.' })
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Los datos enviados no son válidos.' }) };
  }

  const { tipo, publico, desc, objetivo, plataforma, tipoContenido, tono, mode } = data;

  if (!tipo || !objetivo || !plataforma || !tipoContenido || !tono) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Faltan campos obligatorios del formulario.' })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY no está configurada en las variables de entorno de Netlify.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'El generador no está disponible ahora mismo. Inténtalo más tarde.' })
    };
  }

  const itemsSpec = buildItemsSpec(mode, plataforma, tipoContenido);
  const userPrompt = buildUserPrompt({ tipo, publico, desc, objetivo, tono }, itemsSpec);
  const maxTokens = Math.min(4000, 350 + itemsSpec.length * 260);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.85,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de OpenAI:', response.status, errText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'No se pudo generar el contenido en este momento. Inténtalo de nuevo en unos segundos.' })
      };
    }

    const completion = await response.json();
    const raw = completion.choices && completion.choices[0] && completion.choices[0].message
      ? completion.choices[0].message.content
      : null;

    if (!raw) {
      return { statusCode: 502, body: JSON.stringify({ error: 'El generador no devolvió contenido.' }) };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('No se pudo interpretar la respuesta de OpenAI:', raw);
      return { statusCode: 502, body: JSON.stringify({ error: 'No se pudo interpretar el contenido generado.' }) };
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    if (!items.length) {
      return { statusCode: 502, body: JSON.stringify({ error: 'El generador no devolvió ningún contenido válido.' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    };
  } catch (e) {
    console.error('Error al llamar a OpenAI:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al conectar con el generador de contenido.' })
    };
  }
};
