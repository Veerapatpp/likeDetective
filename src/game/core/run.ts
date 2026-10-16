// Pure run logic: every action takes the current run (and Codex) and returns new ones.

import {
    CaseFile,
    cluesAt,
    consistentCreatures,
    generateCase,
} from "./caseGen";
import { CodexData, learnTrait, unknownTraits } from "./codex";
import {
    CREATURES,
    CreatureId,
    LIBRARY_RESEARCH,
    LOCATIONS,
    LocationId,
    PHASE_BUDGET,
    Place,
    SCENE_SPOTS,
    SceneSpotId,
    SUSPECT_COSTS,
    TRAITS,
    TraitId,
    WITNESSES,
} from "./data";
import { CAREERS, CareerId, PERKS, PERK_IDS, PerkId, PerkPhase } from "./perks";
import { Rng } from "./rng";

export type Phase = "scene" | "clues" | "witness" | "accuse";
export const PHASES: Phase[] = ["scene", "clues", "witness", "accuse"];
export const PHASE_NAMES: Record<Phase, string> = {
    scene: "ที่เกิดเหตุ",
    clues: "เก็บเบาะแส",
    witness: "สืบพยาน",
    accuse: "หาคนร้าย",
};

export type Step = "briefing" | "play" | "draft" | "reveal";

export interface Note {
    id: string;
    phase: Phase;
    source: string;
    text: string;
    clueId?: string;
    trait?: TraitId;
    eerie?: boolean;
}

export interface SuspectProgress {
    observed: boolean;
    alibiAsked: boolean;
    verified: boolean;
}

export interface Outcome {
    creature: CreatureId;
    suspect: string;
    creatureRight: boolean;
    suspectRight: boolean;
    grade: "S" | "A" | "B" | "C" | "F";
    title: string;
    score: number;
    story: string;
}

export interface RunState {
    seed: number;
    file: CaseFile;
    career: CareerId;
    perks: PerkId[];
    phase: Phase;
    step: Step;
    clock: number;
    phaseSpent: number;
    phaseBudget: number;
    sanity: number;
    maxSanity: number;
    done: string[];
    found: string[];
    notes: Note[];
    suspects: Record<string, SuspectProgress>;
    wasted: { label: string; minutes: number }[];
    learned: { creature: CreatureId; trait: TraitId }[];
    draft: PerkId[] | null;
    cleared: string | null;
    lastMessage: string;
    outcome: Outcome | null;
}

export interface Result {
    run: RunState;
    codex: CodexData;
}

const has = (run: RunState, perk: PerkId) => run.perks.includes(perk);

const budgetFor = (phase: Phase, perks: PerkId[]) => {
    if (phase === "accuse") return 0;
    return PHASE_BUDGET[phase] + (perks.includes("allNighter") ? 40 : 0);
};

export const startRun = (
    seed: number,
    career: CareerId,
    codex: CodexData,
): RunState => {
    const file = generateCase(seed, codex);
    const maxSanity = career === "occultist" ? 120 : 100;
    return {
        seed,
        file,
        career,
        perks: [],
        phase: "scene",
        step: "briefing",
        clock: 0,
        phaseSpent: 0,
        phaseBudget: budgetFor("scene", []),
        sanity: maxSanity,
        maxSanity,
        done: [],
        found: [],
        notes: [],
        suspects: Object.fromEntries(
            file.suspects.map((s) => [
                s.id,
                { observed: false, alibiAsked: false, verified: false },
            ]),
        ),
        wasted: [],
        learned: [],
        draft: null,
        cleared: null,
        lastMessage: "",
        outcome: null,
    };
};

export const remaining = (run: RunState) => run.phaseBudget - run.phaseSpent;

// ---------------------------------------------------------------- costs

export type Action =
    | { type: "spot"; spot: SceneSpotId }
    | { type: "visit"; location: LocationId }
    | { type: "research" }
    | { type: "witness"; witness: string }
    | { type: "observe"; suspect: string }
    | { type: "alibi"; suspect: string }
    | { type: "verify"; suspect: string };

export const actionKey = (action: Action): string => {
    switch (action.type) {
        case "spot":
            return `spot:${action.spot}`;
        case "visit":
            return `visit:${action.location}`;
        case "research":
            return "research";
        case "witness":
            return `witness:${action.witness}`;
        default:
            return `${action.type}:${action.suspect}`;
    }
};

export const actionPhase = (action: Action): Phase => {
    if (action.type === "spot") return "scene";
    if (action.type === "visit" || action.type === "research") return "clues";
    return "witness";
};

export const timeCost = (run: RunState, action: Action): number => {
    const lens = has(run, "brassLens") ? 10 : 0;
    let cost: number;
    switch (action.type) {
        case "spot":
            cost =
                SCENE_SPOTS[action.spot].cost -
                (action.spot === "bodyDeep" && run.career === "surgeon"
                    ? 20
                    : 0);
            break;
        case "visit":
            cost =
                LOCATIONS[action.location].cost -
                lens -
                (has(run, "gasLantern") ? 20 : 0);
            break;
        case "research":
            cost =
                LIBRARY_RESEARCH.cost -
                lens -
                (run.career === "occultist" ? 20 : 0);
            break;
        case "witness": {
            const base =
                WITNESSES.find((w) => w.id === action.witness)?.cost ?? 30;
            cost =
                (has(run, "rapport") ? base / 2 : base) -
                (run.career === "inspector" ? 10 : 0);
            break;
        }
        case "observe":
            cost = has(run, "keenEye") ? 0 : SUSPECT_COSTS.observe;
            break;
        case "alibi":
            cost = SUSPECT_COSTS.alibi;
            break;
        case "verify":
            cost = SUSPECT_COSTS.verify - lens;
            break;
    }
    return Math.max(action.type === "observe" ? 0 : 10, Math.round(cost));
};

export const sanityCost = (run: RunState, action: Action): number => {
    let cost = 0;
    if (action.type === "spot")
        cost =
            action.spot === "bodyDeep" && run.career === "surgeon"
                ? 0
                : SCENE_SPOTS[action.spot].sanity;
    if (action.type === "visit") cost = LOCATIONS[action.location].sanity;
    if (action.type === "research") cost = LIBRARY_RESEARCH.sanity;
    // Seeing the real signature of the thing costs more than an empty room.
    if (action.type === "spot" || action.type === "visit") {
        const place: Place =
            action.type === "spot"
                ? `scene:${action.spot}`
                : `loc:${action.location}`;
        if (cluesAt(run.file, place).some((c) => c.kind === "trait")) cost += 5;
    }
    return has(run, "ironWill") ? Math.ceil(cost / 2) : cost;
};

export type Availability = { ok: true } | { ok: false; reason: string };

export const canDo = (run: RunState, action: Action): Availability => {
    if (run.step !== "play") return { ok: false, reason: "ยังไม่ถึงเวลา" };
    if (actionPhase(action) !== run.phase)
        return { ok: false, reason: "ผ่านเฟสนี้ไปแล้ว" };
    if (run.done.includes(actionKey(action)))
        return { ok: false, reason: "ทำไปแล้ว" };
    if (action.type === "verify" && !run.suspects[action.suspect].alibiAsked)
        return { ok: false, reason: "ต้องถามข้อแก้ตัวก่อน" };
    if (action.type === "verify" && run.suspects[action.suspect].verified)
        return { ok: false, reason: "ตรวจสอบแล้ว" };
    if (timeCost(run, action) > remaining(run))
        return { ok: false, reason: "เวลาไม่พอ" };
    return { ok: true };
};

// ---------------------------------------------------------------- helpers

export const placeLabel = (place: Place, witnessId?: string): string => {
    if (place.startsWith("scene:"))
        return `ที่เกิดเหตุ · ${SCENE_SPOTS[place.slice(6) as SceneSpotId].label}`;
    if (place.startsWith("loc:"))
        return `ในเมือง · ${LOCATIONS[place.slice(4) as LocationId].name}`;
    const witness = WITNESSES.find((w) => w.id === witnessId);
    return `พยาน · ${witness?.name ?? "ไม่ทราบ"}`;
};

export const witnessOfClue = (clueId: string) => clueId.split("@")[1];

const addNotes = (
    run: RunState,
    source: string,
    texts: {
        text: string;
        clueId?: string;
        trait?: TraitId;
        eerie?: boolean;
    }[],
): RunState => {
    const notes = texts.map((t, i) => ({
        id: `${run.notes.length + i}`,
        phase: run.phase,
        source,
        ...t,
    }));
    return {
        ...run,
        notes: [...run.notes, ...notes],
        found: [
            ...run.found,
            ...texts.flatMap((t) => (t.clueId ? [t.clueId] : [])),
        ],
        lastMessage: texts.map((t) => t.text).join("\n"),
    };
};

const spend = (run: RunState, action: Action): RunState => {
    const minutes = timeCost(run, action);
    const sanity = Math.max(0, run.sanity - sanityCost(run, action));
    return {
        ...run,
        clock: run.clock + minutes,
        phaseSpent: run.phaseSpent + minutes,
        sanity,
        done: [...run.done, actionKey(action)],
    };
};

/** A low-sanity investigator reads the world through a haze. */
const haze = (run: RunState, text: string) =>
    run.sanity > 0 && run.sanity < 30
        ? `${text} ...มีบางอย่างขยับอยู่ที่หางตา`
        : text;

// ---------------------------------------------------------------- actions

export const perform = (
    run: RunState,
    codex: CodexData,
    action: Action,
): Result => {
    if (!canDo(run, action).ok) return { run, codex };
    const minutes = timeCost(run, action);
    let next = spend(run, action);
    let nextCodex = codex;
    const file = run.file;

    switch (action.type) {
        case "spot":
        case "visit": {
            const place: Place =
                action.type === "spot"
                    ? `scene:${action.spot}`
                    : `loc:${action.location}`;
            const source =
                action.type === "spot"
                    ? SCENE_SPOTS[action.spot].label
                    : LOCATIONS[action.location].name;
            const clues = cluesAt(file, place);
            if (clues.length) {
                next = addNotes(
                    next,
                    source,
                    clues.map((c) => ({
                        text: haze(next, c.text),
                        clueId: c.id,
                        trait: c.trait,
                        eerie: c.kind === "trait" || c.kind === "epic",
                    })),
                );
            } else {
                const empty =
                    action.type === "spot"
                        ? SCENE_SPOTS[action.spot].empty
                        : LOCATIONS[action.location].empty;
                next = {
                    ...addNotes(next, source, [{ text: haze(next, empty) }]),
                    wasted: [...next.wasted, { label: source, minutes }],
                };
            }
            break;
        }
        case "research": {
            const options = unknownTraits(codex, codex.unlockedCreatures);
            if (!options.length) {
                next = addNotes(next, "ค้นตำรา", [
                    { text: "ตำราทุกเล่มบอกในสิ่งที่คุณรู้อยู่แล้ว" },
                ]);
                break;
            }
            // Research favours what this case needs, but not always.
            const rng = new Rng(file.seed + next.clock);
            const relevant = options.filter(
                (o) => o.creature === file.culprit || o.creature === file.decoy,
            );
            const pick =
                rng.next() < 0.7 && relevant.length
                    ? rng.pick(relevant)
                    : rng.pick(options);
            nextCodex = learnTrait(codex, pick.creature, pick.trait).codex;
            next = addNotes(
                { ...next, learned: [...next.learned, pick] },
                "ค้นตำรา",
                [
                    {
                        text: `ตำราเปื่อยยุ่ยเล่มหนึ่งระบุว่า ${CREATURES[pick.creature].name} ทิ้งร่องรอย "${TRAITS[pick.trait].name}" (บันทึกเข้า Codex แล้ว)`,
                        eerie: true,
                    },
                ],
            );
            break;
        }
        case "witness": {
            const witness = WITNESSES.find((w) => w.id === action.witness)!;
            const clues = cluesAt(file, "witness", action.witness);
            if (clues.length) {
                next = addNotes(
                    next,
                    witness.name,
                    clues.map((c) => ({
                        text: haze(next, c.text),
                        clueId: c.id,
                        trait: c.trait,
                        eerie: c.kind === "trait",
                    })),
                );
            } else {
                next = {
                    ...addNotes(next, witness.name, [
                        {
                            text: '"ผมไม่เห็นอะไรเลยจริงๆ คืนนี้หมอกหนาจนมองไม่เห็นมือตัวเอง"',
                        },
                    ]),
                    wasted: [...next.wasted, { label: witness.name, minutes }],
                };
            }
            break;
        }
        case "observe": {
            const s = file.suspects.find((x) => x.id === action.suspect)!;
            next = addNotes(
                {
                    ...next,
                    suspects: {
                        ...next.suspects,
                        [s.id]: { ...next.suspects[s.id], observed: true },
                    },
                },
                s.name,
                [
                    {
                        text: `${s.name} (${s.occupation}) พก${s.item} — ${s.tell}`,
                        clueId: `observe:${s.id}`,
                    },
                ],
            );
            break;
        }
        case "alibi": {
            const s = file.suspects.find((x) => x.id === action.suspect)!;
            const lie = has(run, "readTheLie");
            const text =
                `"ผมอยู่ที่${s.alibiPlace}ทั้งคืน ถามใครดูก็ได้"` +
                (lie
                    ? s.alibiStatus === "lie"
                        ? " — เสียงสั่นและสายตาหลบ เขากำลังโกหก"
                        : " — น้ำเสียงหนักแน่น ไม่มีพิรุธ"
                    : "");
            next = addNotes(
                {
                    ...next,
                    suspects: {
                        ...next.suspects,
                        [s.id]: {
                            ...next.suspects[s.id],
                            alibiAsked: true,
                            verified: lie,
                        },
                    },
                },
                s.name,
                [{ text, clueId: lie ? `verify:${s.id}` : `alibi:${s.id}` }],
            );
            break;
        }
        case "verify": {
            const s = file.suspects.find((x) => x.id === action.suspect)!;
            next = addNotes(
                {
                    ...next,
                    suspects: {
                        ...next.suspects,
                        [s.id]: { ...next.suspects[s.id], verified: true },
                    },
                },
                `ตรวจสอบ ${s.name}`,
                [{ text: s.alibiCheck, clueId: `verify:${s.id}` }],
            );
            break;
        }
    }

    if (next.sanity <= 0) {
        next = {
            ...next,
            phase: "accuse",
            step: "play",
            phaseBudget: 0,
            phaseSpent: 0,
            draft: null,
            lastMessage:
                "สติของคุณแตกสลาย มือสั่นจนจับปากกาไม่อยู่ ต้องชี้ตัวคนร้ายด้วยสิ่งที่มีตอนนี้",
        };
    }
    return { run: next, codex: nextCodex };
};

// ---------------------------------------------------------------- phases & draft

const PERK_PHASE_ORDER: PerkPhase[] = ["clues", "witness", "accuse"];

export const draftOptions = (
    run: RunState,
    codex: CodexData,
    afterPhase: Phase,
): PerkId[] => {
    const later = PERK_PHASE_ORDER.slice(
        PERK_PHASE_ORDER.indexOf(afterPhase as PerkPhase) + 1,
    );
    const upcoming = afterPhase === "scene" ? PERK_PHASE_ORDER : later;
    const pool = PERK_IDS.filter(
        (id) =>
            !run.perks.includes(id) &&
            (!PERKS[id].locked || codex.unlockedPerks.includes(id)) &&
            PERKS[id].phases.some((p) => upcoming.includes(p)),
    );
    const rng = new Rng(
        run.seed ^ ((PHASES.indexOf(afterPhase) + 1) * 2654435761),
    );
    const weights = CAREERS[run.career].weights;
    const picks: PerkId[] = [];
    let left = [...pool];
    while (picks.length < 3 && left.length) {
        const pick = rng.weighted(left, (id) => weights[PERKS[id].category]);
        picks.push(pick);
        left = left.filter((id) => id !== pick);
    }
    return picks;
};

export const beginPhase = (run: RunState): RunState => ({
    ...run,
    step: "play",
});

export const endPhase = (run: RunState, codex: CodexData): RunState => {
    if (run.step !== "play" || run.phase === "accuse") return run;
    const draft = draftOptions(run, codex, run.phase);
    if (draft.length) return { ...run, step: "draft", draft };
    return advance(run);
};

const advance = (run: RunState): RunState => {
    const phase = PHASES[PHASES.indexOf(run.phase) + 1];
    return {
        ...run,
        phase,
        step: "briefing",
        draft: null,
        phaseSpent: 0,
        phaseBudget: budgetFor(phase, run.perks),
        lastMessage: "",
    };
};

export const pickPerk = (
    run: RunState,
    codex: CodexData,
    perk: PerkId | null,
): Result => {
    if (run.step !== "draft") return { run, codex };
    let next: RunState = perk ? { ...run, perks: [...run.perks, perk] } : run;
    let nextCodex = codex;
    if (perk === "smellingSalts")
        next = { ...next, sanity: Math.min(next.maxSanity, next.sanity + 30) };
    if (perk === "forbiddenLore") {
        const options = unknownTraits(codex, codex.unlockedCreatures);
        if (options.length) {
            const pick = new Rng(run.seed + 77).pick(options);
            nextCodex = learnTrait(codex, pick.creature, pick.trait).codex;
            next = {
                ...next,
                sanity: Math.max(1, next.sanity - 10),
                learned: [...next.learned, pick],
            };
        }
    }
    if (perk === "oldFiles") {
        const innocent = new Rng(run.seed + 13).pick(
            run.file.suspects.filter((s) => s.id !== run.file.culpritSuspect),
        );
        next = { ...next, cleared: innocent.id };
    }
    return { run: advance(next), codex: nextCodex };
};

// ---------------------------------------------------------------- deduction

/** Traits the player has actually found this run. */
export const foundTraits = (run: RunState): TraitId[] => [
    ...new Set(run.notes.flatMap((n) => (n.trait ? [n.trait] : []))),
];

/** Creatures the found evidence still allows (what the deduction perk shows). */
export const possibleCreatures = (
    run: RunState,
    codex: CodexData,
): CreatureId[] =>
    consistentCreatures(foundTraits(run), codex.unlockedCreatures);

// ---------------------------------------------------------------- verdict

export const accuse = (
    run: RunState,
    creature: CreatureId,
    suspect: string,
): RunState => {
    const file = run.file;
    const creatureRight = creature === file.culprit;
    const suspectRight = suspect === file.culpritSuspect;
    const culprit = file.suspects.find((s) => s.id === file.culpritSuspect)!;
    const accused = file.suspects.find((s) => s.id === suspect)!;
    const foundKey = file.keyTraits.some((t) => foundTraits(run).includes(t));
    const real = CREATURES[file.culprit];
    const guessed = CREATURES[creature];

    let grade: Outcome["grade"];
    let title: string;
    let story: string;
    if (creatureRight && suspectRight) {
        grade = run.sanity >= 50 && foundKey ? "S" : "A";
        title = "ปิดคดีสมบูรณ์";
        story = `คุณต้อน${culprit.name}จนมุมก่อนรุ่งสาง ${real.ward}ได้ผลอย่างที่ตำราว่า สิ่งที่อยู่ในร่างนั้นกรีดร้องเป็นครั้งสุดท้าย แล้วเมืองก็เงียบลงอีกครั้ง`;
    } else if (suspectRight) {
        grade = "B";
        title = "จับถูกคน แต่ผิดวิธี";
        story = `คุณจับ${culprit.name}ได้ แต่${guessed.ward}ไม่ระคายผิวมันเลย มันหัวเราะ แล้วสลายหายไปในหมอก สามคืนต่อมามีศพที่สองในย่านโรงงาน`;
    } else if (creatureRight) {
        grade = "C";
        title = "รู้ว่าเป็นอะไร แต่จับผิดคน";
        story = `คุณเตรียม${real.ward}ไว้ถูกต้อง แต่ใช้กับ${accused.name}ผู้บริสุทธิ์ ระหว่างที่ทุกคนวุ่นวาย ${culprit.name}ก็ลงมือซ้ำอีกครั้ง`;
    } else {
        grade = "F";
        title = "คดีล้มเหลว";
        story = `${accused.name}ถูกลากตัวไปต่อหน้าฝูงชน และ${guessed.ward}ไม่ได้พิสูจน์อะไรเลยนอกจากความผิดพลาดของคุณ ฆาตกรตัวจริงยังเดินอยู่ในหมอก`;
    }
    const score =
        (creatureRight ? 40 : 0) +
        (suspectRight ? 50 : 0) +
        (foundKey ? 10 : 0) +
        Math.floor(run.sanity / 10);
    return {
        ...run,
        step: "reveal",
        outcome: {
            creature,
            suspect,
            creatureRight,
            suspectRight,
            grade,
            title,
            score,
            story,
        },
    };
};

/** Folds a finished run into the Codex. Knowledge is never lost. */
export const finishRun = (
    run: RunState,
    codex: CodexData,
): {
    codex: CodexData;
    learned: { creature: CreatureId; trait: TraitId }[];
    unlocks: string[];
} => {
    const outcome = run.outcome!;
    let next = codex;
    const learned: { creature: CreatureId; trait: TraitId }[] = [];
    for (const trait of CREATURES[run.file.culprit].traits) {
        const r = learnTrait(next, run.file.culprit, trait);
        next = r.codex;
        if (r.learned) learned.push({ creature: run.file.culprit, trait });
    }
    const unlocks: string[] = [];
    const solved = outcome.grade === "S" || outcome.grade === "A";
    if (!next.unlockedCreatures.includes("deepborn")) {
        next = {
            ...next,
            unlockedCreatures: [...next.unlockedCreatures, "deepborn"],
        };
        unlocks.push(
            `ประเภทคดีใหม่: ${CREATURES.deepborn.name} — สิ่งจากภายนอกที่เหตุผลของมนุษย์เข้าไม่ถึง`,
        );
    }
    if (solved && !next.unlockedPerks.includes("silverCompass")) {
        next = {
            ...next,
            unlockedPerks: [...next.unlockedPerks, "silverCompass"],
        };
        unlocks.push(`เครื่องมือใหม่: ${PERKS.silverCompass.name}`);
    }
    const fragments =
        run.found.includes("epic") &&
        !next.epic.fragments.includes(run.file.epicFragment)
            ? [...next.epic.fragments, run.file.epicFragment]
            : next.epic.fragments;
    if (fragments.length > next.epic.fragments.length)
        unlocks.push(
            `ชิ้นส่วนมหากาพย์ ${fragments.length}/3: ลายเซ็นของฆาตกรต่อเนื่อง`,
        );
    next = {
        ...next,
        runs: next.runs + 1,
        solved: next.solved + (solved ? 1 : 0),
        epic: {
            fragments,
            killerAdvantage: next.epic.killerAdvantage + (solved ? 0 : 1),
        },
        history: [
            {
                seed: run.seed,
                creature: run.file.culprit,
                grade: outcome.grade,
                score: outcome.score,
            },
            ...next.history,
        ].slice(0, 10),
    };
    return { codex: next, learned: [...run.learned, ...learned], unlocks };
};
