import { useSyncExternalStore } from "react";
import { store } from "../game/core/store";

export const useGame = () => useSyncExternalStore(store.subscribe, store.get);
