import {useState} from "../react/DomRenderer";

export const ListComponent = () => {
    const [spanValue, setSpanValue] = useState(1000);
    const [value, setValue] = useState("");
    const [values, setValues] = useState<string[]>(["Hans", "Jürgen", "Peter"]);

    const onClick = () => {
        setValues((values) => [...values, value]);
        setValue("");
    }

    const onChange = (event) => {
        setValue(event.target.value); // This cause a rerender what breaks our focus atm as the entire dom gets rerendered
    }

    const onDelete = (index) => {
        setValues((values) => values.filter((it, idx) => idx !== index))
    }

    const changeSpanValue = () => {
        setSpanValue((v) => v +1);
    }

    return (
        <div>
            <span>{spanValue}</span>
            <input value={value} onChange={onChange}/>
            <button onClick={changeSpanValue}>Add</button>
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
