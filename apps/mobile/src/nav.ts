import { createNavigationContainerRef } from '@react-navigation/native';

// Référence de navigation globale : permet de naviguer depuis un module non-React
// (ex. la réception d'appels) vers l'écran d'appel entrant.
export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  }
}

export function goBackIfPossible() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
