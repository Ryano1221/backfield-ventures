// Globals installed by the inline script in src/app/(site)/layout.tsx.
export {};

declare global {
  interface Window {
    bfvOpen: (target?: string) => void;
    bfvPartnerOpen: (event?: unknown) => void;
  }
}
