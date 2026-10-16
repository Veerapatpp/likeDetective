import ReactDOM from "react-dom/client";
import "@fontsource/sarabun/300.css";
import "@fontsource/sarabun/400.css";
import "@fontsource/sarabun/600.css";
import "@fontsource/pridi/500.css";
import "@fontsource/pridi/600.css";
import "./styles.css";
import App from "./App.tsx";

// Canvas text does not re-render when a web font arrives, so wait for the
// Thai fonts before Phaser draws anything.
const fonts = Promise.all([
    document.fonts.load('400 16px "Sarabun"', "ก"),
    document.fonts.load('600 16px "Pridi"', "ก"),
]).catch(() => undefined);

fonts.then(() => {
    // No StrictMode: its double mount would boot Phaser twice.
    ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
});
