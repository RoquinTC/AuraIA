import axios from 'axios';

export const getCryptoPriceDefinition = {
  type: 'function',
  function: {
    name: 'get_crypto_price',
    description: 'Obtiene el precio actual de Bitcoin en USD desde CoinGecko.',
    parameters: { type: 'object', properties: {} }
  }
};

export async function getCryptoPrice() {
  const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
  try {
    const response = await axios.get(COINGECKO_API_URL);
    const data = response.data;
    return `💰 El precio actual de Bitcoin es: $${data.bitcoin.usd} USD`;
  } catch (error: any) {
    console.error(error.message);
    return '❌ No pude obtener el precio en este momento.';
  }
}