import { pool } from "../server.js"

// Obtener todas las intenciones
export async function getIntents() {
  const result = await pool.query("SELECT * FROM intents ORDER BY updated_at DESC")
  return result.rows
}

// Crear intención
export async function createIntent({ title, patterns, responses, faq }) {
  const result = await pool.query(
    `INSERT INTO intents (title, patterns, responses, faq, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [title, patterns, responses, faq]
  )
  return result.rows[0]
}

// Actualizar intención
export async function updateIntent(id, { title, patterns, responses, faq }) {
  const result = await pool.query(
    `UPDATE intents
     SET title=$1, patterns=$2, responses=$3, faq=$4, updated_at=NOW()
     WHERE id=$5
     RETURNING *`,
    [title, patterns, responses, faq, id]
  )
  return result.rows[0]
}

// Eliminar intención
export async function deleteIntent(id) {
  await pool.query("DELETE FROM intents WHERE id=$1", [id])
  return { ok: true }
}

// Subir archivos asociados a una intención
export async function addFilesToIntent(id, files) {
  const result = await pool.query(
    `UPDATE intents
     SET files = files || $1::jsonb, updated_at=NOW()
     WHERE id=$2
     RETURNING *`,
    [JSON.stringify(files), id]
  )
  return result.rows[0]
}

// Eliminar archivo de una intención
export async function removeFileFromIntent(id, filePath) {
  const result = await pool.query(
    `UPDATE intents
     SET files = (files - $1), updated_at=NOW()
     WHERE id=$2
     RETURNING *`,
    [filePath, id]
  )
  return result.rows[0]
}

//Conteo de las intenciones
export async function incrementIntentUsage(id) {
  await pool.query(
    "UPDATE intents SET usage_count = usage_count + 1 WHERE id = $1",
    [id]
  );
}

