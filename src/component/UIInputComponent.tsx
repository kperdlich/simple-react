import {react} from "../react/react";

export const UIInputTestComponent = (props) => {
    const [timer, setTimer] = react.useState(0);

    react.useEffect(() => {
        const interval = setInterval(() => {
            setTimer((cc) => cc + 1);
        }, 1000);

        return () => {
            clearInterval(interval);
        }
    }, []);

    return <input value={timer}/>
}
