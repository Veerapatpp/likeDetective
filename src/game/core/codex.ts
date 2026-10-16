// Cross-run knowledge. Runs can cost sanity and items, but never Codex knowledge.

import { CREATURES, CreatureId, TraitId } from "./data";
import { PerkId } from "./perks";

export interface RunRecord {
    seed: number;
    creature: CreatureId;
    grade: string;
    score: number;
}

export interface CodexData {
    version: 1;
    known: Record<CreatureId, TraitId[]>;
    unlockedCreatures: CreatureId[];
    unlockedPerks: PerkId[];
    runs: number;
    solved: number;
    epic: { fragments: number[]; killerAdvantage: number };
    history: RunRecord[];
}

/** Storage is swappable so the Electron/Steam build can save to Steam Cloud instead. */
export interface CodexStorage {
    load(): string | null;
    save(raw: string): void;
}

const KEY = "likeDetective.codex.v1";

export const browserStorage: CodexStorage = {
    load: () => {
        try {
            return localStorage.getItem(KEY);
        } catch {
            return null;
        }
    },
    save: (raw) => {
        try {
            localStorage.setItem(KEY, raw);
        } catch {
            /* private mode: progress lives only for this session */
        }
    },
};

export const freshCodex = (): CodexData => ({
    version: 1,
    known: {
        werewolf: ["claws", "moon"],
        vampire: ["drained", "neck"],
        ghoul: ["gnawed", "soil"],
        deepborn: ["salt"],
    },
    unlockedCreatures: ["werewolf", "vampire", "ghoul"],
    unlockedPerks: [],
    runs: 0,
    solved: 0,
    epic: { fragments: [], killerAdvantage: 0 },
    history: [],
});

export const loadCodex = (storage: CodexStorage): CodexData => {
    const raw = storage.load();
    if (!raw) return freshCodex();
    try {
        const parsed = JSON.parse(raw) as CodexData;
        if (parsed.version !== 1) return freshCodex();
        return { ...freshCodex(), ...parsed };
    } catch {
        return freshCodex();
    }
};

export const saveCodex = (storage: CodexStorage, codex: CodexData) =>
    storage.save(JSON.stringify(codex));

export const knows = (codex: CodexData, creature: CreatureId, trait: TraitId) =>
    codex.known[creature].includes(trait);

/** Returns a copy with the trait learned; reports whether it was new. */
export const learnTrait = (
    codex: CodexData,
    creature: CreatureId,
    trait: TraitId,
): { codex: CodexData; learned: boolean } => {
    if (
        knows(codex, creature, trait) ||
        !CREATURES[creature].traits.includes(trait)
    )
        return { codex, learned: false };
    return {
        codex: {
            ...codex,
            known: {
                ...codex.known,
                [creature]: [...codex.known[creature], trait],
            },
        },
        learned: true,
    };
};

export const unknownTraits = (
    codex: CodexData,
    creatures: CreatureId[],
): { creature: CreatureId; trait: TraitId }[] =>
    creatures.flatMap((creature) =>
        CREATURES[creature].traits
            .filter((trait) => !knows(codex, creature, trait))
            .map((trait) => ({ creature, trait })),
    );
