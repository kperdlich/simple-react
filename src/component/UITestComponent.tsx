import {react} from "../react/react";
import {UIInputTestComponent} from "./UIInputComponent";

export const UITestComponent = () => {
    const [count, setCount] = react.useState(0);

    const onClick = () => {
        console.log("onClick");
        console.log(count);
        setCount((currentCount) => currentCount + 1);
    };

    return <div>
        <button onClick={onClick}>Click Me {count}</button>
        <UIInputTestComponent test={"test"}/>
    </div>
}


