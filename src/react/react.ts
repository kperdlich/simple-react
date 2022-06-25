export namespace react {
    type Hook = any;

    const hooks: Hook[] = [];
    let index = 0;

    let currentFiber: Fiber;

    // see https://github.com/facebook/react/blob/5f06576f51ece88d846d01abd2ddd575827c6127/packages/react-reconciler/src/ReactFiberHooks.js#L243
    export const useState = <T, >(initialValue: T): [T, (value: T | ((current: T) => T)) => void] => {

        // TODO resolve current fiber here?
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

    let oldVirtualDom = undefined;
    export const update = () => {
        index = 0;
        currentElementIndex = 0;
        const newElementTree = rootElement();
        if (oldVirtualDom === undefined) {
            const div = document.createElement("div");

            const rootFiber = generateDom(newElementTree, div);
            domRootElement.replaceChildren(div);
            oldVirtualDom = newElementTree;
        } else {
            let delta = [];
            const treeDiff = diff(oldVirtualDom, newElementTree, delta);
            updateDom(treeDiff);
        }
    }

    const diff = (treeA, treeB, delta) => {
        if (treeA.type !== treeB.type) {
            delta.push(treeB);
        } else {
            //const propsDiff =
        }
    }

    const updateDom = (virtualDomDiff) => {

    }

    let domRootElement: HTMLElement;
    let currentElementIndex = 0;
    const generateDom = (component, tree: HTMLElement): Fiber => {
        if (component.type) {
            if (typeof component.type === "function") {
                const reactElement = component.type(component.props);
                const fiber: Fiber = {
                    elementType: "Element",
                    elementIndex: currentElementIndex++,
                    component: component.type,
                    children: []
                }
                fiber.children!.push(generateDom(reactElement, tree));
                return fiber;
            } else {
                const element = document.createElement(component.type)
                const fiber: Fiber = {
                    elementType: component.type,
                    elementIndex: currentElementIndex++,
                    component: component.type,
                    children: []
                }

                if (component.type === "button") {
                    element.addEventListener('click', component.props.onClick);
                }
                if (component.type === "input") {
                    element.value = component.props.value;
                    element.oninput = component.props.onChange;
                }
                tree.appendChild(element);
                if (component.props?.children) {
                    if (Array.isArray(component.props.children)) {
                        component.props.children.map(children => fiber.children!.push(generateDom(children, element)));
                    } else {
                        fiber.children!.push(generateDom(component.props.children, element));
                    }
                }
                return fiber;
            }
        } else {
            const text = document.createTextNode(component);
            const fiber: Fiber = {elementType: "Text", elementIndex: currentElementIndex++, component: component.type}
            tree.appendChild(text);
            return fiber;
        }
    }

    export const createRoot = (root: HTMLElement) => {
        domRootElement = root;
    }

    interface Fiber {
        domElement?: HTMLElement;
        component: Function;
        children?: Fiber[];
        elementIndex: number;
        elementType: any;
    }
}
