// Configuración central. Todo se puede sobreescribir con variables de entorno.
//
// Puertos típicos de IB:
//   IB Gateway  paper 4002  |  live 4001
//   TWS         paper 7497  |  live 7496
export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '127.0.0.1', // solo local: no expongas esto a la red
  mock: process.env.MOCK === '1',        // datos simulados, sin IB (para probar la interfaz)
  ib: {
    host: process.env.IB_HOST || '127.0.0.1',
    port: Number(process.env.IB_PORT) || 4001,
    clientId: Number(process.env.IB_CLIENT_ID) || 17,
  },
  // 1 = solo horario regular de mercado (estructura más limpia). 0 = incluye pre/post market.
  useRTH: process.env.USE_RTH !== '0',
  // 3 = delayed. Si no tienes suscripción de datos, IB entrega datos con retraso.
  marketDataType: Number(process.env.IB_MARKET_DATA_TYPE) || 3,
  // Separación mínima entre peticiones históricas (IB limita ~60 por 10 min).
  historicalGapMs: 350,
  requestTimeoutMs: 30000,
};

// Temporalidades soportadas. `ttl` = segundos que el servidor reutiliza el caché.
// Duraciones: más historia = más velas para practicar, pero peticiones más pesadas.
export const TIMEFRAMES = {
  '1D': { barSize: '1 day', duration: '2 Y', ttl: 300 },
  '4H': { barSize: '4 hours', duration: '6 M', ttl: 120 },
  '15m': { barSize: '15 mins', duration: '3 W', ttl: 60 },
  '10m': { barSize: '10 mins', duration: '2 W', ttl: 45 },
};

export const SUPPORTED_SEC_TYPES = ['STK', 'IND', 'CASH'];
