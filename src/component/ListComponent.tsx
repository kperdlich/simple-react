import {useEffect, useState} from "../react/Hooks";

interface EntryProps {
    readonly onDelete: () => void;
    readonly value: string;
}

const Entry = ({onDelete, value}: EntryProps) => {
    useEffect(() => {
        console.log(value + " mount");
        return () => {
            console.log(value + " unmount");
        };
    }, []);

    return (
        <li>
            <button onClick={onDelete}>X</button>
            {value}
        </li>
    );
}

export const ListComponent = () => {
    const [spanValue, setSpanValue] = useState(1000);
    const [value, setValue] = useState("");
    const [values, setValues] = useState<string[]>(["Hans", "Jürgen", "Peter"]);

    useEffect(() => {
        console.log("ListComponent mount");
        return () => {
            console.log("ListComponent unmount");
        };
    }, []);

    useEffect(() => {
        console.log("Value updates mount");
        return () => {
            console.log("Value updates unmount");
        };
    }, [value]);

    const onClick = () => {
        setValues((values) => [...values, value]);
        setValue("");
    }

    const onChange = (event) => {
        setValue(event.target.value); // This cause a rerender what breaks our focus atm as the entire dom gets rerendered
    }

    const onDelete = (index: number) => {
        setValues((values) => values.filter((it, idx) => idx !== index))
    }

    const changeSpanValue = () => {
        setSpanValue((v) => v + 1);
    }

    return (
        <div>
            <span>{spanValue}</span>
            <input value={value} onChange={onChange}/>
            <button onClick={onClick}>Add</button>
            <ul>
                {values.map((it, index) =>
                    <Entry key={it} onDelete={() => onDelete(index)} value={it} />)
                }
            </ul>
        </div>);
}
