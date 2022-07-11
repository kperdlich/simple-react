import React from 'react';
import './App.css';
import {DogList} from "./component/DogList";
import {useEffect, useState} from "./react/hooks/Hooks";

const App = () => {
    const [values, setValues] = useState<string[]>(["Test1", "Test2"]);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        console.log("Mount");
        return () => {
            console.log("Unmount");
        }
    }, []);

    useEffect(() => {
        console.log("Input value changed");
    }, [inputValue])

    return (
        <div className="App">
            <input value={inputValue} onChange={(event) => setInputValue(event.target.value)}/>
            <button
                onClick={() => {
                    setValues((currentValues) => [...currentValues, inputValue]);
                    setInputValue("");
                }}>
                Add
            </button>
            <ul>
                {values.map(currentValue =>
                    <li
                        onClick={() => {
                            setValues(values.filter(value => value !== currentValue))
                        }}
                        key={currentValue}>
                        {currentValue}
                    </li>
                )}
            </ul>
        </div>
    );
}

export default App;
