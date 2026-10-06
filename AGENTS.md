# AGENTS.md

Contexto para cualquier IA (o persona) que trabaje en este repositorio. Léelo completo antes de cambiar nada.
Idioma de trabajo con el usuario: **español**. Identificadores de código, comentarios técnicos breves y nombres de archivo: como ya están en el repo.

Última actualización: 2026-10-06 (i18n es/en).

---

## 1. Qué es este proyecto

**market-structure** es un MVP para **aprender a marcar estructura de mercado**, no para operar.
Trae velas de Interactive Brokers (IB) y dibuja sobre ellas, en 4 temporalidades a la vez (1D, 4H, 15m, 10m):

- Swings y etiquetas **HH / HL / LH / LL**
- **BOS** (Break of Structure) y **CHoCH** (Change of Character)
- Indicadores opcionales (todos *toggleables*): FVG, Order Blocks, EQH/EQL, Sweeps, estructura externa (n×3),
  niveles de temporalidades mayores, EMA 50/200, VWAP diario y volumen
- Una **guía contextual** (botones `?`) con diagramas, la regla exacta que usa la app y ejemplos paso a paso

Se usa en el navegador (servidor Node local + páginas estáticas). Cada pestaña es independiente: puede mostrar otro símbolo.

### Objetivo de fondo
Que el usuario **entrene el ojo**: aprender qué es cada marca, cómo se mide y cómo se interpreta, comparando lo que
él marcaría con lo que marca el algoritmo.

### Lo que NO es (no-objetivos)
- **No es un sistema de trading.** No envía órdenes, no da señales de compra/venta, no hace backtesting de rentabilidad.
- No es asesoramiento financiero. La guía y los ejemplos lo dicen explícitamente; mantén esa postura.
- No pretende ser la definición "correcta" de cada concepto: las definiciones son las de esta app y entre traders varían.

---

## 2. Perfil del usuario

Solo se incluye lo que el usuario ha dicho o lo que se deduce directamente de la conversación. **No rellenes huecos con suposiciones.**

**Lo que sabemos**
- Hispanohablante, zona horaria **America/Bogotá (UTC−5)**. Trabaja en **macOS** (rutas `/Users/anclavijo/...`).
- Quiere **aprender a marcar estructura, no entrar todavía** al mercado: "solo aprender a marcar".
- Conceptos con los que trabaja: ChoCH, BOS, HH/HL/LH/LL, EQH, top-down entre 1D / 4H / 15m / 10m. Pidió ayuda para entender
  EQH y dijo que necesita aprender más sobre el **rol de cada temporalidad** (análisis top-down). Eso está anotado como
  "Pendiente por aprender" en el README.
- Instrumentos que ha buscado: **EUR.USD y GBP.USD** (forex). No está confirmado qué más estudia (las pruebas del repo usan también acciones como AAPL, por conveniencia).
- Tiene **IBKR Desktop** e **IB Gateway** instalados. IBKR solo permite **una sesión por usuario**, así que no puede tener
  Desktop y Gateway con el mismo usuario a la vez (ver §8).
- Preferencias técnicas declaradas: **Node, JavaScript plano (sin TypeScript)**, "sencillo y práctico", MVP, visualización en el navegador.
- Pidió favoritos guardados en **cookie** y un **buscador de símbolos de IB**.
- Pidió que los extras sean **opcionales (toggleables)** y que las explicaciones vengan con **ejemplos concretos**:
  qué hacer, qué medir, qué interpretar.
- En `server/config.js` cambió el puerto de IB por defecto a **4001** (IB Gateway *live*). No lo revertir ni "corregir" sin preguntar.

**Lo que NO sabemos (no lo asumas)**
- Su nivel de experiencia, capital, si opera en real, qué broker usa para ejecutar, ni si usa cuenta paper o real en Gateway
  (el puerto 4001 sugiere real, pero no está confirmado).
- Qué definición de Order Block, FVG o liquidez prefiere (la app implementa una; ver §6).

---

## 3. Cómo colaborar con este usuario

- Responde en **español**, directo y sin relleno. Explica el *porqué* de una decisión en una o dos frases.
- **Pregunta antes de construir** cuando haya varias formas razonables y cada una añade complejidad (se hizo con el menú de indicadores).
- Si algo **no se pudo probar**, dilo. Hoy lo no verificado es todo lo que requiere IB real (ver §7).
- Prefiere lo simple. No introduzcas frameworks, bundlers, TypeScript ni bases de datos sin que lo pida.
- Todo extra visual va **apagado por defecto** y con su `?` en la guía.
- Cuando expliques conceptos de mercado: ejemplo con números, qué medir, escenarios "si pasa A → lectura → qué comprobar",
  y errores comunes. Aclara que los números son **ilustrativos**.
- No des opiniones de inversión ("compra aquí", "esto va a subir"). Describe qué mirar y cómo registrar resultados.
- Antes de **sobrescribir un archivo** que el usuario pueda haber editado, compara el contenido con lo último entregado.

---

## 4. Stack y arquitectura

```
IB Gateway / TWS (local)  ──socket TCP──▶  Servidor Node (Express)  ──HTTP JSON──▶  Navegador (N pestañas)
        puerto 4001 (cfg)                  server/                                   public/ (ES modules)
```

- **Node ≥ 18**, ESM (`"type": "module"`). Dependencias: `express`, `@stoqey/ib`, `lightweight-charts` (v5, se sirve desde
  `node_modules` en `/vendor`, sin CDN). Sin build step.
- **Un solo servidor, una sola conexión a IB**, compartida por todas las pestañas. Escucha solo en `127.0.0.1`.
- Estado de cada pestaña **en la URL** (símbolo, layout, `n` por panel, modo de ruptura, indicadores). "Duplicar pestaña" copia la URL.
- Cookies: `ms_favs` (favoritos), `ms_ind` (último uso de indicadores) y `ms_lang` (idioma elegido con el botón ES/EN). Son del **host** `127.0.0.1` (no dependen del puerto): si el usuario abre la app como `localhost`, no verá las mismas cookies.

```
server/
  config.js      puertos, TIMEFRAMES (barSize/duration/ttl), useRTH, límites de IB
  ib.js          cliente IB: conexión/reconexión, búsqueda, histórico, caché, cola (pacing), forex
  forex.js       lista de pares IDEALPRO y búsqueda (reqMatchingSymbols NO devuelve forex)
  mock.js        datos simulados (MOCK=1) para probar la interfaz sin IB
  index.js       Express: /api/status, /api/search, /api/bars, estáticos
public/
  index.html · css/style.css
  js/app.js                 estado en URL, layout 4/2/1, buscador, favoritos, menú de indicadores, guía
  js/panel.js               un panel = una temporalidad (gráfico, series, estructura, indicadores)
  js/structure.js           swings, HH/HL/LH/LL, BOS, CHoCH   ← PURO, con tests
  js/indicators.js          ATR, EMA, VWAP, FVG, OB, EQH/EQL, Sweeps ← PURO, con tests
  js/structurePrimitive.js  dibujo sobre el canvas del gráfico (zonas abajo, marcas arriba)
  js/help.js · js/examples.js   contenido de la guía y de los ejemplos (solo datos) + diagramas SVG
  js/help.en.js · js/examples.en.js   la misma guía y ejemplos en inglés (mismas claves)
  js/i18n.js · js/locales/{es,en}.js   idioma activo, t('clave') y textos de la interfaz
  js/api.js · js/favorites.js   cliente del backend / cookie de favoritos
test/                       node:test (structure, indicators, forex, help)
```

**Idiomas (i18n)**: español (por defecto) e inglés. `public/js/i18n.js` decide el idioma al cargar: cookie `ms_lang`
(botón ES/EN de la barra) o, si no hay, `lang` de `server/config.js` (`APP_LANG`), que llega por `/api/status`.
Todo texto de interfaz nuevo va como clave en `locales/es.js` **y** `locales/en.js` (un test compara las claves) y se usa con `t('clave')`;
en el HTML estático, con `data-i18n` / `data-i18n-title` / `data-i18n-placeholder` / `data-i18n-aria-label`.
Las etiquetas de mercado (HH, BOS, CHoCH, FVG, OB, sweep…) no se traducen. Los errores que manda IB se muestran tal cual.
Ojo: no nombres `t` a una variable local en `app.js` / `panel.js` (taparía la función de traducción).

Flujo de datos: `app.js` pide barras por panel → `api.js` normaliza (tiempo desplazado a hora de Nueva York) →
`panel.js` llama a `detectStructure` e indicadores → `structurePrimitive.js` dibuja.

---

## 5. Comandos

```bash
npm install
npm start        # IB en 127.0.0.1:4001 (por defecto en config.js). IB_PORT=4002 npm start para Gateway paper
npm run mock     # datos simulados, sin IB
npm test         # node --test  (debe pasar completo antes de entregar cualquier cambio)
```

Variables de entorno útiles: `IB_PORT`, `IB_HOST`, `IB_CLIENT_ID` (17), `PORT` (3000), `USE_RTH=0` (incluye pre/post), `MOCK=1`, `APP_LANG=en` (idioma por defecto; `es` si no se indica).
Puertos de IB: Gateway live 4001 / paper 4002; TWS live 7496 / paper 7497.

---

## 6. Definiciones y decisiones que NO deben cambiar sin avisar

Si cambias una regla, actualiza a la vez: el código, `help.js`, `examples.js` (y sus versiones `.en.js`), el README y los tests.

**Estructura (`structure.js`)**
- Swing high: máximo mayor que las `n` velas anteriores (estricto) y `≥` las `n` posteriores. Swing low: simétrico.
  Un swing se **confirma `n` velas después** (esto es inherente y está documentado al usuario).
- Etiquetas: cada swing se compara con el anterior **del mismo tipo** (HH/LH en máximos, HL/LL en mínimos). El primero de cada tipo no lleva etiqueta.
- Ruptura del último swing aún no roto: a favor de la tendencia → **BOS**; en contra → **CHoCH**. La primera ruptura fija la tendencia y se marca BOS.
- Modo `close` (por defecto) o `wick`. El resultado incluye `active.high/low` (niveles vigentes, los usan los niveles de TF mayor).

**Indicadores (`indicators.js`)** — constantes en `panel.js` (`MAX`, `EXT_FACTOR = 3`)
- **FVG**: `low[i] > high[i-2]` (alcista) / `high[i] < low[i-2]` (bajista), tamaño mínimo `0.25 × ATR(14)`; desaparece cuando una vela lo llena por completo. Máx. 10 recientes.
- **Order Block**: tras cada BOS/CHoCH se toma el extremo entre el swing roto y la ruptura; el OB es la última vela contraria ahí (hasta 2 antes). Se muestra completo (mecha a mecha). Mitigado cuando un **cierre** lo atraviesa. Máx. 6.
- **EQH/EQL**: dos swings consecutivos del mismo tipo con diferencia `≤ 0.1 × ATR(14)`. Termina en barrido o ruptura. Máx. 8.
- **Sweep**: la mecha supera un swing y la vela cierra de vuelta dentro (si cierra más allá es ruptura). Cada swing da como mucho un sweep.
  La vela que **forma** un EQH (segundo máximo casi igual) **no** cuenta como sweep, y una vela que barre varios niveles se marca una sola vez. Máx. 12.
- **Externa**: mismo algoritmo con `n × 3`. **Niveles de TF mayor**: cada panel recibe solo las temporalidades superiores (1D no recibe nada).
- **VWAP** diario (no aplica en 1D ni sin volumen). **Volumen**: forex no tiene (IB entrega MIDPOINT; los `-1` de IB se normalizan a 0).

**Tiempos**: lightweight-charts dibuja en UTC; las velas se desplazan por el offset de `America/New_York` (`DISPLAY_TZ` en `api.js`). La vela diaria se alinea a medianoche de su día.

---

## 7. Estado de verificación (sé honesto con esto)

| Parte | Estado |
|---|---|
| Lógica de estructura e indicadores | Cubierta por tests (`npm test`) |
| Interfaz (layouts, menú, guía, favoritos, cursor sincronizado, cookies) | Probada en Chromium headless con datos simulados |
| Cliente IB (búsqueda, histórico, forex) | Probado **solo contra un IB falso** que emite los mismos eventos; verificado contra los typings de `@stoqey/ib` |
| **Conexión con IB Gateway real** | **No verificada por la IA.** Las pruebas reales las hace el usuario |
| Permisos de datos para forex/acciones en su cuenta | Desconocido: IB puede rechazar series sin suscripción (el panel muestra el error de IB) |

Si el usuario reporta un error de IB, pídele el mensaje exacto (código y texto) antes de especular.

---

## 8. Cosas que ya nos mordieron (gotchas)

- `reqMatchingSymbols` **no devuelve pares de forex**. Se resuelven con una lista (`forex.js`) y `reqContractDetails` para obtener el `conId`.
- Forex usa `MIDPOINT` (no `TRADES`) y no tiene volumen; las barras diarias pueden llegar como `yyyymmdd` (se normaliza en `ib.js`).
- Fin de histórico en `@stoqey/ib`: un evento `historicalData` cuyo `time` empieza con `finished`. Errores informativos 2100–2999 no son fallos (`isNonFatalError`).
- IB limita ~60 peticiones históricas por 10 min: hay caché con TTL y cola con pausa (`historicalGapMs`). No lo quites.
- **Una sesión por usuario en IBKR**: el mismo usuario no puede estar a la vez en IBKR Desktop y en Gateway. Opciones: cuenta paper con usuario propio,
  usuario secundario, o (con datos compartidos) renunciar a usar los datos en ambos a la vez. No uses Client Portal con el mismo usuario que Gateway.
- Cookies compartidas entre pestañas; los cambios de una pestaña llegan a las demás al recuperar el foco.
- Un `Number('')` es `0`: al leer parámetros de la URL usa `parseInt` y valida (ya hubo un bug así con `n`).
- Un test que falló por un dato mal construido no siempre indica un bug del código: revisa el dato antes de "arreglar" la lógica.

---

## 9. Seguridad y límites (reglas duras)

1. **Nunca** añadas envío de órdenes, ni modificación de cuenta, ni endpoints que ejecuten acciones de trading. Este proyecto es solo lectura.
2. Mantén el servidor en **`127.0.0.1`**; no lo expongas a la red. En Gateway, el usuario debe mantener **Read-Only API** activado.
3. No registres, subas ni compartas credenciales, números de cuenta ni datos de posiciones.
4. Contenido educativo: mantén los avisos de "ilustrativo / no es recomendación de inversión".
5. No insertes datos externos como HTML sin escapar: la UI usa `textContent`; el SVG de los diagramas es propio y estático (hay un test que lo comprueba).
6. Respeta la atribución de `lightweight-charts` (el logo de TradingView se muestra por defecto; no lo ocultes).

---

## 10. Trabajo pendiente e ideas (no prometido; confirmar con el usuario antes)

- **Registro de observaciones**: apuntar cada EQH/sweep/FVG con sus medidas (distancia en ATR, mecha, cierre, resultado) para que el usuario aprenda de sus propios casos.
- **Modo práctica**: el usuario marca swings/CHoCH con clics y luego se compara con lo que marcó el algoritmo.
- Toggles **por panel** (hoy aplican a los 4 paneles a la vez).
- Layout con más peso a una temporalidad (cuando el usuario aclare el "rol" de cada una; ver README).
- Futuros (requieren elegir vencimiento), más pares de forex (editar `FOREX_PAIRS`), sesiones (Asia/Londres/NY) y niveles del día/semana anterior.
- Pruebas contra IB real en cuanto el usuario pueda aportar resultados (códigos de error de permisos de datos, `reqContractDetails` de forex, etc.).

---

## 11. Reglas para cambiar código

1. Mantén la lógica de detección **pura** (sin DOM ni Node) para poder testearla.
2. Todo indicador nuevo: función pura + tests en `test/`, entrada en `help.js` **y** `examples.js` y en sus versiones `.en.js` (hay tests que exigen que existan, estén completas y tengan la misma forma en ambos idiomas),
   interruptor en el menú, clave en `IND_KEYS` de `app.js` (y la copia de esa lista en `test/help.test.js`), y fila en la tabla del README.
3. Corre `npm test` antes de entregar. Si tocas la interfaz, pruébala en un navegador headless con `npm run mock` y mira una captura.
4. No cambies `server/config.js` (puerto, clientId) sin preguntar: el usuario lo ajustó a su entorno.
5. Actualiza el README y este archivo cuando cambie algo de lo descrito aquí.
6. Cambios pequeños y verificables; evita refactors amplios sin que se pidan.
