/**
 * Validation d'environnement côté serveur
 * Exécutée au démarrage du serveur Next.js
 */

import { validateEnvironmentOnStart } from '../env-validation';

// Valider l'environnement au démarrage du serveur
validateEnvironmentOnStart();

export default {};
