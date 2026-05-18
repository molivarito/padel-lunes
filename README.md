# 🎾 Padel de los Lunes

App web para llevar el registro de los partidos de pádel con tus amigos. Soporta múltiples modalidades (Americana, Pareja Fija, Round Robin, Modo Libre), historial completo, estadísticas avanzadas y sincronización en tiempo real entre todos los jugadores vía Firebase.

## 🚀 Probarla ya mismo (modo local)

Abrí `index.html` directamente en el navegador. Funciona offline guardando todo en `localStorage` (sirve si una sola persona lleva el registro). Para que **todos puedan cargar resultados desde su celular** y verlo sincronizado, seguí los pasos de Firebase abajo.

## ☁️ Setup de Firebase (5 minutos, gratis)

### 1) Crear proyecto en Firebase

1. Andá a [console.firebase.google.com](https://console.firebase.google.com/) e iniciá sesión con tu cuenta de Google.
2. Click en **"Agregar proyecto"** (o "Add project").
3. Nombre del proyecto: `padel-lunes` (o lo que quieras). Aceptá los términos. Podés saltar Google Analytics.
4. Esperá a que se cree (~30 segundos).

### 2) Activar Firestore Database

1. En el menú izquierdo, click en **"Build" → "Firestore Database"**.
2. Click en **"Crear base de datos"**.
3. Elegí **"Iniciar en modo de prueba"** (modo abierto por 30 días).
4. Elegí la ubicación más cercana: `southamerica-east1` (São Paulo) o `us-east1`. Confirmá.

### 3) Reglas de Firestore (acceso abierto permanente)

1. Dentro de Firestore, andá a la pestaña **"Reglas"** (Rules).
2. Reemplazá el contenido por esto y publicá:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Esto deja la base **completamente abierta**: cualquiera con tu URL pública podría leer/escribir. Como acordamos, está OK para una app personal de 4 amigos. Si querés más seguridad después, podés agregar un PIN simple.

### 4) Obtener credenciales de tu app web

1. En el panel principal de Firebase, click en el ícono de **engranaje ⚙️ → "Configuración del proyecto"**.
2. Scroll abajo hasta **"Tus apps"** → click en el ícono **`</>`** (Web).
3. Apodo: `padel-web`. **NO** marques "Firebase Hosting". Click "Registrar app".
4. Te aparece un bloque de código con un objeto `firebaseConfig`. Copialo entero.

Se ve así:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "padel-lunes.firebaseapp.com",
  projectId: "padel-lunes",
  storageBucket: "padel-lunes.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

### 5) Pegar credenciales en la app

1. Abrí `index.html` en un editor de texto.
2. Buscá `FIREBASE_CONFIG` (está cerca de la línea ~540, dentro del primer `<script type="module">`).
3. Reemplazá el bloque vacío `{ }` con tu objeto, **descomentando las líneas**:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB...",
  authDomain: "padel-lunes.firebaseapp.com",
  projectId: "padel-lunes",
  storageBucket: "padel-lunes.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

4. Guardá el archivo. Abrilo en el navegador: arriba en la barra debería decir "🟢 Firebase conectado" si vas a la pestaña Config.

## 🌐 Publicar en GitHub Pages

### Opción A — Sencilla (drag & drop)

1. Creá un repo nuevo en GitHub, por ejemplo `padel-lunes`.
2. Subí `index.html` y `README.md` al repo (drag & drop o `git push`).
3. En GitHub, andá a **Settings → Pages**.
4. En "Source", elegí **branch: main** y carpeta **/(root)**. Guardá.
5. Esperá 1-2 minutos. Tu app estará en: `https://TU-USUARIO.github.io/padel-lunes/`
6. Compartí el link con Chuqui, Nico y Uri.

### Opción B — Por línea de comandos

```bash
cd "/Users/pdelac/Library/CloudStorage/GoogleDrive-.../Padel"
git init
git add index.html README.md
git commit -m "Padel app inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/padel-lunes.git
git push -u origin main
# Luego activá GitHub Pages como en Opción A.
```

## 📱 Cómo usarla

### Cargar un partido

1. **Cargar** (tab inferior).
2. Elegí la **modalidad**:
   - **Americana** 🔄: rotan compañeros. Para 4 jugadores arma 3 rondas (cada uno juega con cada uno como pareja).
   - **Pareja Fija** ⚔️: dos parejas fijas, varios sets.
   - **Round Robin** 🎯: similar a Americana, todas las combinaciones.
   - **Libre** 📝: solo cargás puntos/games totales por jugador.
3. Tocá los chips de los jugadores que participaron.
4. Cargá los resultados set por set.
5. **💾 Guardar Partido**.

### Tip: re-generar parejas

En Americana podés tocar **🎲 Re-generar parejas** para randomizar el orden si querés.

### Estadísticas

La pestaña **🏆 Stats** muestra la tabla histórica de la temporada activa, con:
- **PJ**: partidos jugados (cuenta cada ronda)
- **G**: rondas ganadas
- **Pts**: puntos según sistema configurado (3 ganar / 1 empate / 0 perder por defecto)
- **%V**: porcentaje de victorias

Más abajo: stats avanzadas por jugador — mejor compañero, peor compañero, rival más difícil.

### Temporadas

En **⚙️ Config** podés crear nuevas temporadas, cerrar la actual, y filtrar las stats por temporada en el dropdown.

### Backup

Botón **⬇️ Exportar datos** descarga un JSON con todo. **⬆️ Importar** te permite restaurar.

## 🛠️ Modificar / extender

- Es un solo archivo HTML con todo dentro (CSS + JS). Sin build, sin dependencias instaladas.
- Si querés agregar funcionalidades pedímelo y lo modifico.

## 📁 Estructura de datos en Firestore

```
/players/{id}      → { name, emoji, color, active, createdAt }
/seasons/{id}      → { name, startDate, endDate, active }
/matches/{id}      → { date, seasonId, modality, players, rounds, libreStats, createdAt }
/config/main       → { pointsWin, pointsTie, pointsLoss, currentSeasonId }
```

---

Hecho con 🎾 para los lunes en la cancha.
