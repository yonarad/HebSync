import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface InstallPromptSnapshot {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
}

const subscribers = new Set<(snapshot: InstallPromptSnapshot) => void>();

let activeDeferredPrompt: BeforeInstallPromptEvent | null = null;
let listenersAttached = false;
let mediaQueryList: MediaQueryList | null = null;
let mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;

const getInstalledState = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
};

let installPromptSnapshot: InstallPromptSnapshot = {
  deferredPrompt: null,
  isInstalled: getInstalledState(),
};

const emitSnapshot = (): void => {
  installPromptSnapshot = {
    deferredPrompt: activeDeferredPrompt,
    isInstalled: getInstalledState(),
  };

  subscribers.forEach((subscriber) => subscriber(installPromptSnapshot));
};

const attachListeners = (): void => {
  if (listenersAttached || typeof window === 'undefined') return;

  const handleBeforeInstallPrompt = (event: Event) => {
    const promptEvent = event as BeforeInstallPromptEvent;
    promptEvent.preventDefault();
    activeDeferredPrompt = promptEvent;
    emitSnapshot();
  };

  const handleAppInstalled = () => {
    activeDeferredPrompt = null;
    emitSnapshot();
  };

  mediaQueryList = window.matchMedia('(display-mode: standalone)');
  mediaQueryListener = () => {
    emitSnapshot();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
  mediaQueryList.addEventListener('change', mediaQueryListener);
  listenersAttached = true;
  emitSnapshot();
};

export default function useInstallPrompt() {
  const [snapshot, setSnapshot] = useState<InstallPromptSnapshot>(() => ({
    deferredPrompt: activeDeferredPrompt,
    isInstalled: getInstalledState(),
  }));

  useEffect(() => {
    attachListeners();
    subscribers.add(setSnapshot);
    setSnapshot(installPromptSnapshot);

    return () => {
      subscribers.delete(setSnapshot);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    const promptEvent = activeDeferredPrompt;
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;

    if (outcome === 'accepted') {
      activeDeferredPrompt = null;
      emitSnapshot();
      return true;
    }

    return false;
  };

  return {
    canInstall: Boolean(snapshot.deferredPrompt) && !snapshot.isInstalled,
    isInstalled: snapshot.isInstalled,
    promptInstall,
  };
}
