import { createServerFn } from "@tanstack/react-start";

export const getMarketRates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // Fetch HG Brasil for CDI and the Bitcoin fallback.
    const hgRes = await fetch("https://api.hgbrasil.com/finance");
    const hgData = await hgRes.json();

    // 2. Fetch Bitcoin from CoinGecko
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,brl&include_24hr_change=true",
    );
    const cgData = await cgRes.json();

    // Fetch the latest dollar and Selic values from Banco Central (BCB).
    const usdRes = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json",
    );
    const usdData = await usdRes.json();
    const selicRes = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
    );
    const selicData = await selicRes.json();

    // Extract data with fallback values
    const usdRate = Number(usdData?.[0]?.valor) || 5.15;
    const usdChange = 0;

    const btcUsd = cgData?.bitcoin?.usd || hgData?.results?.currencies?.BTC?.buy || 78000;
    const btcBrl = cgData?.bitcoin?.brl || btcUsd * usdRate || 400000;
    const btcChange =
      cgData?.bitcoin?.usd_24h_change || hgData?.results?.currencies?.BTC?.variation || 0;

    const selicValue = selicData?.[0]?.valor ? parseFloat(selicData[0].valor) : 11.25;
    const cdi = hgData?.results?.taxes?.[0]?.cdi || selicValue - 0.1;

    return {
      usd: {
        value: `R$ ${usdRate.toFixed(2).replace(".", ",")}`,
        change: `${usdChange >= 0 ? "+" : ""}${usdChange.toFixed(2)}%`,
      },
      btc: {
        value: `US$ ${btcUsd.toLocaleString("en-US")}\nR$ ${btcBrl.toLocaleString("pt-BR")}`,
        change: `${btcChange >= 0 ? "+" : ""}${btcChange.toFixed(2)}%`,
      },
      taxes: {
        selic: `${selicValue.toFixed(2).replace(".", ",")}% a.a.`,
        cdi: `${cdi.toFixed(2).replace(".", ",")}% a.a.`,
        ipca2029: "6,18% + IPCA",
        ipca2035: "6,32% + IPCA",
        ipca2045: "6,48% + IPCA",
      },
    };
  } catch (error) {
    console.error("Error fetching market rates:", error);
    // Last resort hardcoded fallbacks
    return {
      usd: { value: "R$ 5,15", change: "Atualizado" },
      btc: { value: "US$ 78.500 / R$ 403.000", change: "+8.2%" },
      taxes: {
        selic: "11,25% a.a.",
        cdi: "11,15% a.a.",
        ipca2029: "6,15% + IPCA",
        ipca2035: "6,30% + IPCA",
        ipca2045: "6,45% + IPCA",
      },
    };
  }
});
