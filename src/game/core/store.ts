// A tiny observable store shared by React (UI) and Phaser (the stage).

import {
    browserStorage,
    CodexData,
    CodexStorage,
    freshCodex,
    loadCodex,
    saveCodex,
} from "./codex";
import { CreatureId, TraitId } from "./data";
import { CareerId, PerkId } from "./perks";
import { randomSeed } from "./rng";
import {
    accuse,
    Action,
    beginPhase,
    endPhase,
    finishRun,
    perform,
    pickPerk,
    RunState,
    startRun,
} from "./run";

export type Screen = "title" | "run" | "codex";

export interface Finish {
    learned: { creature: CreatureId; trait: TraitId }[];
    unlocks: string[];
}

export interface GameState {
    screen: Screen;
    codex: CodexData;
    run: RunState | null;
    finish: Finish | null;
}

type Listener = (state: GameState) => void;

export class GameStore {
    private state: GameState;
    private listeners = new Set<Listener>();

    constructor(private storage: CodexStorage = browserStorage) {
        this.state = {
            screen: "title",
            codex: loadCodex(storage),
            run: null,
            finish: null,
        };
    }

    get = () => this.state;

    subscribe = (listener: Listener) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    private set(patch: Partial<GameState>) {
        const codexChanged = patch.codex && patch.codex !== this.state.codex;
        this.state = { ...this.state, ...patch };
        if (codexChanged) saveCodex(this.storage, this.state.codex);
        this.listeners.forEach((l) => l(this.state));
    }

    private withRun(
        fn: (
            run: RunState,
            codex: CodexData,
        ) => { run: RunState; codex?: CodexData },
    ) {
        const { run, codex } = this.state;
        if (!run) return;
        const result = fn(run, codex);
        this.set({ run: result.run, codex: result.codex ?? codex });
    }

    showTitle = () => this.set({ screen: "title", run: null, finish: null });
    showCodex = () => this.set({ screen: "codex" });

    newRun = (career: CareerId, seed = randomSeed()) =>
        this.set({
            screen: "run",
            run: startRun(seed, career, this.state.codex),
            finish: null,
        });

    begin = () => this.withRun((run) => ({ run: beginPhase(run) }));
    act = (action: Action) =>
        this.withRun((run, codex) => perform(run, codex, action));
    endPhase = () =>
        this.withRun((run, codex) => ({ run: endPhase(run, codex) }));
    pick = (perk: PerkId | null) =>
        this.withRun((run, codex) => pickPerk(run, codex, perk));

    accuse = (creature: CreatureId, suspect: string) => {
        const { run, codex } = this.state;
        if (!run || run.phase !== "accuse" || run.step !== "play") return;
        const judged = accuse(run, creature, suspect);
        const { codex: nextCodex, learned, unlocks } = finishRun(judged, codex);
        this.set({
            run: judged,
            codex: nextCodex,
            finish: { learned, unlocks },
        });
    };

    resetCodex = () => this.set({ codex: freshCodex() });
}

export const store = new GameStore();
