import axios from 'axios';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

export async function getCryptoPrice() {
  try {
    const response = await axios.get(COINGECKO_API_URL);
    const data = response.data;
    return data.bitcoin.usd;
  } catch (error) {
    console.error(error);
    return null;
  }
}