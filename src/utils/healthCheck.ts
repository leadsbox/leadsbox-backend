// src/monitorMaterialCenter.ts

import axios from 'axios';

const MEISHE_URL = 'https://fx.tez.is'

const ENDPOINT = `${MEISHE_URL}/materialcenter/mall/custom/listAllAssemblyMaterial`;

/**
 * Hits the material-center endpoint and logs the time whenever
 * the status is !== 200 or we get a network error.
 */
export async function monitorMaterialCenter() {
  try {
    const res = await axios.get(ENDPOINT);
    console.log(
      `[MaterialCenter][${new Date().toISOString()}] ` +
      `Status code: ${res.status}`)
    if (res.status !== 200) {
      console.error(
        `[MaterialCenter][${new Date().toISOString()}] ` +
        `Unexpected status code: ${res.status}`
      );
    }
  } catch (err: any) {
    // Axios wraps non-2xx in an error too, so catch both network and HTTP errors here
    const status = err.response?.status;
    console.error(
      `[MaterialCenter][${new Date().toISOString()}] ` +
      `Request failed${status ? ` (status ${status})` : ''}: ${err.message}`
    );
  }
}
