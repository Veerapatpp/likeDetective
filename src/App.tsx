import { PhaserGame } from "./PhaserGame";
import { useGame } from "./ui/useGame";
import {
    AccuseBoard,
    Briefing,
    Draft,
    Hud,
    MessageBar,
    Notebook,
    ResearchButton,
    Reveal,
    WitnessPanel,
} from "./ui/RunUI";
import { CodexView, Title } from "./ui/Screens";

function App() {
    const { screen, codex, run, finish } = useGame();
    const inRun = screen === "run" && run;

    return (
        <div id="app" className={inRun ? "in-run" : ""}>
            {inRun && <Hud run={run} />}
            <main className="stage">
                <PhaserGame />
                {screen === "title" && <Title codex={codex} />}
                {screen === "codex" && <CodexView codex={codex} />}
                {inRun && (
                    <>
                        {run.step === "play" && run.phase === "clues" && (
                            <ResearchButton run={run} />
                        )}
                        {run.step === "play" && run.phase === "witness" && (
                            <WitnessPanel run={run} />
                        )}
                        {run.step === "play" && run.phase === "accuse" && (
                            <AccuseBoard
                                key={run.seed}
                                run={run}
                                codex={codex}
                            />
                        )}
                        <MessageBar run={run} />
                        {run.step === "briefing" && <Briefing run={run} />}
                        {run.step === "draft" && <Draft run={run} />}
                        {run.step === "reveal" && (
                            <Reveal key={run.seed} run={run} finish={finish} />
                        )}
                    </>
                )}
            </main>
            {inRun && <Notebook run={run} />}
        </div>
    );
}

export default App;
