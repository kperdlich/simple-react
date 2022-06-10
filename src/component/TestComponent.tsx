import {react} from "../react/react";

export const TestComponent = (): [number, (value: number) => void] => {
    const [value, setValue] = react.useState(20);

    react.useEffect(() => {
        console.log("useEffect");
    }, []);

    react.useEffect(() => {
        console.log("Value Changed");
    }, [value]);

   const memo = react.useMemo(() => {
        console.log("useMemo");
        return ["test", "test2"];
    }, [value]);

    return [value, setValue];
}
