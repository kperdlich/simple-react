import React from 'react';
import logo from './logo.svg';
import './App.css';
import {TestComponent} from "./component/TestComponent";
import {UITestComponent} from "./component/UITestComponent";
import {react} from "./react/react";
import {ListComponent} from "./component/ListComponent";

function App() {

    return (
        <div className="App">
            <ListComponent/>
        </div>
    );
}

export default App;
