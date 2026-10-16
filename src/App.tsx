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
import { LocationMenu } from "./ui/LocationMenu";

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
                        {run.step === "play" &&
                            run.phase === "clues" &&
                            !run.openLocation && <ResearchButton run={run} />}
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
                        {/* เมนู action ของสถานที่ที่ผู้เล่นกำลังอยู่ข้างใน (เฟส 2) */}
                        {run.step === "play" && run.openLocation && (
                            <LocationMenu
                                run={run}
                                location={run.openLocation}
                            />
                        )}
                        {!run.openLocation && <MessageBar run={run} />}
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
