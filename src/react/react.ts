export namespace react {
    type Hook = any;

    const hooks: Hook[] = [];
    let index = 0;

    export const useState = <T, >(initialValue: T): [T, (value: T | ((current: T) => T)) => void] => {
        const currentIndex = index++;
        if (hooks.length === currentIndex) {
            hooks.push(initialValue)
        }

        const setState = (newValue: T | ((current: T) => T)) => {
            hooks[currentIndex] = typeof newValue === "function"
                // @ts-ignores
                ? newValue(hooks[currentIndex])
                : newValue;

            update();
        }

        return [hooks[currentIndex] as T, setState];
    }

    export const useEffect = (action, dependencyList) => {
        const currentIndex = index++;
        if (hooks.length === currentIndex) {
            hooks.push({dependencies: dependencyList, unmount: action()});
        } else {
            const oldDependencyList = hooks[currentIndex].dependencies;
            if (oldDependencyList.some((d, i) => !Object.is(d, dependencyList[i]))) {
                hooks[currentIndex] = {dependencies: dependencyList, unmount: action()};
            }
        }
    }

    export const useMemo = (action, dependencyList) => {
        const currentIndex = index++;
        if (hooks.length === currentIndex) {
            hooks.push({dependencies: dependencyList, value: action()});
        } else {
            const oldDependencyList = hooks[currentIndex].dependencies;
            if (oldDependencyList.some((d, i) => !Object.is(d, dependencyList[i]))) {
                hooks[currentIndex] = {dependencies: dependencyList, value: action()};
            }
        }
        return hooks[currentIndex].value;
    }

    export const useCallback = (action, dependencyList) => {
        return useMemo(() => action, dependencyList);
    }

    export const render = () => {
        index = 0;
    }

    let rootElement;
    export const renderRoot = (startComponent) => {
        rootElement = startComponent;
        update();
    }

    export const update = () => {
        index = 0;
        const newElementTree = rootElement();
        const div = document.createElement("div");

        generateDom(newElementTree, div);
        domRootElement.replaceChildren(div);
    }

    let domRootElement: HTMLElement;
    const generateDom = (component, tree: HTMLElement) => {
        if (component.type) {
            if (typeof component.type === "function") {
                const reactElement = component.type(component.props);
                generateDom(reactElement, tree);
            } else {
                const element = document.createElement(component.type)
                if (component.type === "button") {
                    element.addEventListener('click', component.props.onClick);
                }
                if (component.type === "input") {
                    element.value = component.props.value;
                }
                tree.appendChild(element);
                if (component.props?.children) {
                    if (Array.isArray(component.props.children)) {
                        component.props.children.forEach(children => generateDom(children, element));
                    } else {
                        generateDom(component.props.children, element)
                    }
                }
            }
        } else {
            const text = document.createTextNode(component);
            tree.appendChild(text);
        }
    }

    export const createRoot = (root: HTMLElement) => {
        domRootElement = root;
    }
}
