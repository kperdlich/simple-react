import React from 'react';
import logo from './logo.svg';
import './App.css';
import {TestComponent} from "./component/TestComponent";
import {UITestComponent} from "./component/UITestComponent";
import {react} from "./react/react";
import {ListComponent} from "./component/ListComponent";
import {useState} from "./react/DomRenderer";

function App() {
    const [spanValue, setSpanValue] = useState(1000);
    const [value, setValue] = useState("");
    const [values, setValues] = useState<string[]>(["Hans", "Jürgen", "Peter"]);

    const onClick = () => {
        console.log("onClick");
        setValues((values) => [...values, value]);
        setValue("");
    }

    const onChange = (event) => {
        console.log("onChange");
        setValue(event.target.value); // This cause a rerender what breaks our focus atm as the entire dom gets rerendered
    }

    const onDelete = (index) => {
        console.log("onDelete");
        setValues((values) => values.filter((it, idx) => idx !== index))
    }

    const changeSpanValue = () => {
        console.log("changeSpanValue");
        setSpanValue((v) => v +1);
    }

    return (
        <div>
            <span>{spanValue}</span>
            <input value={value} onChange={onChange}/>
            <button onClick={onClick}>Add</button>
            <ul>
                {values.map((it, index) =>
                    <li key={it}>
                        <button onClick={() => onDelete(index)}>X</button>
                        { it }
                    </li>)
                }
            </ul>
        </div>);
}

export default App;
