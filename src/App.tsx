import React from 'react';
import logo from './logo.svg';
import './App.css';
import {TestComponent} from "./component/TestComponent";
import {UITestComponent} from "./component/UITestComponent";
import {react} from "./react/react";
import {ListComponent} from "./component/ListComponent";
import {useState} from "./react/DomRenderer";

function App() {
    const [value, setValue] = useState(0)
    //const [text, setText] = useState("");

    const onClick = () => {
        setValue((current) => current + 1);
    }

    /* Fix input update
    const onChange = (event) => {
        setText(event.target.text);
    }*/
    if (value > 10) {
        return (
            <div className="App-red">
                <button onClick={onClick}>X</button>
                <span>{value}</span>
            </div>);
    }

    return (
        <div className="App">
            <button onClick={onClick}>X</button>
            <span>{value}</span>
        </div>
    );
}

export default App;
