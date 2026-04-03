/**
 * Wrapper pour les fetch avec timeout par défaut
 * Évite les requêtes qui durent indéfiniment
 */

const DEFAULT_FETCH_TIMEOUT = 10000; // 10 secondes

/**
 * Fetch avec timeout par défaut
 * @param {string} url - URL à appeler
 * @param {RequestInit} options - Options fetch
 * @param {number} timeout - Timeout personnalisé (optionnel)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }

    throw error;
  }
}

/**
 * Fetch avec retry automatique pour les erreurs réseau
 * @param {string} url - URL à appeler
 * @param {RequestInit} options - Options fetch
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @param {number} delay - Délai entre les tentatives (ms)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error;

      // Ne pas réessayer pour les erreurs 4xx (client) ou AbortError (timeout)
      if (error.name === 'AbortError' || (error.response && error.response.status >= 400 && error.response.status < 500)) {
        throw error;
      }

      // Si c'est la dernière tentative, lancer l'erreur
      if (attempt === maxRetries) {
        throw error;
      }

      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

/**
 * Fetch GET simple avec timeout
 * @param {string} url - URL à appeler
 * @param {number} timeout - Timeout personnalisé
 * @returns {Promise<Response>}
 */
export async function fetchGet(url, timeout = DEFAULT_FETCH_TIMEOUT) {
  return fetchWithTimeout(url, { method: 'GET' }, timeout);
}

/**
 * Fetch POST simple avec timeout
 * @param {string} url - URL à appeler
 * @param {object} data - Données à envoyer
 * @param {number} timeout - Timeout personnalisé
 * @returns {Promise<Response>}
 */
export async function fetchPost(url, data = {}, timeout = DEFAULT_FETCH_TIMEOUT) {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...data.headers,
    },
    body: JSON.stringify(data.body),
  }, timeout);
}

/**
 * Fetch pour les API externes avec retry et timeout plus long
 * @param {string} url - URL à appeler
 * @param {RequestInit} options - Options fetch
 * @returns {Promise<Response>}
 */
export async function fetchExternalApi(url, options = {}) {
  return fetchWithRetry(url, options, 3, 2000); // 3 tentatives avec délai progressif
}
