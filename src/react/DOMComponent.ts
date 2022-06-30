import {Fiber, HostComponent, HostText} from "./DomRenderer";

export const CHILDREN = "children";

export const appendAllChildren = (parent: HTMLElement, workInProgress: Fiber) => {
    let node = workInProgress.child;

    while (node !== null) {
        if (node.tag === HostComponent || node.tag === HostText) {
            if (node.stateNode === null) {
                throw Error("appendAllChildren: stateNode is broken :(");
            }
            parent.appendChild(node.stateNode);
        }

        if (node === workInProgress) {
            return;
        }

        while (node.sibling === null) {
            if (node.return === null || node.return === workInProgress) {
                return;
            }
            node = node.return;
        }

        node = node.sibling;
    }
}

const setTextContent = (node: HTMLElement, text: string) => {
    node.textContent = text;
}

export const setValueForProperty = (node: HTMLElement, name: string, value: any | null) => {
    if (value === null) {
        node.removeAttribute(name);
    } else {
        // TODO Map react props to HTML props
        let attributeName = name;
        switch (name) {
            case "className":
                attributeName = "class";
                break;
            case "onChange":
                node.oninput = value;
                return;
            case "onClick":
                node.onclick = value;
                return;
        }

        node.setAttribute(attributeName, value)
    }
}

export const setInitialDOMProperties = (tag: number, domElement: HTMLElement, nextProps: any) => {
    for (let propKey in nextProps) {
        const prop = nextProps[propKey];

        // React uses children prop to inline text in e.g. spans, but we ignore that optimization
        if (propKey === CHILDREN) {
            /*if (typeof prop === "string") {
                setTextContent(domElement, prop);
            }
            if (typeof prop === "number") {
                setTextContent(domElement, prop.toString());
            }*/
        } else if (prop !== null) {
            setValueForProperty(domElement, propKey, prop);
        }
    }
}

export const createElement = (type: string, props: any): HTMLElement => {
    const domElement = document.createElement(type);
    return domElement;
}

export const createTextInstance = (
    newText: string,
    workInProgress: Fiber
): Text => {
    // Actually react uses the rootContainerInstance, instead of "document"
    const instance = document.createTextNode(newText);
    return instance;
};
