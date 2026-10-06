# market-structure

MVP para **aprender a marcar estructura de mercado** (no para operar): trae velas de Interactive Brokers y dibuja
**HH / HL / LH / LL**, **BOS** y **CHoCH** en 4 temporalidades a la vez (1D, 4H, 15m, 10m).

- Node + Express en el servidor, navegador para la visualización ([lightweight-charts](https://github.com/tradingview/lightweight-charts)).
- Cada pestaña del navegador es independiente: el estado vive en la URL (símbolo, layout, parámetros).
- Buscador de símbolos contra IB y favoritos guardados en una cookie.

## Puesta en marcha

1. **Abre IB Gateway** (no IBKR Desktop: esa app no expone la API) con tu cuenta **paper**.
   En *Configure → Settings → API → Settings*:
   - ✅ Enable ActiveX and Socket Clients
   - Socket port: `4002` (Gateway paper) — `4001` live, `7497` TWS paper, `7496` TWS live
   - Trusted IPs: `127.0.0.1`
   - ✅ Read-Only API (este proyecto no envía órdenes)
2. Instala y arranca:
   ```bash
   npm install
   npm start            # usa IB en 127.0.0.1:4002
   # IB_PORT=7497 npm start   ← si usas TWS paper
   ```
3. Abre <http://127.0.0.1:3000>.

**Sin IB** (para probar la interfaz con datos simulados): `npm run mock`.
Tests de la lógica de estructura: `npm test`.

## Uso

| Acción | Cómo |
|---|---|
| Buscar símbolo | Escribe en el buscador (↑↓ Enter). `Ctrl/⌘+Enter` lo abre en pestaña nueva |
| Favorito | ★ junto al símbolo. Chips debajo de la barra: clic = cargar aquí, `↗` = pestaña nueva |
| Layout 4 → 2 → 1 | Botón **Layout** o tecla `L` |
| Qué temporalidad ver (layouts 2 y 1) | Chips `1D 4H 15m 10m` o clic en el título de un panel. Doble clic = maximizar |
| Otro símbolo en paralelo | **Duplicar pestaña ↗** y cambia el símbolo en una de las dos |
| Ajustar sensibilidad | `n` de cada panel (− / +) |
| Ruptura por cierre o por mecha | Selector **Ruptura** |

## Cómo se marca (reglas en `public/js/structure.js`)

- **Swing high/low**: máximo (mínimo) mayor (menor) que las `n` velas a cada lado. Se **confirma `n` velas después**,
  por eso las marcas más recientes aparecen con retraso: es normal en cualquier indicador de swings.
- **HH/LH, HL/LL**: cada swing se compara con el anterior de su mismo tipo.
- **Ruptura** del último swing aún no roto:
  - a favor de la tendencia vigente → **BOS**
  - en contra → **CHoCH** (la tendencia pasa a la contraria)
  - la primera ruptura del gráfico fija la tendencia y se marca como BOS.

El `n` correcto depende de la temporalidad y de tu criterio: si ves demasiado ruido sube `n`; si faltan swings, bájalo.

## Límites conocidos del MVP

- Soporta acciones/ETF (`STK`), índices (`IND`) y forex (`CASH`). **Futuros no** (requieren elegir vencimiento).
- **Forex:** la búsqueda de texto de IB no devuelve pares, así que se ofrecen 14 pares IDEALPRO desde `server/forex.js` (EUR.USD, GBP.USD, USD.JPY…). Busca `EUR.USD`, `eurusd` o `gbp`. Para agregar más pares, edita esa lista.
- Horario regular de mercado por defecto (`USE_RTH=0` para incluir pre/post).
- Horas mostradas en hora de Nueva York (`DISPLAY_TZ` en `public/js/api.js`).
- Sin suscripción de datos, IB entrega datos con retraso o rechaza algunos símbolos (el panel muestra el error de IB).
- IB limita las peticiones históricas (~60 / 10 min): el servidor cachea y espacia las peticiones.
- Los favoritos son una cookie del origen `127.0.0.1:3000`; si cambias de host/puerto no los verás.

## Estructura

```
server/   config.js · ib.js (cliente IB, caché, pacing) · forex.js · mock.js · index.js (Express)
public/   index.html · css/ · js/ (app, panel, structure, indicators, help, examples, structurePrimitive, favorites, api)
test/     structure.test.js · indicators.test.js · forex.test.js · help.test.js
```

## Indicadores opcionales (menú **Indicadores ▾**)

Todos están **apagados por defecto**. Se guardan en la URL (así "Duplicar pestaña" copia la vista) y en la cookie
`ms_ind` (una pestaña nueva sin parámetros recuerda tu último uso). Se aplican a los 4 paneles.

**Guía contextual (`?`).** Cada marca tiene un botón `?` (en el menú de indicadores, junto a HH/HL/LH/LL y BOS/CHoCH,
y al lado del `n` de cada panel) y hay un botón **? Guía** en la barra superior. Abre un panel lateral con un diagrama,
qué es, cómo leerlo, la regla exacta que aplica la app, qué practicar y sus límites. Desde la guía también puedes
encender o apagar el indicador sin cerrarla; los gráficos se reajustan para seguir viéndose. `Esc` cierra.
El contenido está en `public/js/help.js`.

Cada entrada de la guía incluye un **ejemplo paso a paso** con números ilustrativos: la situación, qué hacer en la app,
los escenarios posibles ("si pasa A → cómo leerlo → qué comprobar"), qué medir y errores comunes. **EQH/EQL** tiene el
más detallado, con 4 diagramas (cómo se forma, barrido, ruptura y dónde medir). Los ejemplos están en `public/js/examples.js`.
Los números son ilustrativos, no estadísticas ni recomendaciones.

| Indicador | Qué muestra | Regla exacta |
|---|---|---|
| **FVG** | Hueco de 3 velas que el precio aún no cubrió | Alcista: `low[i] > high[i-2]`; bajista: `high[i] < low[i-2]`. Mínimo 0.25×ATR(14). Se oculta cuando una vela lo llena por completo. Máx. 10 recientes |
| **Order Blocks** | Zona de la última vela contraria antes de una ruptura de estructura | Entre el swing roto y la ruptura se toma el extremo (mínimo en alcista); el OB es la última vela contraria en ese punto (hasta 2 velas antes). Se oculta cuando un **cierre** atraviesa la zona. Máx. 6 |
| **EQH / EQL** | Máximos/mínimos casi iguales (liquidez) | Dos swings consecutivos del mismo tipo a ≤ 0.1×ATR. La línea se extiende hasta que se barre o se rompe. Máx. 8 |
| **Sweeps** | Barrido de liquidez | La mecha supera un swing y la vela **cierra de vuelta** dentro. Si cierra más allá es ruptura (BOS/CHoCH), no sweep. Máx. 12 |
| **Externa (n×3)** | Segunda escala de estructura | Mismo algoritmo con `n` triplicado; se dibuja con etiquetas tipo píldora y líneas gruesas encima de la interna |
| **Niveles de TF mayor** | Guía de alineamiento top-down | En cada panel, swing high/low vigentes y última ruptura de las temporalidades superiores (1D morado, 4H cian, 15m lima). Si hace falta, carga en segundo plano paneles que no ves. Solo se ven si caen dentro del rango de precios visible |
| **EMA 50 / 200** | Medias móviles exponenciales | Sembradas con SMA. La EMA 200 necesita 200 velas |
| **VWAP (diario)** | Precio medio ponderado por volumen | Se reinicia cada día (hora de la bolsa). No aplica en 1D |
| **Volumen** | Histograma inferior | Forex no tiene volumen (IB entrega MIDPOINT): el panel lo avisa |

Las zonas y niveles son una **ayuda visual para practicar**; con todo activado el gráfico se satura, por eso conviene
encender uno o dos a la vez.

## 📝 Pendiente por aprender

- **Rol de cada temporalidad (análisis top-down).** El MVP trata las 4 temporalidades con el mismo peso porque el objetivo
  es solo aprender a marcar. Aún hay que entender cómo se usan juntas: 1D = sesgo general, 4H = estructura relevante,
  15m = confirmación, 10m = ejecución fina. Estudiar: ¿qué CHoCH/BOS de una temporalidad menor "cuenta" solo si
  está alineado con la mayor? Cuando esto quede claro, se puede diseñar un layout que dé más peso a una de ellas.
