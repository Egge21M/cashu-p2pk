import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare global {
  interface Window {
    nostr: {
      getPublicKey: () => Promise<string>;
      signSchnorr: (e: string) => Promise<string>;
      signEvent: (e: {
        kind: number;
        content: string;
        created_at: number;
        tags: string[][];
      }) => Promise<{
        kind: number;
        content: string;
        created_at: number;
        tags: string[][];
        id: string;
        sig: string;
        pubkey: string;
      }>;
    };
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
