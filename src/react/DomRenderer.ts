import _ from "lodash";
import {updateFunctionalComponent, updateHostComponent, updateHostRoot, updateHostText} from "./recounciler";
import {completeUnitOfWork} from "./CompleteWork";
import {commitRoot} from "./CommitPass";

export type Fiber = {
    type: any,
    return: Fiber | null,
    child: Fiber | null,
    sibling: Fiber | null
    pendingProps: any | null,
    memoizedProps: any | null,
    memoizedState: Hook | null,
    key: string | null,
    tag: number | null;
    stateNode: Node | null; // stateNode
    updateQueue?: any,
    flags: number;
    alternate: Fiber | null,
}

export type ReactElement = {
    $$typeof: any,
    type: any,
    key: any,
    ref: any,
    props: any,
};

export const NoFlags = 0b000000000000;
export const PerformedWork = 0b00000000001;
export const Placement = 0b00000000010
export const Update = 0b000000000100;
export const Deletion = 0b000000001000;

type Hook = {
    state: any,
    next: Hook | null,
}

export const FunctionalComponent = 0;
export const HostRoot = 1;
export const HostComponent = 2;
export const HostText = 3;

let rootElement: HTMLElement;
let workInProgressRootFiber: Fiber | null;

let currentFiber: Fiber;
let firstCurrentFiberHook: Hook | null = null;
let currentHook: Hook | null = null;

let nextUnitOfWork: Fiber | null = null;

export const createRoot = (root: HTMLElement) => {
    rootElement = root;
}

export const render = (startComponent: () => JSX.Element) => {
    workInProgressRootFiber = createRootFiber();
    const startNode = createFiberFromTypeAndProps(startComponent, null, null);
    startNode.return = workInProgressRootFiber;
    workInProgressRootFiber.child = startNode;
    rerender();
    /*console.log(rootElement);

    rootFiber = createRootFiber();
    rootFiber.child = generateFiberTree(startComponent());
    rootFiber.child.return = rootFiber;

    console.log(rootFiber);
    createInitialTree(rootFiber, rootElement);*/
    /**
     * TODO
     * Generate new fiber tree and create diff
     * Store hook data in fiber?
     * Apply diff back to DOM
     */
}

const cloneFiber = (fiber: Fiber): Fiber => {
    return {
        ...fiber,
    };
}

const reconcileChildren = (current: Fiber | null, jsx: any) => {
    if (current === null) {
        // Add new element / placement
    } else if (current.type === jsx.type || current.key === jsx.key) {
        if (Array.isArray(jsx.props?.children)) {
            jsx.props.children.forEach((childJsx) => reconcileChildren(current.child, childJsx));
        } else if (!_.isEqual(current.pendingProps, jsx.props.children)) {
            console.log("Prop Change");
            // TODO Add Effect
        }
    } else {
        // Deleted
        console.log("Child change ");
    }
}

const beginWork = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    // TODO Reset lanes on workInProgress
    switch (workInProgress.tag) {
        case FunctionalComponent:
            return updateFunctionalComponent(current, workInProgress);
        case HostRoot:
            return updateHostRoot(current, workInProgress);
        case HostComponent:
            return updateHostComponent(current, workInProgress);
        case HostText:
            return updateHostText(current, workInProgress);
        default:
            throw Error("Not implemented!");
    }
}





const performUnitOfWork = (unitOfWork: Fiber): Fiber | null => {
    const current = unitOfWork.alternate;
    let next = beginWork(current, unitOfWork);

    // Props are now fully rendered/updated
    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
        next = completeUnitOfWork(unitOfWork);
    }
    return next;
}

const rerender = () => {
    nextUnitOfWork = workInProgressRootFiber!.child;
    while (nextUnitOfWork !== null) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }

    if (workInProgressRootFiber === null) {
        throw Error("workInProgressRootFiber.stateNode === null");
    }

    commitRoot(workInProgressRootFiber, rootElement);
}

const createInitialTree = (fiber: Fiber, element: HTMLElement) => {
    switch (fiber.tag) {
        case HostRoot:
        case FunctionalComponent:
            if (fiber.child) {
                createInitialTree(fiber.child, element);
            }
            if (fiber.sibling) {
                createInitialTree(fiber.sibling, element);
            }
            break;
        case HostComponent:
            const instance = createInstanceFromFiber(fiber);
            element.appendChild(instance);
            if (fiber.child) {
                createInitialTree(fiber.child, instance);
            }
            if (fiber.sibling) {
                createInitialTree(fiber.sibling, element);
            }
            break;
        case HostText:
            const text = createTextNodeFromFiber(fiber);
            element.appendChild(text);
            break;
    }
}

const createTextNodeFromFiber = (fiber: Fiber): Text => {
    const element = document.createTextNode(fiber.memoizedProps.children);
    fiber.stateNode = element;
    return element;
}

const createInstanceFromFiber = (fiber: Fiber): HTMLElement => {
    // TODO Dynamic setAttribute?
    const element = document.createElement(fiber.type);
    switch (fiber.type) {
        case "input": // TODO FIX pending to memo
            element.value = fiber.pendingProps.value;
            element.oninput = fiber.pendingProps.onChange;
            break;
        case "button":
            element.addEventListener('click', fiber.pendingProps.onClick);
            break;
        case "div":
            if (fiber.pendingProps?.className) {
                element.className = fiber.pendingProps.className;
            }
            break;
    }
    fiber.stateNode = element;
    return element;
}

const generateFiberTree = (jsx: JSX.Element): Fiber => {
    const key = jsx.key?.toString() || null;
    const fiber = createFiberFromTypeAndProps(jsx.type, key, jsx.props);

    if (jsx.type) {
        if (typeof jsx.type === "function") {
            fiber.tag = FunctionalComponent;
            prepareToUseHooks(fiber);
            const childJsx = jsx.type(jsx.props);
            fiber.child = generateFiberTree(childJsx);
            fiber.child.return = fiber;
        } else {
            fiber.tag = HostComponent;
            if (jsx.props?.children) {
                if (Array.isArray(jsx.props.children)) {
                    const siblings: Fiber[] = jsx.props.children.map((c) => generateFiberTree(c));
                    const firstSibling = siblings[0];
                    fiber.child = firstSibling;
                    firstSibling.return = fiber;
                    siblings.reduce((prev, current, _) => {
                        prev.sibling = current;
                        current.return = fiber;
                        return current;
                    });
                } else {
                    const childFiber = generateFiberTree(jsx.props.children);
                    fiber.child = childFiber;
                    childFiber.return = fiber;
                }
            }
        }
    } else {
        fiber.tag = HostText;
        fiber.memoizedProps = {
            children: jsx
        }
    }

    return fiber;
}

const copyIntoFiberFromTypeAndProps = (fiber: Fiber, type: any, key: string | null, pendingProps: any): Fiber => {
    fiber.type = type;
    fiber.key = key;
    fiber.pendingProps = pendingProps;
    return fiber;
}

export const createFiberFromText = (content: string | number): Fiber => {
    return {
        type: null,
        pendingProps: content,
        key: null,
        child: null,
        memoizedProps: null,
        memoizedState: null,
        sibling: null,
        return: null,
        tag: HostText,
        alternate: null,
        flags: NoFlags,
        stateNode: null,
    };
}

export const createFiberFromTypeAndProps = (type: any, key: string | null, pendingProps: any): Fiber => {
    // By default the tag is functional component even though we don't know, react uses intermediate component
    let tag = FunctionalComponent;
    if (typeof type === "string") {
        tag = HostComponent;
    }
    return {
        type: type,
        pendingProps: pendingProps,
        key: key,
        child: null,
        memoizedProps: null,
        memoizedState: null,
        sibling: null,
        return: null,
        tag: tag,
        alternate: null,
        flags: NoFlags,
        stateNode: null,
    };
}

const createRootFiber = (): Fiber => {
    return {
        type: null,
        pendingProps: null,
        key: null,
        child: null,
        memoizedProps: null,
        memoizedState: null,
        sibling: null,
        return: null,
        tag: HostRoot,
        alternate: null,
        flags: NoFlags,
        stateNode: null,
    };
}

const scheduleUpdate = () => {
    rerender();
};

export const prepareToUseHooks = (fiber: Fiber) => {
    currentFiber = fiber;
    firstCurrentFiberHook = currentFiber.memoizedState;
    currentHook = null;
}

const resolveOrCreateHook = <T>(initialValue: T): Hook => {
    if (firstCurrentFiberHook === null && currentHook === null) {
        // Initial rendering, first hook
        const newHook: Hook = {state: initialValue, next: null};
        currentFiber.memoizedState = newHook;
        firstCurrentFiberHook = currentFiber.memoizedState;
        currentHook = firstCurrentFiberHook;
    } else if (firstCurrentFiberHook && currentHook && currentHook.next === null) {
        // Initial rendering, greater first hook
        const newHook: Hook = {state: initialValue, next: null};
        currentHook.next = newHook;
        currentHook = newHook;
    } else if (firstCurrentFiberHook && !currentHook) {
        currentHook = firstCurrentFiberHook;
    } else if (currentHook && currentHook.next) {
        currentHook = currentHook.next;
    } else {
        throw Error("Hooks are messed up :(");
    }

    return currentHook;
}

export const useState = <T>(initialValue: T): [T, (value: T | ((current: T) => T)) => void] => {
    const hook = resolveOrCreateHook(initialValue);

    const setState = (newValue: T | ((current: T) => T)) => {
        hook.state = typeof newValue === "function"
            // @ts-ignores
            ? newValue(hook.state)
            : newValue;
        //currentFiber.flags |= Update; // TODO Bubble up child lane change
        scheduleUpdate();
    }

    return [hook.state as T, setState];
}

