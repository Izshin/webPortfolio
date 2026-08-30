# Plan de optimización de primera carga — portfolioWeb

> Documento ejecutable por otra IA/agente. Cada fase indica **archivos exactos**, **qué cambiar** y **cómo verificar**.
> Ejecutar las fases **en orden**. Las fases 0–3 son obligatorias antes de tocar nada más.
> Todos los comandos asumen `cwd = portfolioWeb/` (NO la carpeta padre `webPortfolio/`).

## Estado: implementado (2026-08-30)

Resultado medido tras aplicar las fases 0–4, 6–9 y la mayor parte de la 3 (ver detalle abajo):

| Métrica | Antes | Después |
|---|---|---|
| `public/` total | 209,5 MB | **45,7 MB** |
| `dist/` (build) | ~211 MB | **47,2 MB** |
| Peticiones a terceros en ruta crítica | raw.githack.com + fonts.googleapis.com | **0** |
| `Gojo.obj` | 28,75 MB / 237k caras | **1,37 MB GLB / 29,7k caras** |
| Texturas de modelos (PNG/JPG) | ~85 MB | **~6 MB WebP** |
| Música | 63 MB | **25,1 MB** (112 kbps) |
| `saturateTexture` runtime (bonsái) | ~12,6M iteraciones JS por arranque | **eliminado** (horneado en las texturas) |
| ClipBoard: pintado inicial | 14 canvas 744×1024 síncronos | **1 canvas** (resto en idle callbacks) |
| Música: descarga en la carga | sí (autoplay al primer gesto) | **no** (`preload="none"`, solo al pulsar play) |

Lo que **no** se implementó (documentado abajo por si se retoma):
- Fase 5 (carga por niveles / Suspense escalonado en Room.tsx) — cambio arquitectónico de mayor riesgo, no aplicado.
- Decimado del `GreekModularEnvironment.obj` (8,55 MB) — sus texturas sí se comprimieron a WebP, pero la malla se dejó igual para no arriesgar el manejo de materiales/alpha-cutout de la vegetación.
- KTX2/Basis para texturas (fase 3, "opcional avanzado").
- Se encontró un bug preexistente y no relacionado (bucle "Maximum update depth exceeded" recurrente) — ver nota en la memoria del repo (`/memories/repo/portfolioweb.md`), no se investigó a fondo por estar fuera de alcance.

Herramientas añadidas como devDependencies (uso puntual, no runtime): `sharp` (recompresión de texturas, ver `tools/optimize-textures.mjs`), `ffmpeg-static` (recompresión de audio).

---

---

## 0. Diagnóstico medido (estado actual, verificado)

### Payload

| Concepto | Medido |
|---|---|
| `public/` total | **209,5 MB** (`models` 145,2 · `music` 63,0 · resto 1,3) |
| `dist/` tras build | ~211 MB |
| **Bytes realmente descargados en la primera carga** | **≈ 118–122 MB** (todo lo que referencian los componentes de `src/components/scene/**`) |
| Peticiones a terceros bloqueantes | Google Fonts (CSS + 2 familias) y **`raw.githack.com`** (HDRI de drei) |

Desglose de lo que sí se descarga en el arranque:

| Modelo | Malla | Texturas | Total aprox. |
|---|---|---|---|
| `gojoPenHolder/Gojo.obj` | **28,75 MB** (152.334 v / **237.032 caras**, OBJ en texto) | — (MTL flat color) | **28,8 MB** |
| `office-table` | `table.fbx` 0,04 | BaseColor **4096²** 9,93 · Normal **4096²** 9,24 · Roughness 4096² 2,15 · Metallic | **≈ 21,4 MB** |
| `bonsaitree` | 0,15 | 8 texturas **2048²** (19 MB) | **≈ 19,2 MB** |
| `indoor-plant-with-pot-a` | 0,22 | 5 texturas (Pot_A_normal 6,35 · roughness 3,67 · albedo 2,88 · soil 1,36) | **≈ 15,1 MB** |
| `sci-fi-boombox` | `Boombox_FullAnimation.fbx` 1,07 | Normal **2048²** 11,92 + 4 más | **≈ 14,4 MB** |
| `greek-modular-environment` | `.obj` **8,55 MB** (40.760 caras) | ~1,9 MB | **≈ 10,4 MB** |
| `clip-board` | `ClipBoard.fbx` 2,7 | 2 × 1024² = 2,47 | **≈ 5,2 MB** |
| `office-chair` | `model.dae` 0,35 | ~2,1 | **≈ 2,4 MB** |
| `skybox-skydays-3` | 0,02 | png 2000² 1,94 | **≈ 2,0 MB** |
| `wacom-pen` | 0,05 | 5 texturas 2048² ~2,1 | **≈ 2,2 MB** |
| Suelo + pared | — | `woodTextureFloor.jpg` 3024×2250 0,91 · `marbeWalltexture.png` 1,18 | **≈ 2,1 MB** |
| `card-holder` | `.glb` 0,09 | — | 0,1 MB |

### Lastre que se publica pero nunca se usa

- `public/models/boombox.zip` — **5,16 MB**
- `public/models/greek-modular-environment/source/GreekModularEnvironment.zip` — 3,2 MB
- `public/models/office-chair/source/model.zip` — 2,16 MB
- `public/models/skybox-skydays-3/source/skybox_skydays_3.zip` — 1,93 MB
- `.../skybox-skydays-3/source/extracted/` duplica la textura de `textures/` (1,97 MB)
- `.../wacom-pen/source/extracted/` contiene las texturas duplicadas + un `Height.png` no usado (3,19 MB)
- `.../office-chair/source/extracted/model/textures/` duplicado (2,44 MB)
- `public/music/` — **63 MB** de MP3 que ni siquiera se ven hasta abrir el boombox
- `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` — nunca importados
- `temp_inspect.ps1`, `temp_inspect2.ps1` en la raíz

### Problemas de código (bloqueo de hilo principal / arquitectura de carga)

1. **`src/components/scene/models/WacomPen.tsx` está VACÍO (0 bytes)** → `Room.tsx:9` falla al compilar. **El build está roto ahora mismo.**
2. `src/components/scene/Room.tsx` mete **todos** los modelos en un único `<Suspense>` → no se pinta absolutamente nada hasta que los ~120 MB están descargados, parseados y con materiales montados.
3. `<Environment preset="apartment" />` (Room.tsx) descarga el HDRI desde **`https://raw.githack.com/pmndrs/drei-assets/...`** (confirmado en `node_modules/@react-three/drei/core/useEnvironment.js`). Dependencia externa no controlada, sin caché fiable, y en la ruta crítica.
4. `<ContactShadows>` en Room.tsx **sin `frames={1}`** → drei re-renderiza el mapa de sombras de contacto en **cada frame**, para siempre.
5. `directionalLight` con `shadow-mapSize={[2048, 2048]}` + `dpr={[1, 2]}` + `antialias: true` → coste de primer frame y de compilación de shaders alto en portátiles/móviles.
6. **`ClipBoard.tsx`**: el `useMemo` de `painted` pinta **14 canvas de 744×1024** (7 páginas × 2 idiomas) de forma **síncrona durante el render**, con cientos de `fillText`/`measureText` cada uno, y crea 14 `CanvasTexture` con `anisotropy = 8`. Es un bloqueo del hilo principal de cientos de ms justo cuando la escena intenta pintar el primer frame. Además espera a `useFontsReady()` (Google Fonts) para hacerlo.
7. `ClipBoard.tsx` monta **7 `PageSheet` × 2 mallas = 14 mallas** con deformación de vértices por CPU + `computeVertexNormals()` en `useFrame`.
8. **`modelUtils.saturateTexture`** (usado por `Bonsai.tsx` en 3 texturas de **2048²**): bucle JS píxel a píxel = **~12,6 millones de iteraciones** + `getImageData`/`putImageData` en el hilo principal, en cada arranque.
9. `fitToHeight(..., 'Bonsai' | 'PottedPlant' | 'GreekEnvironment' | 'ClipBoard')` deja `console.warn` de depuración en producción.
10. **`useMusicPlayer.ts`**: asigna `audio.src` en el montaje (`preload='metadata'` → petición inmediata) y llama a `void audio.play()` + listener de primer gesto → en cuanto el visitante hace clic empieza a **descargar un MP3 de hasta 23,6 MB compitiendo por ancho de banda** con los modelos.
11. **Código muerto que sí entra en el bundle**: `components/menu/MenuCards.tsx`, `components/menu/PaperCard.tsx`, `components/dock/Dock.tsx` (nunca renderizados) y `components/overlay/DetailOverlay.tsx` + `overlay/sections/*` (montado en `App.tsx` pero `setSection` **nunca se llama**, luego `section` siempre es `null`). Arrastran `framer-motion`, `lucide-react` y `data/{menu,projects,experience,skills}.ts`.
12. `index.html` carga Google Fonts con `<link rel="stylesheet">` **bloqueante de render**, con 2 familias y 7 pesos.
13. `vite.config.ts` no tiene ninguna configuración de build (sin `manualChunks`, sin control de `assetsInlineLimit`).

### Objetivo

| Métrica | Ahora | Objetivo |
|---|---|---|
| Bytes hasta primer frame útil | ~120 MB | **< 6 MB** |
| Bytes de `dist/` | ~211 MB | **< 25 MB** |
| Peticiones a terceros en ruta crítica | 2 dominios | **0** |
| Bloqueo de hilo principal por canvas/píxeles | >500 ms | **< 50 ms** |

---

## Fase 0 — Desbloquear el build (OBLIGATORIA, primero)

`WacomPen.tsx` está vacío y modificado respecto a git (`git status` lo marca como ` M`). Restaurarlo:

```powershell
git checkout -- src/components/scene/models/WacomPen.tsx
```

Verificar:

```powershell
npm run build
```

Debe compilar sin errores. **No continuar hasta que `npm run build` pase.** Guardar el tamaño de `dist/` como línea base:

```powershell
"{0} MB" -f [math]::Round((Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum/1MB,2)
```

---

## Fase 1 — Sacar del build todo lo que no se sirve

Cero riesgo, ganancia inmediata de ~19 MB en el artefacto de despliegue.

1. Mover los archivos comprimidos fuera de `public/` (la convención del repo es `model-archives/`):
   - `public/models/boombox.zip`
   - `public/models/greek-modular-environment/source/GreekModularEnvironment.zip`
   - `public/models/office-chair/source/model.zip`
   - `public/models/skybox-skydays-3/source/skybox_skydays_3.zip`
2. Borrar carpetas `source/extracted/` **que solo dupliquen** lo ya referenciado desde el código. **Antes de borrar cada una, comprobar con grep que ninguna ruta del código apunta a `extracted`**:
   ```powershell
   Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "extracted" -SimpleMatch
   ```
   > OJO: hoy `Skybox.tsx`, `GreekEnvironment.tsx` y `WacomPen.tsx` **sí** apuntan a rutas `source/extracted/...`. Antes de borrar, mover el archivo realmente usado a una ruta limpia (`source/`, `textures/`) y actualizar la constante `BASE` del componente. Nunca borrar sin re-apuntar primero.
3. Borrar de `src/assets/`: `hero.png`, `react.svg`, `vite.svg` (verificar con grep que no se importan).
4. Borrar `temp_inspect.ps1` y `temp_inspect2.ps1` de la raíz.
5. Borrar la textura `wacom-pen/.../Wacom_LP_Tri_lambert1_Height.png` (no se usa en `WacomPen.tsx`) y la `*_Opacity.png` del boombox (documentado como deliberadamente no cableada).

**Verificación:** `npm run build` sigue pasando y la escena se ve idéntica en `npm run dev`.

---

## Fase 2 — Eliminar código muerto

1. **`src/App.tsx`**: `section` nunca cambia de `null`. Eliminar el estado `section`/`setSection` y el `<DetailOverlay ...>`.
2. Borrar, tras confirmar con grep que quedan sin referencias:
   - `src/components/overlay/DetailOverlay.tsx`
   - `src/components/overlay/sections/` (AboutPanel, ExperiencePanel, ProjectsPanel, SkillsPanel)
   - `src/components/menu/MenuCards.tsx`, `src/components/menu/PaperCard.tsx`
   - `src/components/dock/Dock.tsx`
   - `src/data/menu.ts` (y `SectionId` si deja de usarse)
   - `src/data/projects.ts`, `src/data/experience.ts`, `src/data/skills.ts` **solo si** el grep confirma que únicamente los usaban los paneles borrados. `src/data/notes.ts` y `src/data/profile.ts` **se quedan** (los usa el clipboard y la tarjeta).
   - Los bloques CSS correspondientes en `src/App.css` (`.dock*`, `.overlay*`, `.paper-card*`).
3. **`src/components/scene/models/modelUtils.ts`**: quitar el parámetro `debugLabel` de `fitToHeight` y su `console.warn`; actualizar las 4 llamadas (`Bonsai`, `PottedPlant`, `GreekEnvironment`, `ClipBoard`).
4. Revisar si `src/components/scene/DevTransform.tsx` sigue en uso. Si ya no se envuelve nada con él, dejarlo pero **asegurar que no se importa desde código de producción** salvo el flag `devDragging` que usa `CameraRig`; en ese caso mover `devDragging` a un módulo propio minúsculo para que el árbol del `DevTransform` se pueda podar.
5. `npx eslint . --max-warnings=0` para cazar imports huérfanos.

**Verificación:** `npm run build`; comparar el tamaño de los `.js` en `dist/assets/` antes/después.

---

## Fase 3 — Comprimir los assets (la ganancia grande: ~120 MB → ~6 MB)

Herramientas disponibles/necesarias:
- **Blender headless ya instalado**: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`
- `npx @gltf-transform/cli` (compresión Draco/Meshopt + WebP en un paso)
- `ffmpeg` (audio)

### 3.1 `Gojo.obj` — 28,75 MB → objetivo < 1,5 MB (el mayor cambio individual)

Es un adorno de escritorio de 0,18 de alto con **237k caras**. Decimar agresivo + exportar GLB.

```powershell
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
& $blender -b --python-expr @"
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=r'public/models/gojoPenHolder/Gojo.obj')
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
    m = o.modifiers.new('dec','DECIMATE'); m.ratio = 0.06
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.export_scene.gltf(filepath=r'public/models/gojoPenHolder/gojo.glb', export_format='GLB')
"@
npx @gltf-transform/cli draco public/models/gojoPenHolder/gojo.glb public/models/gojoPenHolder/gojo.glb
```

Luego reescribir `src/components/scene/models/GojoPenHolder.tsx`: sustituir `MTLLoader` + `GojoOBJLoader` por `useGLTF`/`GLTFLoader` con `DRACOLoader` (ver 3.6). Conservar el prop `saturation` y la lógica de `originalMaterialColor` → `setHSL`. Ajustar `height` si el bounding box cambia (`fitToHeight` lo normaliza, así que no debería).
Si el resultado se ve mal a ratio 0.06, subir a 0.12/0.2 — sigue siendo <3 MB.

### 3.2 `GreekModularEnvironment.obj` — 8,55 MB → objetivo < 1,5 MB

Es decorado lejano visto a través de la ventana. Mismo proceso: importar OBJ+MTL en Blender, decimar a ~0,3, exportar GLB + Draco + texturas WebP. Portar `GreekEnvironment.tsx` a GLTF **conservando la lógica de alpha cutout de la vegetación** (`FOLIAGE_ALPHA_PATTERN`): con GLTF el nombre del material sobrevive, así que la comprobación pasa a hacerse sobre `material.name`/`material.map.name` en vez de sobre `materials.materialsInfo[...].map_kd`.
**Bonus:** al pasar a GLTF desaparece por completo el hack de las subclases `GreekOBJLoader`/`GojoOBJLoader` (el bug de `setMaterials` compartido) documentado en el código.

### 3.3 Texturas — el segundo bloque más grande (~85 MB → ~6 MB)

Regla general: **ninguna textura por encima de 1024² salvo el suelo/mesa vistos de cerca (máx. 2048²)**, y todas en WebP.

| Archivo | Ahora | Acción |
|---|---|---|
| `office-table/textures/Table_BaseColor.png` | 4096² / 9,93 MB | → 1024² WebP q80 (~0,25 MB) |
| `office-table/textures/Table_Normal.png` | 4096² / 9,24 MB | → 1024² WebP q85 (~0,4 MB) |
| `office-table/textures/Table_Roughness.png` | 4096² / 2,15 MB | → 512² WebP (~0,05 MB) |
| `sci-fi-boombox/.../_Normal.png` | 2048² / 11,92 MB | → 1024² WebP (~0,4 MB) |
| `indoor-plant/Pot_A_*.png` (3) | 2048² / 12,9 MB | → 1024² WebP (~0,6 MB) |
| `bonsaitree/*` (8 texturas) | 2048² / 19 MB | → 1024² WebP (~1 MB) |
| `wacom-pen/*_Normal.png` | 2048² / 1,72 MB | → 1024² WebP |
| `skybox_skydays_3.png` | 2000² / 1,94 MB | → 1024² WebP (es un `MeshBasicMaterial` de fondo, no necesita más) |
| `woodTextureFloor.jpg` | 3024×2250 / 0,91 MB | → 1600×1200 WebP q80 |
| `marbeWalltexture.png` | 1224×816 / 1,18 MB | → WebP q80 (~0,15 MB) |
| `clip-board/*_Diffuse.png` | 1024² / 2,47 MB | → WebP q80 (~0,3 MB) |
| Roughness/Metallic/AO en general | — | Son mapas de datos en escala de grises: bajar a 512² y guardar en **1 canal** cuando sea posible |

Script de referencia (requiere `npm i -D sharp`, herramienta de build, no dependencia de runtime):

```js
// tools/optimize-textures.mjs  (ejecutar con: node tools/optimize-textures.mjs)
import sharp from 'sharp'
import { readdir } from 'node:fs/promises'
// Recorrer public/models/**, para cada .png/.jpg:
//   sharp(src).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
//             .webp({ quality: isNormalMap ? 90 : 80 })
//             .toFile(dst.replace(/\.(png|jpg)$/, '.webp'))
// max = 1024 por defecto, 2048 para Table_BaseColor si se nota la pérdida.
```

Después, **actualizar las extensiones en el código** (`.png` → `.webp`) en: `Desk.tsx`, `Bonsai.tsx`, `PottedPlant.tsx`, `Boombox.tsx`, `WacomPen.tsx`, `ClipBoard.tsx`, `Skybox.tsx`, `Floor.tsx`, `Wall.tsx`, y en los `.mtl` que queden. Recordar que todas las rutas deben seguir pasando por `asset()`.

> **Opcional avanzado (mayor ganancia de VRAM, más trabajo):** convertir las texturas a **KTX2/Basis** (`npx @gltf-transform/cli uastc` o `toktx`) y cargarlas con `KTX2Loader`. Reduce la memoria de GPU ~4–6× además del ancho de banda. Hacerlo solo si tras la fase 3 el consumo de VRAM sigue siendo un problema en móvil.

### 3.4 Mallas FBX/DAE restantes → GLB

`ClipBoard.fbx` (2,7 MB), `Boombox_FullAnimation.fbx` (1,07 MB con animaciones), `model.dae` de la silla, `Plant A.fbx`, `Bonsai_Final.fbx`, `table.fbx`, `SM_Skybox.FBX`, `Wacom_LP_Tri.fbx`.

Beneficio doble: menos bytes **y** menos CPU (el parser de FBX/DAE de three es texto/binario propietario y es lento en el hilo principal; GLTF con Draco descomprime en un **worker**).
Convertir con Blender headless (misma receta que 3.1, sin decimate salvo el clipboard) y luego `npx @gltf-transform/cli optimize <in> <out> --compress draco --texture-compress webp`.
**Cuidado con el Boombox:** exportar con `export_animations=True` y verificar que los 5 clips (`Activate`, `Idle Loop`, `Deactivate`, `Idle Fidget 1`, `Idle Fidget 2`) siguen ahí y que el skinning funciona. Al pasar a GLTF, `cloneSkinned` de `SkeletonUtils` se mantiene igual.

### 3.5 Audio — 63 MB → ~10 MB

```powershell
Get-ChildItem public\music\*.mp3 | ForEach-Object {
  ffmpeg -y -i $_.FullName -c:a libmp3lame -b:a 112k -ac 2 -ar 44100 ("public\music\opt\" + $_.Name)
}
```

- 112 kbps es de sobra para música de fondo en un portfolio. El track de 23,6 MB baja a ~4 MB.
- Considerar además recortar los temas a 2–3 min.
- Miniaturas `public/musicThumbnails/*.jpg` (0,7 MB) → WebP 256×256 (~40 KB total).

### 3.6 Registrar los loaders GLTF una sola vez

Crear `src/components/scene/models/gltf.ts`:

```ts
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { asset } from '../../../asset'

const draco = new DRACOLoader()
// Copiar node_modules/three/examples/jsm/libs/draco/ a public/draco/ para no depender de un CDN.
draco.setDecoderPath(asset('/draco/'))

export const withDraco = (loader: GLTFLoader) => loader.setDRACOLoader(draco)
```

y usarlo como tercer argumento de `useLoader(GLTFLoader, url, withDraco)` (o `useGLTF(url, asset('/draco/'))`).
**No usar el CDN de gstatic**: repetiría el problema del punto 3 del diagnóstico.

**Verificación de la fase 3:**

```powershell
"{0} MB" -f [math]::Round((Get-ChildItem public -Recurse -File | Measure-Object Length -Sum).Sum/1MB,2)
```
Objetivo: **< 25 MB**. Y comprobar visualmente en `npm run dev` que ningún modelo perdió textura, color, escala ni animación.

---

## Fase 4 — Quitar la dependencia de terceros de la ruta crítica

### 4.1 HDRI de drei

En `src/components/scene/Room.tsx`, `<Environment preset="apartment" environmentIntensity={0.4} />` descarga desde `raw.githack.com`. Dos opciones, en orden de preferencia:

- **A (recomendada):** descargar una vez el HDRI del preset, reducirlo a **256×128 en formato `.hdr` o a un equirect WebP LDR**, guardarlo en `public/hdri/apartment_small.hdr` y usar `<Environment files={asset('/hdri/apartment_small.hdr')} environmentIntensity={0.4} />`. A intensidad 0.4 y solo como luz ambiental, 256×128 es indistinguible.
- **B:** eliminar `<Environment>` y sustituirlo por `<Environment>` con `<Lightformer>`s procedurales (cero bytes) o simplemente por un `hemisphereLight` + el `directionalLight` ya existente, reajustando intensidades.

### 4.2 Fuentes

En `index.html`, el `<link rel="stylesheet">` de Google Fonts es **bloqueante de render** y `ClipBoard.useFontsReady()` espera a que carguen antes de pintar los canvas.

- Auto-hospedar solo los pesos realmente usados. Auditados en `ClipBoard.tsx` (`FONT_SPECS` + llamadas a `ctx.font`): **Montserrat 700 y 800**, **Inter 400, 500, 600**. Montserrat 600 e Inter 700 se pueden eliminar del link si el grep confirma que no se usan.
- Descargar los `.woff2` a `public/fonts/`, declarar `@font-face` con `font-display: swap` en `src/index.css` y borrar los `<link>` de Google (incluidos los dos `preconnect`).
- Añadir `<link rel="preload" as="font" type="font/woff2" crossorigin href="...">` para las 2 caras que usa el clipboard.

---

## Fase 5 — Carga por prioridades (percepción de velocidad)

Hoy `Room.tsx` tiene un único `<Suspense>` gigante: **o está todo, o no hay nada**. Reestructurar en tres niveles, con la `LoadingScreen` cerrando en cuanto termina el nivel 1.

**Nivel 1 (bloquea la pantalla de carga):** `Floor`, `Wall`, `Desk`, `ClipBoard`, `CardHolder`, `Boombox`. Es lo que está en cámara y con lo que se interactúa.
**Nivel 2 (aparece después, sin bloquear):** `Chair`, `Bonsai`, `GojoPenHolder`, `WacomPen`, `PottedPlant`.
**Nivel 3 (lo último):** `Skybox`, `GreekEnvironment` — decorado a través de la ventana.

Implementación en `src/components/scene/Room.tsx`:

1. Cada nivel en su propio `<Suspense fallback={null}>`, con los niveles 2 y 3 montados por un estado que se activa tras el primer frame útil (`useEffect` + `requestIdleCallback`, o cuando `useProgress().progress` del nivel 1 llegue a 100).
2. Envolver los componentes de nivel 2 y 3 en `React.lazy` para que su código **y** su cadena de `useLoader` no se toquen hasta entonces.
3. `src/components/LoadingScreen.tsx` debe dejar de escuchar el `useProgress` global (que cuenta *todo*) y cerrarse con una señal explícita del nivel 1. Alternativa mínima: mantener `useProgress` pero montar los niveles 2/3 solo **después** de que `LoadingScreen` se haya ocultado — así el progreso mostrado corresponde de verdad a lo que bloquea.
4. Añadir `<link rel="preload" as="fetch" crossorigin>` en `index.html` para las 3–4 URLs del nivel 1 (mesa, clipboard, suelo) **con la ruta base `/webPortfolio/` incluida**.

---

## Fase 6 — Quitar el trabajo pesado del hilo principal

### 6.1 `ClipBoard.tsx` — el peor bloqueo

Actual: `painted` pinta 14 canvas de 744×1024 síncronamente dentro de un `useMemo`.

1. **Pintar solo el idioma activo.** Cambiar `painted` para que devuelva únicamente `notePagesByLang[lang]`; el otro idioma se pinta cuando se pulsa la bandera (con el `swap` animado que ya existe cubriendo la latencia).
2. **Pintar solo la página visible + la siguiente**, y el resto de forma diferida:
   ```ts
   // pintar página 0 en el primer render; el resto en requestIdleCallback encadenados
   ```
   El resto se pinta en `requestIdleCallback` (con `setTimeout(…, 0)` como fallback en Safari) mientras el usuario ya está viendo la escena.
3. **No montar 14 mallas.** Renderizar solo las hojas dentro de una ventana alrededor de `pageIndex` (p. ej. `pageIndex-1 .. pageIndex+2`); las demás no necesitan existir hasta que se llegue a ellas.
4. Bajar `texture.anisotropy` de `8` a `renderer.capabilities.getMaxAnisotropy()` acotado a 4, o dejarlo en 4 fijo.
5. `PageSheet`: la `PlaneGeometry(w, d, 1, 56)` con deformación por CPU + `computeVertexNormals()` cada frame. Reducir los segmentos a **24** (visualmente indistinguible en una hoja de papel) y sustituir `computeVertexNormals()` por el cálculo analítico de la normal del cilindro (la fórmula del enrollado ya se conoce) o simplemente recalcular normales solo mientras `progress` está cambiando (ya hay un early-out; asegurarse de que también salta el `computeVertexNormals`).

### 6.2 `saturateTexture` — eliminarlo del runtime

`modelUtils.ts` recorre píxel a píxel 3 texturas de 2048² para el bonsái (~12,6 M iteraciones + dos copias de ImageData) en cada arranque.

- **Hornear la saturación en el archivo** durante la fase 3 (sharp: `.modulate({ saturation: 1.4 })`) y **borrar `saturateTexture` de `modelUtils.ts`** y el prop `saturation` de `Bonsai.tsx`.
- Si se quiere conservar el ajuste en runtime, hacerlo en la GPU (`material.onBeforeCompile` con un pequeño patch de fragment shader), nunca en JS.

### 6.3 `BusinessCard.tsx` / `CardHolder.tsx`

Los canvas de la tarjeta son pequeños (`FACE_W/FACE_H`) y se pintan una vez: dejar como están, pero mover el `useMemo` de `faces` a que se dispare tras el primer frame si la medición muestra que suma >30 ms.

---

## Fase 7 — Coste de render y primer frame

En `src/components/scene/Room.tsx`:

1. `<ContactShadows ... frames={1} />` — **cambio de una palabra, gran ganancia**: hoy se re-renderiza cada frame. Si la escena tiene elementos que se mueven sobre el suelo, usar `frames={60}`.
2. `shadow-mapSize={[2048, 2048]}` → `[1024, 1024]`. Con `ContactShadows` haciendo el trabajo de contacto, la sombra direccional puede ser más suave.
3. `dpr={[1, 2]}` → `dpr={[1, 1.5]}`. En pantallas retina esto reduce el fill rate a la mitad. (Nota: `performance={{ min: 0.85 }}` ya limita la degradación adaptativa.)
4. `gl={{ antialias: true }}` → `gl={{ antialias: true, powerPreference: 'high-performance' }}`. Evaluar desactivar `antialias` y usar en su lugar un SMAA/post-proceso solo si hace falta (probablemente no compensa).
5. Compartir materiales: `Desk`, `Bonsai`, `PottedPlant`, `Boombox` crean `MeshStandardMaterial` nuevos dentro de un `useEffect` que depende de las texturas — correcto, pero **añadir la limpieza** (`return () => material.dispose()`) para evitar fugas en StrictMode/HMR.
6. Comprobar `castShadow`/`receiveShadow`: `enableShadows()` lo activa en **todas** las mallas de todos los modelos. Desactivar `castShadow` en el `Skybox` (ya hecho), en `GreekEnvironment` (decorado lejano, no debería proyectar) y en la vegetación con alpha-test (las sombras con alphaTest son caras).

---

## Fase 8 — Audio bajo demanda

En `src/components/music/useMusicPlayer.ts`:

1. Cambiar `audioRef.current.preload = 'metadata'` → **`'none'`**.
2. Eliminar el `void audio.play()` del montaje y el listener de "primer gesto" que arranca la reproducción. La música debe empezar **solo** cuando el usuario abre el boombox (`focus === 'boombox'`) o pulsa play. Hoy un clic cualquiera en la página dispara la descarga de un MP3 de varios MB en plena carga de modelos.
3. No asignar `audio.src` hasta la primera reproducción (mover la asignación del `useEffect` de `track.src` a una función `ensureSrc()` llamada desde `toggle`/`play`).
4. Las miniaturas (`public/musicThumbnails/`) deben cargarse con `loading="lazy"` en `MusicPlayer.tsx`, o solo cuando el panel está abierto.

---

## Fase 9 — Configuración de build

`vite.config.ts`:

```ts
export default defineConfig({
  base: '/webPortfolio/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
```

Motivo del `manualChunks`: `three` cambia poco entre despliegues, así que sale del chunk de la app y se cachea entre versiones.

Además:
- Revisar que **no** se importe `@react-three/drei` en barril innecesariamente; los imports nombrados actuales ya son tree-shakeable.
- GitHub Pages sirve gzip automáticamente; no tiene sentido pre-comprimir. Pero **sí** conviene verificar que los `.glb`/`.webp` no se re-compriman (ya están comprimidos).

---

## Fase 10 — Verificación y criterios de aceptación

Ejecutar tras cada fase, y todo junto al final:

```powershell
npm run build
"{0} MB dist" -f [math]::Round((Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum/1MB,2)
npm run preview
```

Auditoría manual en el navegador (pestaña **visible y enfocada** — ver nota abajo):

1. DevTools → Network → *Disable cache* → recargar. Anotar:
   - **Transferred** hasta que desaparece la `LoadingScreen` → objetivo **< 6 MB**.
   - Que **no** haya peticiones a `raw.githack.com` ni a `fonts.googleapis.com`.
2. DevTools → Performance → grabar la carga. Buscar *long tasks* > 50 ms. Los sospechosos históricos eran el `useMemo` de `ClipBoard.painted` y `saturateTexture`; deben haber desaparecido.
3. Lighthouse (modo móvil): LCP objetivo **< 2,5 s** en 4G simulada.
4. Regresión visual: comparar contra capturas previas que la escena no perdió texturas, escala, animación del boombox, alpha cutout de la vegetación, ni el funcionamiento del clipboard (pasar páginas, links, toggle de idioma), la tarjeta y el reproductor.

> **Gotcha conocido de este repo:** con herramientas de navegador automatizadas, si la pestaña está en segundo plano `document.visibilityState === 'hidden'`, Chromium suspende `requestAnimationFrame` y el canvas de R3F se lee como transparente. **No es un bug de la app.** Verificar siempre en una pestaña visible y enfocada.

---

## Resumen de impacto estimado

| Fase | Ahorro estimado en primera carga | Riesgo |
|---|---|---|
| 0 — Restaurar `WacomPen.tsx` | (desbloquea el build) | Ninguno |
| 1 — Sacar zips/duplicados | 0 MB en carga, **~19 MB** en `dist`/despliegue | Muy bajo |
| 2 — Código muerto | ~50–150 KB de JS | Bajo |
| 3 — Assets (mallas + texturas + audio) | **~110 MB** | Medio (regresión visual) |
| 4 — HDRI + fuentes locales | ~1–2 MB y 2 dominios menos en la ruta crítica | Bajo |
| 5 — Carga por niveles | Percepción: primer frame con ~4 MB en vez de ~120 MB | Medio |
| 6 — Canvas/píxeles fuera del hilo principal | 300–800 ms de bloqueo | Medio |
| 7 — Render (`frames={1}`, dpr, shadow map) | FPS sostenidos + primer frame más rápido | Bajo |
| 8 — Audio bajo demanda | Hasta 24 MB que dejan de competir con los modelos | Bajo |
| 9 — Build config | Mejor cacheo entre despliegues | Muy bajo |
