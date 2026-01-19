import { hydration } from "@galacticcouncil/descriptors";

import { createClient } from "polkadot-api";

import { defer, map, Observable, tap } from "rxjs";

import { getWs } from "./websocket";

const wsProvider = getWs("wss://hydration-rpc.n.dwellir.com", {
  onStatusChanged: (s) => {
    switch (s.type) {
      case 0:
        console.log("[WS] CONNECTING", s.uri);
        break;
      case 1:
        console.log("[WS] CONNECTED", s.uri);
        break;
      case 2:
        console.warn("[WS] CLOSED", s.event);
        break;
      case 3:
        console.error("[WS] ERROR", s);
        break;
    }
  },
});

type Balance = {
  id: number;
  balance: bigint;
};

function watchTokensBalance(address: string, label: string): Observable<Balance[]> {
  const query = client.getTypedApi(hydration).query.Tokens.Accounts;
  return defer(() => query.watchEntries(address, { at: "best" })).pipe(
    tap({
      next: (a) => console.log("Upserted", label, a.deltas?.upserted.length),
      error: (e) => console.log("Error", label, e),
      complete: () => console.log("Complete", label),
    }),
    map(({ deltas }) => {
      const result: Balance[] = [];

      deltas?.deleted.forEach((u) => {
        const [_, asset] = u.args;
        result.push({
          id: asset,
          balance: 0n,
        });
      });

      deltas?.upserted.forEach((u) => {
        const [_, asset] = u.args;

        result.push({
          id: asset,
          balance: u.value.free,
        });
      });
      return result;
    }),
  );
}

const client = createClient(wsProvider);

const ACC = "7L53bUTBbfuj14UpdCNPwmgzzHSsrsTWBHX5pys32mVWM3C1";

watchTokensBalance(ACC, "FIRST").subscribe((balances) => {
  console.log("FIRST", balances);
});

setTimeout(() => {
  watchTokensBalance(ACC, "SECOND").subscribe((balances) => {
    console.log("SECOND", balances);
  });
}, 3_000);
