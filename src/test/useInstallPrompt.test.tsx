import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import useInstallPrompt from '../hooks/useInstallPrompt';

describe('useInstallPrompt', () => {
  it('preserves the deferred install prompt across unmounts', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const });
    const preventDefault = vi.fn();
    const promptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: typeof prompt;
      userChoice: typeof userChoice;
      preventDefault: typeof preventDefault;
    };

    promptEvent.prompt = prompt;
    promptEvent.userChoice = userChoice;
    promptEvent.preventDefault = preventDefault;

    const firstRender = renderHook(() => useInstallPrompt());

    await act(async () => {
      window.dispatchEvent(promptEvent);
    });

    await waitFor(() => {
      expect(firstRender.result.current.canInstall).toBe(true);
    });

    firstRender.unmount();

    const secondRender = renderHook(() => useInstallPrompt());

    expect(secondRender.result.current.canInstall).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('clears the deferred prompt after a successful install acceptance', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'accepted' as const });
    const promptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: typeof prompt;
      userChoice: typeof userChoice;
    };

    promptEvent.prompt = prompt;
    promptEvent.userChoice = userChoice;

    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      window.dispatchEvent(promptEvent);
    });

    await waitFor(() => {
      expect(result.current.canInstall).toBe(true);
    });

    await act(async () => {
      const installed = await result.current.promptInstall();
      expect(installed).toBe(true);
    });

    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.canInstall).toBe(false);
  });
});
