// Ejemplos prácticos de cada entrada de la guía (help.js). Solo datos.
//
// Todos los números son ILUSTRATIVOS (para mostrar cómo medir y razonar); no son estadísticas
// ni resultados históricos, y nada de esto es una recomendación de inversión.
//
// Estructura de cada ejemplo:
//   title      título corto
//   scenario   situación concreta con números
//   diagrams   [{ key, caption }]  dibujos extra (claves de DIAGRAMS en help.js)
//   steps      "Qué hacer" paso a paso, en la app
//   outcomes   [{ title, when, means, check }]  escenarios: si pasa X → cómo leerlo → qué comprobar
//   measure    qué medir (y cómo)
//   mistakes   errores comunes
//
// Convención de pips: EUR/USD, 1 pip = 0.0001.

export const EXAMPLES = {
  // ------------------------------------------------------------------ EQH / EQL
  eq: {
    title: 'EUR/USD 15m: un EQH, paso a paso',
    scenario:
      'Activas "EQH / EQL" en EUR/USD 15m. El ATR(14) de este panel es 10 pips, así que la tolerancia de la app es 0.1 × 10 = 1 pip. ' +
      'Dos swing highs consecutivos están en 1.0852 y 1.0853: la diferencia es 1 pip, dentro de tolerancia. ' +
      'La app dibuja una línea punteada gris en 1.0853 (el más alto de los dos) con la etiqueta EQH, y la extiende hacia la derecha mientras el nivel siga intacto.',
    diagrams: [
      { key: 'eq_form', caption: '① Se forma: dos máximos casi iguales. Muchos participantes colocan su stop justo por encima (zona de "×").' },
      { key: 'eq_sweep', caption: '② Escenario A: la mecha lo supera pero la vela cierra de vuelta abajo → sweep (barrido).' },
      { key: 'eq_break', caption: '③ Escenario B: una vela cierra por encima → ruptura, no barrido. El nivel puede pasar a ser soporte (retest).' },
      { key: 'eq_measure', caption: '④ Qué medir: A distancia entre máximos · B velas entre toques · C mecha más allá del nivel · D dónde cierra.' },
    ],
    steps: [
      'Localiza la línea EQH y apunta el nivel (1.0853) y la hora del segundo toque. No operes ni decidas todavía: solo observa.',
      'Mide la calidad del nivel (ver "Qué medir"): ¿1 pip de diferencia o casi 0? ¿cuántas velas separan los dos máximos? ¿hay un tercer toque?',
      'Activa "Niveles de TF mayor" y mira si el nivel está cerca de un swing de 4H o 1D: un EQH que coincide con un nivel mayor es más llamativo.',
      'Cubre con la mano el lado derecho del gráfico y escribe qué esperarías: ¿barrido y rechazo?, ¿ruptura y continuación?, ¿ninguna de las dos?',
      'Destapa y observa qué hizo el precio en las siguientes 10–20 velas. Anota el resultado en tu registro (ver "Qué medir"), aunque salga distinto a lo que esperabas: ahí se aprende.',
    ],
    outcomes: [
      {
        title: 'A · Barrido y rechazo',
        when: 'Una vela llega a 1.0861 con la mecha (8 pips por encima del nivel) pero cierra en 1.0847, por debajo de 1.0853.',
        means: 'La línea EQH se detiene en esa vela y, si tienes "Sweeps" activado, aparece además la marca rosa ▼ sweep. Lectura posible: se tomaron los stops que había encima y el precio no encontró aceptación arriba.',
        check: 'Mira el tamaño de la mecha en ATR (8 pips = 0.8 × ATR) y dónde cerró. Luego baja a 10m: ¿aparece un CHoCH bajista pocas velas después? Si no aparece, un barrido por sí solo dice poco.',
      },
      {
        title: 'B · Ruptura con aceptación',
        when: 'Una vela cierra en 1.0858, 5 pips por encima de 1.0853 (0.5 × ATR). La siguiente vela también cierra por encima.',
        means: 'No es barrido: hubo aceptación por encima del nivel. La línea EQH termina ahí. Si ese swing era el último sin romper, la app marcará además BOS o CHoCH alcista.',
        check: 'Observa si el precio vuelve a testear 1.0853 desde arriba (retest) y si lo sostiene como soporte, o si lo pierde y la ruptura resulta falsa.',
      },
      {
        title: 'C · No pasa nada (nivel vivo)',
        when: 'Pasan 40 velas y el precio ni se acerca al nivel; la línea EQH sigue extendiéndose a la derecha.',
        means: 'El nivel sigue intacto: es una referencia, no una señal. Mientras no se toque, no hay nada que interpretar.',
        check: 'Anota a cuántos pips está del precio actual y si coincide con un nivel de TF mayor. No fuerces una lectura.',
      },
      {
        title: 'D · Toque sin cierre claro',
        when: 'El high llega a 1.0853 exacto (no lo supera) y el precio baja.',
        means: 'Ni barrido ni ruptura: la app lo considera un nivel todavía vivo (para ser sweep la mecha debe superarlo).',
        check: 'Cuenta cuántos toques lleva: tres máximos casi iguales suelen llamar más la atención que dos.',
      },
    ],
    measure: [
      'A · Distancia entre los dos máximos, en múltiplos de ATR (aquí 1 pip / 10 pips = 0.1 × ATR). Cuanto más cerca de 0, más "limpio" es el EQH.',
      'B · Velas entre los dos toques (por ejemplo 12). Si son muy pocas (≤ 4), puede ser solo ruido del mismo movimiento.',
      'Número de toques: 2, 3 o más. Anótalo, la app solo une de a dos swings consecutivos.',
      'C · Tamaño de la mecha que lo supera, en ATR (0.8 × ATR en el ejemplo). Una mecha mínima y una grande no cuentan la misma historia.',
      'D · Dónde cierra la vela respecto al nivel: dentro del rango (barrido) o fuera (ruptura), y cuánto, en ATR.',
      'Velas hasta que aparece una reacción (CHoCH o BOS en una temporalidad menor) o hasta que se invalida.',
      'Contexto: ¿a favor o en contra de la tendencia de 4H/1D (activa "Niveles de TF mayor")?',
    ],
    mistakes: [
      'Tratar todo EQH como si fuera una señal: son zonas de interés, no predicciones. Registra qué pasó cada vez.',
      'Ver "stops encima" y asumir que el precio siempre irá a buscarlos: a veces nunca los toca.',
      'Juzgar con el gráfico ya completo (sesgo de retrospectiva). Cubre la derecha y decide antes de destapar.',
      'Comparar EQH con distinto n o distinta temporalidad sin darte cuenta: cambia n y cambian los swings, y por tanto los EQH.',
      'Confundir barrido con ruptura: depende del cierre, no de la mecha. Espera a que la vela cierre antes de clasificarla.',
      'Esperar que la tolerancia de la app coincida con tu criterio visual: 0.1 × ATR es una elección de esta app.',
    ],
  },

  // ------------------------------------------------------------------ swings
  swings: {
    title: 'EUR/USD 15m con n = 3: leer la secuencia',
    scenario:
      'El precio venía alcista y ahora tienes estos swings. Máximos: 1.0840 → 1.0852 → 1.0846 (sin etiqueta, HH, LH). Mínimos: 1.0825 → 1.0833 → 1.0829 (sin etiqueta, HL, LL). ' +
      'El primer swing de cada tipo no lleva etiqueta porque aún no tiene contra qué compararse. Lo que describe la situación actual son las dos últimas etiquetas: LH y LL.',
    steps: [
      'Cubre la derecha del gráfico y marca a mano los swings que tú ves, con una n propia en mente.',
      'Descubre y compara con lo que marca la app: ¿dónde difieren? Casi siempre es porque ves un swing más pequeño o más grande que el que exige n.',
      'Cambia n a 2 y luego a 5 (botones − / + del panel). Anota qué swings aparecen y cuáles se pierden.',
      'Mira las últimas etiquetas de cada tipo (máximos y mínimos), no solo una.',
    ],
    outcomes: [
      { title: 'A · HH + HL', when: 'Los últimos máximos y mínimos son más altos que los anteriores.', means: 'Estructura alcista.', check: 'Mira si hay un BOS alcista reciente que lo confirme.' },
      { title: 'B · LH + LL', when: 'Como al final del ejemplo: el último máximo es más bajo (LH) y el último mínimo también (LL).', means: 'Estructura bajista: la secuencia alcista previa se rompió.', check: 'Busca el CHoCH que lo marcó y comprueba qué dice la temporalidad mayor.' },
      { title: 'C · Mezcla (HH + LL, o LH + HL)', when: 'Un máximo más alto pero un mínimo más bajo (o al revés).', means: 'Sin tendencia clara: expansión o rango.', check: 'Espera una ruptura (BOS/CHoCH) antes de darle una lectura firme.' },
    ],
    measure: [
      'Tamaño de cada swing en ATR: los movimientos de menos de 1 × ATR suelen ser ruido en esa temporalidad.',
      'Cuántos swings aparecen o desaparecen al pasar de n = 3 a n = 5 (te dice cuán "frágil" es la lectura).',
      'Retraso de confirmación: n velas desde el pico hasta que la app lo marca.',
    ],
    mistakes: [
      'Leer la tendencia con una sola etiqueta (un HH aislado no es una tendencia).',
      'Comparar swings de paneles con n distinto como si fueran iguales.',
      'Olvidar que los swings más recientes todavía no están confirmados: faltan n velas.',
    ],
  },

  // ------------------------------------------------------------------ BOS
  bos: {
    title: 'EUR/USD 4H: ¿cuenta como BOS?',
    scenario:
      'Tendencia alcista en 4H. El último swing high sin romper está en 1.0900 y el ATR(14) del panel es 20 pips. Una vela 4H cierra en 1.0912.',
    steps: [
      'Identifica el último swing sin romper: es la línea que la app dibuja desde ese swing hasta la vela de ruptura.',
      'Comprueba si la vela cerró más allá del nivel o solo lo tocó con la mecha (depende del selector "Ruptura").',
      'Mide cuánto cerró más allá, en ATR, y mira qué hace la siguiente vela.',
    ],
    outcomes: [
      { title: 'A · Cierre claro', when: 'Cierra en 1.0912: 12 pips por encima (0.6 × ATR).', means: 'BOS alcista claro: continuación de la tendencia.', check: '¿La siguiente vela mantiene el cierre por encima de 1.0900?' },
      { title: 'B · Solo mecha', when: 'Llega a 1.0905 con la mecha pero cierra en 1.0895.', means: 'Con "por cierre" no hay BOS. Con "por mecha" sí. Los dos modos describen cosas distintas.', check: 'Cambia el selector y observa cuánto cambian las marcas. ¿Cuál criterio prefieres para aprender?' },
      { title: 'C · Cierre marginal', when: 'Cierra en 1.0901 (1 pip por encima).', means: 'Técnicamente es BOS, pero débil: una ruptura de 0.05 × ATR dice poco.', check: 'Compara con BOS más contundentes y registra cuáles se sostuvieron.' },
    ],
    measure: [
      'Distancia del cierre al nivel roto, en ATR.',
      'Tamaño del cuerpo de la vela de ruptura frente a las anteriores.',
      'Si la siguiente vela cierra de vuelta bajo el nivel (ruptura fallida).',
      'Volumen frente al promedio (si el instrumento lo tiene).',
    ],
    mistakes: [
      'Tomar BOS como "señal de compra": solo describe que la estructura continuó.',
      'Olvidar en qué modo estás (cierre o mecha) al comparar capturas o ejemplos.',
      'Marcar la ruptura antes de que la vela cierre.',
    ],
  },

  // ------------------------------------------------------------------ CHoCH
  choch: {
    title: 'CHoCH en 15m dentro de un 4H alcista',
    scenario:
      'En 4H la última ruptura fue un BOS alcista y la cabecera dice ▲ alcista. En 15m, tras un retroceso, aparece un CHoCH bajista (cierre por debajo del último swing low). ¿Cambió la tendencia?',
    diagrams: [{ key: 'choch_htf', caption: 'Un CHoCH en la temporalidad menor puede ser solo un retroceso dentro de la tendencia mayor.' }],
    steps: [
      'Activa "Niveles de TF mayor" y mira la cabecera de cada panel: ¿qué dice 4H y 1D?',
      'Compara el nivel del CHoCH de 15m con el swing low vigente de 4H (línea cian).',
      'Observa los siguientes swings en 15m: ¿HH/HL de nuevo (se reanuda) o LH/LL (se consolida el cambio)?',
    ],
    outcomes: [
      { title: 'A · Solo en la temporalidad menor', when: '15m hace CHoCH bajista, 4H sigue ▲ y su swing low no se ha perdido.', means: 'Hipótesis: retroceso dentro de la tendencia mayor.', check: 'Si 15m vuelve a hacer un BOS alcista, el retroceso terminó; si sigue con LH/LL, vigila el swing low de 4H.' },
      { title: 'B · También en la mayor', when: '4H pierde su swing low y la cabecera pasa a ▼.', means: 'Cambio de carácter en la temporalidad mayor: más relevante que el de 15m.', check: 'Mira si 1D está de acuerdo o todavía va en sentido contrario.' },
      { title: 'C · Falla', when: 'El precio vuelve y supera el swing high que originó el CHoCH.', means: 'El CHoCH no se sostuvo.', check: 'Cuenta cuántos de tus CHoCH fallan; es información valiosa sobre qué temporalidades son confiables para ti.' },
    ],
    measure: [
      'Velas entre el último BOS y el CHoCH.',
      'Tamaño de la vela que lo rompe, en ATR.',
      'Distancia del nivel de CHoCH al swing de 4H, en ATR del panel.',
      '¿Cuántas temporalidades coinciden (10m, 15m, 4H, 1D)?',
    ],
    mistakes: [
      'Asumir que un CHoCH es una reversión confirmada.',
      'Ignorar la temporalidad mayor.',
      'Etiquetar con la vela todavía abierta.',
    ],
  },

  // ------------------------------------------------------------------ FVG
  fvg: {
    title: 'EUR/USD 15m: un FVG alcista de 12 pips',
    scenario:
      'ATR(14) = 10 pips. La vela 2 sube con fuerza: el high de la vela 1 es 1.0840 y el low de la vela 3 es 1.0852. Queda un hueco alcista de 12 pips (1.2 × ATR) entre 1.0840 y 1.0852. La app lo dibuja con un rectángulo punteado verde.',
    steps: [
      'Activa FVG y localiza un hueco reciente. Anota sus dos bordes (en el ejemplo, 1.0840 y 1.0852).',
      'Fíjate si va a favor de la tendencia de la temporalidad mayor (usa "Niveles de TF mayor").',
      'Observa qué hace el precio cuando vuelve a la zona, si vuelve.',
    ],
    outcomes: [
      { title: 'A · Entra y rebota', when: 'El precio baja hasta 1.0846 (a mitad del hueco) y vuelve a subir.', means: 'La zona se comportó como soporte; sigue visible porque no se llenó por completo.', check: 'Anota qué porcentaje del hueco se recorrió antes del rebote (50% en el ejemplo).' },
      { title: 'B · Se llena por completo', when: 'Una vela llega a 1.0840 o menos.', means: 'El hueco desaparece del gráfico: el movimiento fue absorbido.', check: '¿Qué hizo el precio después de llenarlo? Compáralo con los que rebotaron.' },
      { title: 'C · No vuelve', when: 'El precio sigue subiendo y nunca regresa.', means: 'Queda "vivo" un tiempo; muchos FVG nunca se revisitan.', check: 'No lo des por válido solo porque existe.' },
    ],
    measure: [
      'Tamaño del hueco en ATR (aquí 1.2 × ATR). Los muy pequeños son ruido.',
      'Velas hasta el primer regreso.',
      'Porcentaje del hueco recorrido antes de reaccionar.',
      '¿Coincide con un OB o con un nivel de TF mayor?',
    ],
    mistakes: [
      'Marcar todos los huecos: filtra por tamaño y por contexto.',
      'No distinguir los que van a favor de los que van en contra de la tendencia mayor.',
      'Esperar que siempre se llenen.',
    ],
  },

  // ------------------------------------------------------------------ OB
  ob: {
    title: 'EUR/USD 15m: un Order Block alcista',
    scenario:
      'Un BOS alcista rompe el swing high de 1.0880. Entre ese swing y la ruptura, el mínimo está en una vela bajista de rango 1.0858–1.0866. La app dibuja esa zona (rectángulo verde con "OB") hacia la derecha.',
    steps: [
      'Antes de activar el indicador, intenta identificar a mano la última vela bajista antes del impulso.',
      'Activa OB y compara tu elección con la de la app.',
      'Observa si el precio regresa a la zona y cómo reacciona.',
    ],
    outcomes: [
      { title: 'A · Regresa y rechaza', when: 'El precio baja a 1.0864 y rebota sin cerrar bajo 1.0858.', means: 'La zona fue respetada; sigue visible.', check: 'Anota cuánto se internó (en ATR) antes de rebotar.' },
      { title: 'B · Mitigado', when: 'Una vela cierra en 1.0855, bajo el borde inferior.', means: 'La zona deja de dibujarse: la app la considera invalidada.', check: 'Compara cuántos OB se respetan y cuántos se pierden en distintas temporalidades.' },
      { title: 'C · No regresa', when: 'El precio sigue sin volver.', means: 'No hay nada que leer todavía.', check: 'Espera.' },
    ],
    measure: [
      'Alto de la zona en ATR (una zona muy grande es poco precisa).',
      'Si viene de un BOS o de un CHoCH: anótalo y compara resultados por separado.',
      'Velas entre la ruptura y el primer regreso.',
      'Alineación con la tendencia de la temporalidad mayor.',
    ],
    mistakes: [
      'Tomar un OB en medio de un rango, sin ruptura clara.',
      'Creer que todos son válidos: los OB cambian al cambiar n (cambian los swings).',
      'Olvidar que hay varias definiciones; la tuya puede diferir de esta.',
    ],
  },

  // ------------------------------------------------------------------ Sweep
  sweep: {
    title: 'EUR/USD 15m: barrido de un máximo',
    scenario:
      'Hay un swing high en 1.0853. Una vela llega a 1.0861 con la mecha pero cierra en 1.0847. ATR(14) = 10 pips. La app marca "▼ sweep" y una línea rosa desde el swing hasta esa vela.',
    diagrams: [{ key: 'eq_sweep', caption: 'Mecha por encima del nivel, cierre de vuelta dentro: sweep.' }],
    steps: [
      'Espera a que la vela cierre antes de clasificarla: durante la vela todavía puede convertirse en ruptura.',
      'Mide la mecha y dónde cerró (ver "Qué medir").',
      'Baja a una temporalidad menor y busca qué ocurre en las siguientes velas.',
    ],
    outcomes: [
      { title: 'A · Barrido + CHoCH menor', when: 'En 10m aparece un CHoCH bajista pocas velas después.', means: 'Patrón clásico de estudio: toma de liquidez seguida de cambio de carácter.', check: 'Cuenta cuántas veces el patrón se completa y cuántas no.' },
      { title: 'B · Barrido y el precio retoma', when: 'Tras el sweep el precio vuelve a subir y supera el máximo de la mecha.', means: 'El barrido no tuvo seguimiento.', check: 'Anótalo igual: los fallos también son datos.' },
      { title: 'C · Cierra más allá', when: 'La vela cierra en 1.0858.', means: 'Ya no es sweep: es ruptura (BOS/CHoCH).', check: 'Cambia de lectura, no insistas en el barrido.' },
    ],
    measure: [
      'Mecha más allá del nivel, en ATR (0.8 × ATR en el ejemplo).',
      'Distancia del cierre al nivel.',
      'Velas hasta la reacción en la temporalidad menor.',
      'Contexto: ¿a favor o en contra de la tendencia mayor?',
    ],
    mistakes: [
      'Llamar sweep a toda mecha: debe superar un swing real y cerrar de vuelta.',
      'Clasificar con la vela abierta.',
      'Ver un solo ejemplo exitoso y generalizar.',
    ],
  },

  // ------------------------------------------------------------------ Externa
  ext: {
    title: 'n = 3 (interna) frente a n = 9 (externa)',
    scenario:
      'En 15m aparecen 3 CHoCH internos en 20 velas, pero ninguno externo. La tendencia externa (líneas gruesas) sigue siendo la misma.',
    steps: [
      'Activa "Externa (n×3)" y fíjate en las píldoras grandes.',
      'Cada vez que haya un CHoCH interno, comprueba si coincide con uno externo.',
      'Cambia n y observa cómo cambia la externa (n × 3).',
    ],
    outcomes: [
      { title: 'A · CHoCH interno sin externo', when: 'Solo hay líneas finas.', means: 'Suele leerse como retroceso o corrección dentro de un movimiento mayor.', check: 'Observa si el movimiento mayor se reanuda.' },
      { title: 'B · CHoCH externo', when: 'Aparece una píldora grande de CHoCH.', means: 'Cambio de carácter en la escala mayor.', check: 'Comprueba qué dice la temporalidad superior.' },
    ],
    measure: [
      'Velas entre un CHoCH externo y el siguiente.',
      'Cuántos CHoCH internos ocurren entre dos externos.',
    ],
    mistakes: [
      'Confundir "externa" con "temporalidad mayor": es la misma temporalidad, con n más grande.',
      'Aumentar n hasta que no quede nada que interpretar.',
    ],
  },

  // ------------------------------------------------------------------ HTF
  htf: {
    title: '10m con la mirada puesta en 4H y 1D',
    scenario:
      'En 10m aparece un CHoCH alcista. Una línea cian (4H swing high) está en 1.0880, a 15 pips por encima; una línea morada (1D BOS ▼) está en 1.0910. El ATR de 10m es 6 pips.',
    diagrams: [{ key: 'htf', caption: 'Las líneas de temporalidades mayores aparecen en tu panel.' }],
    steps: [
      'Activa "Niveles de TF mayor" y lee las etiquetas a la derecha.',
      'Compara la dirección de la última ruptura de 1D y 4H con la del CHoCH de 10m.',
      'Mide la distancia del precio al próximo nivel mayor.',
    ],
    outcomes: [
      { title: 'A · Alineado', when: '1D y 4H también van al alza y el nivel está lejos.', means: 'El CHoCH menor va a favor del contexto.', check: 'Anota qué tan lejos queda el próximo nivel mayor.' },
      { title: 'B · En contra', when: 'Como en el ejemplo: 1D ▼ y un swing high de 4H a 15 pips.', means: 'El CHoCH menor choca con el contexto: hay poco recorrido antes de un nivel relevante.', check: '15 pips = 2.5 × ATR de 10m. ¿Es poco recorrido para lo que estudias?' },
    ],
    measure: [
      'Distancia al nivel mayor en ATR del panel.',
      'Cuántas temporalidades coinciden en la dirección.',
      'Qué pasa cuando el precio llega a un nivel de 4H o 1D (rebote, ruptura, nada).',
    ],
    mistakes: [
      'Esperar que las líneas actúen como muros: son referencias.',
      'No mirar la cabecera: ahí está la dirección de cada temporalidad.',
    ],
  },

  // ------------------------------------------------------------------ EMA
  ema: {
    title: 'EMA 50 y EMA 200 en 4H',
    scenario:
      'En 4H el precio está por encima de ambas EMAs y la EMA 50 está por encima de la 200. Un CHoCH bajista aparece en 15m.',
    steps: [
      'Activa las dos EMAs en 4H y en 15m.',
      'Observa cómo se comporta la estructura en las zonas donde el precio toca la EMA.',
    ],
    outcomes: [
      { title: 'A · Retroceso hasta la EMA', when: 'El precio baja hasta la EMA 50 de 4H y rebota.', means: 'Es una zona de interés que muchos observan.', check: 'Anota cuántas veces el rebote se produce y cuántas no.' },
      { title: 'B · Pierde la EMA 200', when: 'Cierra por debajo de la EMA 200.', means: 'Cambio de contexto de más largo plazo.', check: 'Compara con lo que haya hecho la estructura.' },
    ],
    measure: [
      'Distancia del precio a la EMA, en ATR.',
      'Inclinación de la EMA (¿se aplana?).',
    ],
    mistakes: [
      'Tratar los cruces de EMAs como señales por sí solos: son indicadores rezagados.',
      'Comparar EMAs con pocas velas cargadas (la EMA 200 necesita 200).',
    ],
  },

  // ------------------------------------------------------------------ VWAP
  vwap: {
    title: 'VWAP en una sesión de acciones (15m)',
    scenario:
      'Una acción abre y sube; el VWAP diario (línea amarilla) la acompaña por debajo. Más tarde el precio cae y cruza el VWAP hacia abajo.',
    steps: [
      'Activa VWAP en 15m o 10m de una acción (no en 1D ni en forex).',
      'Observa cómo reacciona el precio cuando se acerca al VWAP.',
    ],
    outcomes: [
      { title: 'A · Respeta el VWAP', when: 'El precio retrocede al VWAP y continúa.', means: 'Se suele leer como el "precio medio del día" actuando como soporte.', check: 'Cuenta cuántas veces ocurre en la sesión.' },
      { title: 'B · Lo pierde', when: 'Cierra por debajo y se mantiene debajo.', means: 'Los compradores del día pagaron por encima del promedio y ahora están en pérdida.', check: 'Compara con la estructura (¿hubo CHoCH?).' },
    ],
    measure: [
      'Distancia del precio al VWAP en ATR.',
      'Velas que el precio pasa por encima o por debajo.',
    ],
    mistakes: [
      'Usarlo en forex: no hay volumen en IB y la app no lo calcula.',
      'Olvidar que se reinicia cada día.',
    ],
  },

  // ------------------------------------------------------------------ Volumen
  vol: {
    title: 'Volumen en una ruptura (acciones)',
    scenario:
      'Una acción rompe un máximo con BOS alcista. El volumen de esa vela es 2.5 veces el promedio de las últimas 20 velas.',
    steps: [
      'Activa Volumen y localiza el BOS.',
      'Compara la barra de la vela de ruptura con las anteriores.',
    ],
    outcomes: [
      { title: 'A · Volumen alto', when: 'La vela de ruptura tiene volumen muy superior al promedio.', means: 'Mayor participación en la ruptura.', check: '¿Continúa el precio en las siguientes velas?' },
      { title: 'B · Volumen bajo', when: 'La ruptura ocurre con volumen similar o menor al promedio.', means: 'Menos participación; no es garantía de fallo.', check: 'Registra cuántas rupturas con poco volumen se sostuvieron.' },
    ],
    measure: [
      'Volumen de la vela dividido por el promedio de las últimas 20 velas.',
      'Si las velas de retroceso tienen menos volumen que las de impulso.',
    ],
    mistakes: [
      'Esperar volumen en forex: IB entrega MIDPOINT (sin volumen).',
      'Interpretar un volumen alto como dirección: puede ser compra o venta.',
    ],
  },
};
