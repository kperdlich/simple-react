import React from 'react';
import './index.css';
import App from './App';
import reportWebVitals from "./reportWebVitals";
import {react} from "./react/react";
import {UITestComponent} from "./component/UITestComponent";
import {createRoot, render} from "./react/DomRenderer";

const root = createRoot(document.getElementById('root') as HTMLElement);

render(App);

/*const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();*/
