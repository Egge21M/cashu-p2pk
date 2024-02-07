import { useRef, useState } from "react";
import "./App.css";
import {
  CashuMint,
  CashuWallet,
  Proof,
  Token,
  getDecodedToken,
} from "@cashu/cashu-ts";
import { getPublicKey } from "nostr-tools";

const encoder = new TextEncoder();

const mint = "https://testnut.cashu.space";

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function isValidP2pkToken(token: Token, pubkey: string) {
  const tokenEntries = token.token;
  const proofs = tokenEntries.map((entry) => entry.proofs).flat();
  for (let i = 0; i < proofs.length; i++) {
    const parsedSecret = JSON.parse(proofs[i].secret);
    if (parsedSecret[0] !== "P2PK" || parsedSecret[1].data !== pubkey) {
      return false;
    }
  }
  return true;
}

type SignedProof = Proof & { witness: { signatures: string[] } };

async function createSignatures(token: Token) {
  const tokenEntries = token.token;
  const proofs = tokenEntries.map((entry) => entry.proofs).flat();
  const signedProofs: SignedProof[] = [];
  for (let i = 0; i < proofs.length; i++) {
    const secretString = proofs[i].secret;
    const secretBytes = encoder.encode(secretString);
    const secretHashBytes = await crypto.subtle.digest("SHA-256", secretBytes);
    const hashArray = Array.from(new Uint8Array(secretHashBytes));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const signature = (await window.nostr.signSchnorr(hashHex)) as string;
    const signedProof = { ...proofs[i], witness: { signatures: [signature] } };
    signedProofs.push(signedProof);
  }
  return signedProofs;
}

function App() {
  const [signedProofs, setSignedProofs] = useState<SignedProof[]>();
  const inputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p>Paste your token here</p>
      <div className="flex flex-col">
        <input ref={inputRef} />
        <button
          onClick={async () => {
            if (inputRef.current) {
              const token = inputRef.current.value;
              const decodedToken = getDecodedToken(token);
              console.log(decodedToken);
              const sigs = await createSignatures(decodedToken);
              setSignedProofs(sigs);
            }
          }}
        >
          Parse Token
        </button>
      </div>
      {signedProofs ? (
        <div>
          <p>Paste Invoice here</p>
          <div>
            <input ref={invoiceRef} />
            <button
              onClick={async () => {
                if (!invoiceRef.current) {
                  return;
                }
                const wallet = new CashuWallet(new CashuMint(mint));
                try {
                  console.log(invoiceRef.current.value);
                  const res = await wallet.payLnInvoice(
                    invoiceRef.current.value,
                    signedProofs,
                  );
                  console.log(res);
                } catch (e) {
                  console.log(e);
                }
              }}
            >
              Pay Invoice
            </button>
          </div>
        </div>
      ) : undefined}
    </div>
  );
}

export default App;
