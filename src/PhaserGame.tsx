import { useLayoutEffect, useRef } from "react";
import StartGame from "./game/main";

/** Hosts the Phaser canvas. Game state flows through the shared store, not through props. */
export function PhaserGame() {
    const game = useRef<Phaser.Game | null>(null);

    useLayoutEffect(() => {
        if (game.current === null) game.current = StartGame("game-container");
        return () => {
            game.current?.destroy(true);
            game.current = null;
        };
    }, []);

    return <div id="game-container"></div>;
}
