"use client"

import { useEffect, useState } from "react"

const INTENTS_API = "http://localhost:4000"
const POSTGREST_API = "http://localhost:3001"

/** Cabeceras con Authorization si hay token. */
function authHeaders(token: string | null, extra: Record<string, string> = {}) {
  const base: Record<string, string> = { ...extra }
  if (token) base.Authorization = `Bearer ${token}`
  return base
}

interface Intent {
  id?: string
  title: string
  patterns: string[]
  responses: string[]
  files: { filename: string; path: string }[]
  faq: boolean
  updatedAt?: string
}

interface User {
  id?: string
  username: string
  password?: string
  role?: string
  lastLogin?: string
}

interface FormState {
  id?: string
  title: string
  patternsRaw: string
  patterns: string[]
  responsesRaw: string
  responses: string[]
  files: { filename: string; path: string }[]
  faq: boolean
  updatedAt?: string
}

export default function AdminIntentsPage() {
  // Estados de intenciones
const [intents, setIntents] = useState<Intent[]>([])

// 👇 añadimos patternsRaw y responsesRaw para guardar el texto plano
const [form, setForm] = useState<FormState>({
  id: undefined,
  title: "",
  patternsRaw: "",
  patterns: [],
  responsesRaw: "",
  responses: [],
  files: [],
  faq: false,
  updatedAt: undefined
})


const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null)


  // Estados globales
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Token como estado
  const [token, setToken] = useState<string | null>(null)

  // Estados de usuarios
  const [users, setUsers] = useState<User[]>([])
  const [userForm, setUserForm] = useState<User>({
    username: "",
    password: "",
    role: ""
  })

  // Cargar token al montar
  useEffect(() => {
    const existing = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (existing) {
      setToken(existing)
    } else {
      const envToken = process.env.NEXT_PUBLIC_JWT_TOKEN || ""
      if (envToken) {
        localStorage.setItem("token", envToken)
        setToken(envToken)
      }
    }
  }, [])

  // Carga inicial de datos
  useEffect(() => {
    if (token === null) return // aún cargando
    if (!token) {
      window.location.href = "/login"
      return
    }
    ;(async () => {
      try {
        const resIntents = await fetch(`${INTENTS_API}/intents`, {
          headers: authHeaders(token)
        })
        if (!resIntents.ok) throw new Error(`Intents ${resIntents.status}`)
        const dataIntents = await resIntents.json()
        if (Array.isArray(dataIntents)) setIntents(dataIntents)

        await refreshUsers()
      } catch (err) {
        console.error("Error cargando datos:", err)
        setError("No se pudo conectar con el servidor")
      }
    })()
  }, [token])

  // Utilidades intenciones
  const resetForm = () => {
  // 1. Limpiamos el objeto principal del formulario
  // Incluimos patternsRaw y responsesRaw para que los inputs de texto se vacíen
  setForm({ 
    id: undefined, // Importante para que el panel sepa que es una NUEVA intención
    title: "", 
    patterns: [], 
    patternsRaw: "", 
    responses: [], 
    responsesRaw: "", 
    files: [], 
    faq: false 
  });

  // 2. Limpiamos los archivos que estaban en espera de ser subidos
  setFilesToUpload(null);

  // 3. Limpiamos visualmente el selector de archivos (el botón gris de Windows)
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.value = "";
  }
};

  const refreshList = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${INTENTS_API}/intents`, {
        headers: authHeaders(token)
      })
      if (!res.ok) throw new Error(`List ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data)) setIntents(data)
    } catch {
      setError("No se pudo actualizar el listado")
    } finally {
      setLoading(false)
    }
  }

  const saveIntent = async () => {
    if (!token) return
    setError("")
    setLoading(true)
    try {
      const method = form.id ? "PUT" : "POST"
      const url = form.id
        ? `${INTENTS_API}/intents/${form.id}`
        : `${INTENTS_API}/intents`

      const res = await fetch(url, {
        method,
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: form.title,
          patterns: form.patterns,
          responses: form.responses,
          faq: form.faq
        })
      })
      if (!res.ok) throw new Error(`Save intent ${res.status}`)
      const data = await res.json()

      const intentId = data.id || form.id
      if (filesToUpload && intentId) {
        const fd = new FormData()
        Array.from(filesToUpload).forEach((f) => fd.append("files", f))
        const resFiles = await fetch(`${INTENTS_API}/intents/${intentId}/files`, {
          method: "POST",
          headers: authHeaders(token),
          body: fd
        })
        if (!resFiles.ok) throw new Error(`Files ${resFiles.status}`)
      }

      await refreshList()
      resetForm()
      setFilesToUpload(null)
    } catch {
      setError("No se pudo guardar la intención")
    } finally {
      setLoading(false)
    }
  }

const editIntent = (i: Intent) => {
  setForm({
    title: i.title,
    patternsRaw: i.patterns.join(", "),
    patterns: i.patterns || [],
    responsesRaw: i.responses.join(", "),
    responses: i.responses || [],
    files: i.files || [],
    faq: !!i.faq
  })
  setFilesToUpload(null)
}


  const deleteIntent = async (id?: string) => {
    if (!token || !id) return
    setLoading(true)
    try {
      const res = await fetch(`${INTENTS_API}/intents/${id}`, {
        method: "DELETE",
        headers: authHeaders(token)
      })
      if (!res.ok) throw new Error(`Delete intent ${res.status}`)
      await refreshList()
      if (form.id === id) resetForm()
    } catch {
      setError("No se pudo eliminar la intención")
    } finally {
      setLoading(false)
    }
  }

  const removeFile = async (id?: string, path?: string) => {
    if (!token || !id || !path) return
    setLoading(true)
    try {
      const res = await fetch(`${INTENTS_API}/intents/${id}/files`, {
        method: "DELETE",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ path })
      })
      if (!res.ok) throw new Error(`Remove file ${res.status}`)
      await refreshList()
      const found = intents.find((x) => x.id === id)
      if (found) {
        setForm((prev) => ({
          ...prev,
          files: (found.files || []).filter((f) => f.path !== path)
        }))
      }
    } catch {
      setError("No se pudo eliminar el archivo")
    } finally {
      setLoading(false)
    }
  }

  // CRUD usuarios
  const USERS_API = "http://localhost:4000/users"

const refreshUsers = async () => {
  if (!token) return
  try {
    const res = await fetch(USERS_API, {
      headers: authHeaders(token)
    })
    if (!res.ok) throw new Error(`Users ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      setUsers(data)
    }
  } catch {
    setError("No se pudo cargar usuarios")
  }
}

const saveUser = async () => {
  if (!token) return
  setError("")
  setLoading(true)
  try {
    const isUpdate = !!userForm.id
    const method = isUpdate ? "PATCH" : "POST"
    const url = isUpdate ? `${USERS_API}/${userForm.id}` : USERS_API

    const res = await fetch(url, {
      method,
      headers: authHeaders(token, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        username: userForm.username,
        password: userForm.password,
        role: userForm.role
      })
    })

    if (!res.ok) throw new Error(`Guardar usuario: ${res.status}`)
    const returned = await res.json()

    if (isUpdate) {
      setUsers((prev) =>
        prev.map((u) => (u.id === returned.id ? returned : u))
      )
    } else {
      setUsers((prev) => [returned, ...prev])
    }

    setUserForm({ username: "", password: "", role: "" })
  } catch {
    setError("No se pudo guardar usuario")
  } finally {
    setLoading(false)
  }
}

const editUser = (u: User) => {
  setUserForm({ id: u.id, username: u.username, role: u.role || "" })
}

const deleteUser = async (id?: string) => {
  if (!token || !id) return
  setLoading(true)
  try {
    const res = await fetch(`${USERS_API}/${id}`, {
      method: "DELETE",
      headers: authHeaders(token)
    })
    if (!res.ok) throw new Error(`Delete user ${res.status}`)
    setUsers((prev) => prev.filter((u) => u.id !== id))
  } catch {
    setError("No se pudo eliminar usuario")
  } finally {
    setLoading(false)
  }
}

const resetUserForm = () => {
  setUserForm({ username: "", password: "", role: "" })
}

// Función de logout dentro de AdminIntentsPage
// Dentro de tu componente AdminIntentsPage
const logout = () => {
  localStorage.removeItem("token")   // borra el token
  window.location.href = "/login"    // redirige al login
}

return (
  <div className="min-h-screen bg-[#F5F5DC] p-6">
    <div className="max-w-6xl mx-auto">

      {/* Cabecera con título y botón salir */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#3a161a]">
          Panel de administración
        </h1>
        <button
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          onClick={logout}
        >
          Salir
        </button>
      </div>

      {/* Mensajes globales */}
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid: Formulario y Listado de Intenciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Izquierda: Formulario de Intención */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-5 space-y-4">
            <h2 className="text-lg font-semibold">Intención</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Título</label>
              <input
                className="w-full border rounded p-2"
                placeholder="Título"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
  <label className="text-sm font-medium">Patrones (separados por coma)</label>
  <textarea
    className="w-full border rounded p-2"
    placeholder="hola, como estas?, bienvenido"
    value={form.patternsRaw}   // mostramos el texto plano
    onChange={(e) =>
      setForm({
        ...form,
        patternsRaw: e.target.value, // guarda el texto tal cual
        patterns: e.target.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) // crea el arreglo
      })
    }
  />
</div>

<div className="flex flex-col gap-1">
  <label className="text-sm font-medium">Respuestas (separadas por coma)</label>
  <textarea
    className="w-full border rounded p-2"
    placeholder="Respuesta..."
    value={form.responsesRaw}   // mostramos el texto plano
    onChange={(e) =>
      setForm({
        ...form,
        responsesRaw: e.target.value, // guarda el texto tal cual
        responses: e.target.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) // crea el arreglo
      })
    }
  />
</div>

<label className="flex items-center gap-2 text-sm cursor-pointer">
  <input
    type="checkbox"
    checked={form.faq}
    onChange={(e) => setForm({ ...form, faq: e.target.checked })}
  />
  Mostrar como Pregunta Frecuente
</label>


            <div className="space-y-2">
              <label className="text-sm font-medium">Archivos</label>
              <input 
                type="file" 
                multiple 
                onChange={(e) => setFilesToUpload(e.target.files)} 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {form.id && form.files?.length > 0 && (
                <ul className="text-sm space-y-1 mt-2">
                  {form.files.map((f) => (
                    <li key={f.path} className="flex items-center justify-between bg-gray-50 p-1 rounded">
                      <a
                        href={`${INTENTS_API}${f.path}`}
                        className="text-blue-600 underline truncate max-w-[200px]"
                        download
                      >
                        {f.filename}
                      </a>
                      <button
                        className="text-red-600 hover:underline text-xs"
                        onClick={() => removeFile(form.id, f.path)}
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                className="bg-[#722F37] hover:bg-[#5a2529] text-white px-3 py-2 rounded disabled:opacity-60 transition-colors"
                onClick={saveIntent}
                disabled={loading || !form.title}
              >
                {form.id ? "Guardar cambios" : "Crear intención"}
              </button>
              <button className="border px-3 py-2 rounded hover:bg-gray-50 transition-colors" onClick={resetForm} disabled={loading}>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Derecha: Listado de Intenciones */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h2 className="text-lg font-semibold">Intenciones</h2>
            <button
              className="text-sm text-[#722F37] hover:underline font-medium"
              onClick={refreshList}
              disabled={loading}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2">
            {!Array.isArray(intents) ? (
              <p className="text-sm text-gray-600">No se pudo cargar el listado.</p>
            ) : intents.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No hay intenciones creadas aún.</p>
            ) : (
              <ul className="space-y-3">
                {intents.map((i) => (
                  <li key={i.id} className="border rounded-lg p-3 hover:border-gray-400 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{i.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-bold">Patrones:</span> {i.patterns.join(" | ")}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-bold">Respuestas:</span> {i.responses.join(" | ")}
                        </p>
                        {i.faq && <span className="inline-block mt-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">FAQ</span>}
                        {i.updatedAt && (
                          <p className="text-[10px] text-gray-400 mt-2 italic">
                            Actualizado: {new Date(i.updatedAt).toLocaleString("es-ES")}
                          </p>
                        )}
                        {i.files?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-[10px] font-bold uppercase text-gray-400">Archivos:</p>
                            <ul className="text-xs space-y-1 mt-1">
                              {i.files.map((f) => (
                                <li key={`${i.id}-${f.path}`} className="flex items-center justify-between">
                                  <span className="text-blue-600 truncate max-w-[150px]">{f.filename}</span>
                                  <button
                                    className="text-red-500 hover:text-red-700 text-[10px]"
                                    onClick={() => removeFile(i.id, f.path)}
                                  >
                                    Eliminar
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className="text-xs border px-3 py-1 rounded hover:bg-gray-50"
                          onClick={() => editIntent(i)}
                        >
                          Editar
                        </button>
                        <button
                          className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                          onClick={() => deleteIntent(i.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>



{/* Bloque de Usuarios (debajo del grid) */}
<div className="bg-white rounded-lg shadow p-5 space-y-4 mt-6">
  <h2 className="text-lg font-semibold border-b pb-2">Gestión de Usuarios</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Nombre de usuario</label>
            <input
              className="w-full border rounded p-2"
              placeholder="Usuario"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Contraseña</label>
            <input
              type="password"
              className="w-full border rounded p-2"
              placeholder="Contraseña"
              value={userForm.password || ""}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Rol</label>
            <select
              className="w-full border rounded p-2"
              value={userForm.role || ""}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            >
              <option value="">Selecciona un rol</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

  <div className="flex gap-2">
    
          <button
            className="bg-[#722F37] hover:bg-[#5a2529] text-white px-3 py-2 rounded disabled:opacity-60 transition-colors"
            onClick={saveUser}
            disabled={loading || !userForm.username || (!userForm.id && !userForm.password) || !userForm.role}
          >
            {userForm.id ? "Guardar cambios" : "Crear usuario"}
          </button>
          <button
            className="border px-3 py-2 rounded hover:bg-gray-50 transition-colors"
            onClick={resetUserForm}
            disabled={loading}
          >
            Limpiar
          </button>
        
  </div>

  {/* Listado de usuarios */}
  <div className="mt-4">
    {!Array.isArray(users) ? (
      <p className="text-sm text-gray-600">No se pudo cargar usuarios.</p>
    ) : users.length === 0 ? (
      <p className="text-sm text-gray-600 italic">No hay usuarios creados aún.</p>
    ) : (
      <ul className="space-y-3">
        {users.map((u) => (
                          <li key={u.id} className="border rounded-lg p-3 flex justify-between items-center bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{u.username}</p>
                    {u.role && <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Rol: {u.role}</p>}
                    {u.lastLogin && (
                      <p className="text-[10px] text-gray-400">
                        Última conexión: {new Date(u.lastLogin).toLocaleString("es-ES")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs border bg-white px-3 py-1 rounded hover:bg-gray-100"
                      onClick={() => editUser(u)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      onClick={() => deleteUser(u.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
        ))}
      </ul>
       )}
      </div>
      </div>   {/* cierre del bloque de usuarios */}
    </div>   {/* cierre del contenedor max-w-6xl */}
    </div>   
  )        
}        



