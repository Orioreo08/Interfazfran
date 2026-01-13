// src/chatbotLogic.js

export const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim()
}

export const staticIntents = [
  {
    tag: "Saludo",
    keywords: ["hola", "saludos", "que tal", "buenos dias", "buenas tardes", "buenas noches", "hey"],
    responses: ["¡Hola! Soy Themis, tu asistente virtual. ¿En qué puedo ayudarte con tus trámites hoy?"],
    file: null
  },
  {
    tag: "Despedida",
    keywords: ["adios", "chao", "hasta luego", "nos vemos", "bye", "finalizar"],
    responses: ["¡Hasta luego! Quedo a tu disposición si necesitas algo más. ¡Que tengas un excelente día!"],
    file: null
  },
  {
    tag: "Agradecimiento",
    keywords: ["gracias", "muchas gracias", "agradecido", "gracias por la ayuda", "perfecto gracias"],
    responses: ["¡De nada! Es un placer ayudarte. ¿Hay algo más en lo que pueda asistirle?"],
    file: null
  },
  {
    tag: "Estado",
    keywords: ["como estas", "como te va", "todo bien", "que tal todo"],
    responses: ["¡Todo muy bien por aquí! Trabajando para darte la mejor información. ¿Y tú, en qué necesitas ayuda?"],
    file: null
  },
  {
    tag: "Identidad",
    keywords: ["quien eres", "que eres", "tu nombre", "presentate"],
    responses: ["Soy Themis, el asistente inteligente de esta institución. Mi objetivo es facilitarte información sobre trámites y servicios."],
    file: null
  },
{
    tag: "Horario_Bot",
    keywords: ["estas disponible", "estas ahi", "hasta que hora atiendes", "estas activo"],
    responses: ["¡Sí! Estoy disponible las 24 horas del día para resolver tus dudas. ¿En qué puedo apoyarte en este momento?"],
    file: null
  },
  {
    tag: "Confirmacion",
    keywords: ["entiendo", "comprendo", "ok", "vale", "entendido", "listo"],
    responses: ["Excelente. Me alegra que la información te sea útil. ¿Hay algún otro trámite o duda que quieras consultar?"],
    file: null
  },
  {
    tag: "Ayuda_General",
    keywords: ["ayuda", "necesito ayuda", "auxilio", "ayudame", "no se que hacer"],
    responses: ["Estoy aquí para guiarte. Puedes preguntarme sobre inscripciones, requisitos, trámites legales o documentos institucionales. ¿Por dónde te gustaría empezar?"],
    file: null
  },
  {
    tag: "Elogio",
    keywords: ["eres genial", "buen bot", "buen trabajo", "me gusta como atiendes", "inteligente"],
    responses: ["¡Muchas gracias por tus palabras! Mi objetivo es brindarte la mejor atención posible. ¿En qué más puedo servirte?"],
    file: null
  },
  {
    tag: "Filtro_Respeto",
    keywords: ["tonto", "idiota", "estupido", "insulto", "groseria"], // Añade las palabras que prefieras filtrar
    responses: ["Mantengamos un lenguaje respetuoso para poder brindarte la mejor asistencia posible. ¿Tienes alguna duda institucional en la que pueda ayudarte?"],
    file: null
  },
  {
    tag: "Buenos_Deseos",
    keywords: ["que tengas buen dia", "feliz dia", "feliz tarde", "feliz noche", "igualmente", "suerte"],
    responses: ["¡Muchas gracias! Igualmente para ti. Estaré aquí si surge cualquier otra duda institucional."],
    file: null
  },
  {
    tag: "Capacidades",
    keywords: ["que puedes hacer", "en que me ayudas", "cuales son tus funciones", "que opciones hay"],
    responses: ["Puedo facilitarte información sobre requisitos, guiarte en trámites de inscripción, explicarte servicios institucionales y entregarte documentos descargables. ¿Qué necesitas consultar?"],
    file: null
  },
  {
    tag: "Disculpas",
    keywords: ["perdon", "disculpa", "me equivoque", "lo siento", "error mio"],
    responses: ["¡No te preocupes! No hay ningún problema. ¿En qué podemos retomar tu consulta?"],
    file: null
  },
  {
    tag: "Humano_o_Bot",
    keywords: ["eres una persona", "eres humano", "eres real", "hablo con alguien"],
    responses: ["Soy Themis, un asistente de inteligencia artificial diseñado para atenderte de forma inmediata. Si necesitas atención humana presencial, puedo indicarte los horarios de oficina."],
    file: null
  },
  {
    tag: "Prueba",
    keywords: ["test", "probando", "hola hola", "123", "prueba"],
    responses: ["¡Prueba superada! El sistema funciona correctamente. ¿En qué puedo ayudarte con tus gestiones hoy?"],
    file: null
  },
  {
    tag: "Atencion_Humana",
    keywords: [
      "hablar con alguien", 
      "secretario", 
      "secretaria", 
      "persona real", 
      "atencion humana", 
      "oficina", 
      "hablar con un humano",
      "autoridad",
      "decanato"
    ],
    responses: [
      "Para una atención personalizada o trámites que requieran la intervención de un funcionario, debe dirigirse presencialmente a las oficinas de la Facultad de Derecho. Allí, el personal de secretaría podrá asistirle formalmente en su gestión. ¿Desea que le ayude con alguna otra información general?"
    ],
    file: null
  }
]

// --- Obtener intenciones dinámicas desde el backend ---
async function getDynamicIntents() {
  try {
    const token = localStorage.getItem("token")
    const res = await fetch("http://localhost:4000/intents", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }
    })
    const data = await res.json()

    // Determinamos si la data es un array o viene dentro de un objeto
    const intentsArray = Array.isArray(data) ? data : (data.intents || data.rows || [])

    // Mapeamos las intenciones incluyendo el ID para el contador
    const adapted = intentsArray.map((intent) => ({
      id: intent.id, // 👈 Importante para el sistema de preguntas frecuentes
      tag: intent.title,
      keywords: (intent.patterns || []).map(p => normalizeText(p)),
      responses: intent.responses?.length
        ? intent.responses
        : ["Respuesta no definida"],
      file: intent.files?.[0]?.path || null
    }))

    return adapted
  } catch (err) {
    console.error("❌ Error cargando intenciones dinámicas:", err)
    return []
  }
}

// --- Función para generar respuesta del bot ---
export async function getBotResponse(userMessage) {
  const normalized = normalizeText(userMessage)

  const dynamicIntents = await getDynamicIntents()
  const allIntents = [...staticIntents, ...dynamicIntents]

  for (let intent of allIntents) {
    for (let keyword of intent.keywords) {
      if (normalized.includes(keyword)) {
        
        // 🔥 Si la intención tiene un ID (es dinámica), avisamos al backend para el contador
        if (intent.id) {
          fetch(`http://localhost:4000/intents/${intent.id}/use`, { 
            method: "POST" 
          }).catch(err => console.error("No se pudo registrar el uso:", err))
        }

        // Unimos todas las respuestas en un solo bloque de texto institucional
        const response = intent.responses.join(" ")
        return { text: response, file: intent.file || null }
      }
    }
  }

  return { text: "Lo siento, no entendí eso. ¿Puedes reformular tu pregunta?", file: null }
}