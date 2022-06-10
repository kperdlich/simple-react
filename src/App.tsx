import React from 'react';
import logo from './logo.svg';
import './App.css';
import {TestComponent} from "./component/TestComponent";
import {UITestComponent} from "./component/UITestComponent";
import {react} from "./react/react";

function App() {
    setInterval(() => {
        console.log("render");
        react.render();
    }, 100);

  return (
    <div className="App">
     <UITestComponent/>
    </div>
  );
}

export default App;
