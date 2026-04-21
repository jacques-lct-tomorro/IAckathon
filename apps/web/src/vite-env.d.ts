/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdInitOptions {
  client_id: string;
  use_fedcm_for_button?: boolean;
  callback: (response: GoogleCredentialResponse) => void | Promise<void>;
}

interface GoogleIdButtonOptions {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "continue_with" | "signin_with" | "signup_with" | "signin";
  width?: number;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: GoogleIdInitOptions) => void;
          renderButton: (
            element: HTMLElement,
            options: GoogleIdButtonOptions,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export {};
