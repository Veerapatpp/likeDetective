import { describe, expect, it } from "vitest";
import {
    consistentCreatures,
    generateCase,
    validateCase,
} from "../src/game/core/caseGen";
import { CodexData, freshCodex } from "../src/game/core/codex";
import {
    CREATURES,
    CREATURE_IDS,
    LOCATION_IDS,
    SCENE_SPOT_IDS,
    WITNESSES,
} from "../src/game/core/data";
import {
    accuse,
    actionKey,
    beginPhase,
    endPhase,
    finishRun,
    perform,
    pickPerk,
    RunState,
    startRun,
    Action,
} from "../src/game/core/run";

const veteran = (): CodexData => ({
    ...freshCodex(),
    unlockedCreatures: [...CREATURE_IDS],
    known: Object.fromEntries(
        CREATURE_IDS.map((c) => [c, [...CREATURES[c].traits]]),
    ) as CodexData["known"],
});

describe("generateCase", () => {
    for (const [label, codex] of [
        ["new player", freshCodex()],
        ["veteran", veteran()],
    ] as const) {
        it(`always produces a solvable case for a ${label}`, () => {
            for (let seed = 1; seed <= 2000; seed++) {
                const file = generateCase(seed, codex);
                const result = validateCase(file, codex.unlockedCreatures);
                expect(result.problems, `seed ${seed}`).toEqual([]);
                // A known trait separates the answer from its near miss.
                expect(
                    file.keyTraits.some((t) =>
                        codex.known[file.culprit].includes(t),
                    ),
                ).toBe(true);
            }
        });
    }

    it("is deterministic per seed", () => {
        expect(generateCase(42, freshCodex())).toEqual(
            generateCase(42, freshCodex()),
        );
    });

    it("never makes a locked creature the culprit", () => {
        for (let seed = 1; seed <= 500; seed++)
            expect(generateCase(seed, freshCodex()).culprit).not.toBe(
                "deepborn",
            );
    });

    it("picks the decoy among the closest look-alikes", () => {
        const file = generateCase(7, veteran());
        const traits = file.clues.flatMap((c) => (c.trait ? [c.trait] : []));
        expect(
            consistentCreatures(traits, veteran().unlockedCreatures),
        ).toEqual([file.culprit]);
    });
});

/** Plays every affordable action in order, picking the first draft option each time. */
const playThrough = (seed: number) => {
    let codex = freshCodex();
    let run: RunState = beginPhase(startRun(seed, "inspector", codex));
    const actions: Record<string, Action[]> = {
        scene: SCENE_SPOT_IDS.map((spot) => ({ type: "spot", spot })),
        clues: [
            { type: "research" },
            ...LOCATION_IDS.map(
                (location) => ({ type: "visit", location }) as Action,
            ),
        ],
        witness: [
            ...WITNESSES.map(
                (w) => ({ type: "witness", witness: w.id }) as Action,
            ),
            ...run.file.suspects.flatMap(
                (s) =>
                    [
                        { type: "observe", suspect: s.id },
                        { type: "alibi", suspect: s.id },
                        { type: "verify", suspect: s.id },
                    ] as Action[],
            ),
        ],
    };
    while (run.phase !== "accuse") {
        for (const action of actions[run.phase]) {
            ({ run, codex } = perform(run, codex, action));
            if (run.phase === "accuse") break;
        }
        if (run.phase === "accuse") break;
        run = endPhase(run, codex);
        if (run.step === "draft")
            ({ run, codex } = pickPerk(run, codex, run.draft![0]));
        run = beginPhase(run);
    }
    return { run, codex };
};

describe("run flow", () => {
    it("spends time, never beyond the phase budget, and reaches the accusation", () => {
        for (let seed = 1; seed <= 200; seed++) {
            const { run } = playThrough(seed);
            expect(run.phase).toBe("accuse");
            expect(run.done.length).toBeGreaterThan(0);
            expect(new Set(run.done).size).toBe(run.done.length);
        }
    });

    it("grades layered outcomes and keeps Codex knowledge on failure", () => {
        const { run, codex } = playThrough(3);
        const file = run.file;
        const wrongCreature = codex.unlockedCreatures.find(
            (c) => c !== file.culprit,
        )!;
        const wrongSuspect = file.suspects.find(
            (s) => s.id !== file.culpritSuspect,
        )!.id;

        expect(["S", "A"]).toContain(
            accuse(run, file.culprit, file.culpritSuspect).outcome!.grade,
        );
        expect(
            accuse(run, wrongCreature, file.culpritSuspect).outcome!.grade,
        ).toBe("B");
        expect(accuse(run, file.culprit, wrongSuspect).outcome!.grade).toBe(
            "C",
        );
        const failed = accuse(run, wrongCreature, wrongSuspect);
        expect(failed.outcome!.grade).toBe("F");

        const after = finishRun(failed, codex).codex;
        for (const c of CREATURE_IDS)
            for (const t of codex.known[c]) expect(after.known[c]).toContain(t);
        expect(after.known[file.culprit]).toEqual(
            expect.arrayContaining(CREATURES[file.culprit].traits),
        );
        expect(after.unlockedCreatures).toContain("deepborn");
        expect(after.epic.killerAdvantage).toBe(1);
    });

    it("does not let an action run twice", () => {
        let codex = freshCodex();
        let run = beginPhase(startRun(9, "surgeon", codex));
        ({ run, codex } = perform(run, codex, { type: "spot", spot: "body" }));
        const clock = run.clock;
        ({ run } = perform(run, codex, { type: "spot", spot: "body" }));
        expect(run.clock).toBe(clock);
        expect(run.done).toEqual([actionKey({ type: "spot", spot: "body" })]);
    });
});
