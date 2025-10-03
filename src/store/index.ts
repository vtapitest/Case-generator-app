import { create } from 'zustand';

interface AppState {
  encryptionEnabled: boolean;
  passphrase: string;
  logo: string | null;
  setEncryptionEnabled: (enabled: boolean) => void;
  setPassphrase: (pass: string) => void;
  setLogo: (logo: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  encryptionEnabled: false,
  passphrase: '',
  logo: localStorage.getItem('corporateLogo') || null,
  setEncryptionEnabled: (enabled) => set({ encryptionEnabled: enabled }),
  setPassphrase: (pass) => set({ passphrase: pass }),
  setLogo: (logo) => {
    if (logo) {
      localStorage.setItem('corporateLogo', logo);
    } else {
      localStorage.removeItem('corporateLogo');
    }
    set({ logo });
  },
}));