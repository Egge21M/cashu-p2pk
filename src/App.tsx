import { useMemo, useRef, useState } from "react";
import "./App.css";
import {
  CashuMint,
  CashuWallet,
  Proof,
  Token,
  getDecodedToken,
} from "@cashu/cashu-ts";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const mint = "https://testnut.cashu.space";

async function createSignedProofs(token: Token) {
  const tokenEntries = token.token;
  const proofs = tokenEntries.map((entry) => entry.proofs).flat();
  const allSignedProofs: SignedProof[] = [];
  for (let i = 0; i < proofs.length; i++) {
    const secret = proofs[i].secret;
    const digest = bytesToHex(sha256(secret));
    const albySignature = await window.nostr!.signSchnorr(digest);
    const signedProof: SignedProof = {
      ...proofs[i],
      witness: JSON.stringify({ signatures: [albySignature] }),
    };
    allSignedProofs.push(signedProof);
  }
  return allSignedProofs;
}

function isValidP2pkToken(token: Token, pubkey: string) {
  const tokenEntries = token.token;
  const mint = tokenEntries[0].mint;
  tokenEntries.forEach((entry) => {
    if (entry.mint !== mint) {
      return false;
    }
  });
  const proofs = tokenEntries.map((entry) => entry.proofs).flat();
  for (let i = 0; i < proofs.length; i++) {
    const parsedSecret = JSON.parse(proofs[i].secret);
    if (parsedSecret[0] !== "P2PK" || parsedSecret[1].data !== pubkey) {
      return false;
    }
  }
  return true;
}

type SignedProof = Proof & { witness: string };

function App() {
  const [signedProofs, setSignedProofs] = useState<SignedProof[]>();
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLInputElement>(null);

  const amount = useMemo(() => {
    return signedProofs?.reduce((a, c) => a + c.amount, 0);
  }, [signedProofs]);

  const fee = useMemo(() => {
    if (amount) {
      return Math.max(3, Math.floor((amount / 100) * 0.02));
    }
    return 0;
  }, [amount]);
  return (
    <div>
      <p>Paste your token here</p>
      <div className="flex flex-col">
        <input ref={inputRef} />
        {error ? <p className="text-red-500 text-sm">{error}</p> : undefined}
        <button
          onClick={async () => {
            setError("");
            if (inputRef.current) {
              const token = inputRef.current.value;
              try {
                const decodedToken = getDecodedToken(token);
                const pubkey = JSON.parse(
                  decodedToken.token[0].proofs[0].secret,
                )[1].data;
                const isValid = isValidP2pkToken(decodedToken, pubkey);
                if (!isValid) {
                  throw new Error("Invalid Token");
                }
                const signedProofs = await createSignedProofs(decodedToken);
                setSignedProofs(signedProofs);
              } catch (e) {
                if (e instanceof Error) {
                  setError(e.message);
                }
              }
            }
          }}
        >
          Parse Token
        </button>
      </div>
      {signedProofs && !error ? (
        <div>
          <p>Paste Invoice for {amount! - fee} SATS</p>
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
