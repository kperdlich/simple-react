import './index.css';
import App from './App';
import {createRoot} from "./react/Reconciliation";

const root = createRoot(document.getElementById('root') as HTMLElement);

root.render(<App />);

