import {react} from "./react";
import {TestComponent} from "../component/TestComponent";

describe("react", () => {
    it("should store multiple stats correctly", () => {
        const [valueA, setValueA] = react.useState(20);
        const [valueB, setValueB] = react.useState(50);

        expect(valueA).toEqual(20);
        expect(valueB).toEqual(50);
    });

    it("should persist states across component rendering", () => {
        const [value1, setValue1] = TestComponent();
        expect(value1).toEqual(20);
        react.render();

        const [value2, setValue2] = TestComponent();
        expect(value2).toEqual(20);
        setValue2(50);
        react.render();

        const [value3, setValue3] = TestComponent();
        expect(value3).toEqual(50);
    });
});
