import { AUTO, Game, Scale } from "phaser";
import { Stage } from "./scenes/Stage";

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1280,
    height: 720,
    parent: "game-container",
    backgroundColor: "#101317",
    scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
    scene: [Stage],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
