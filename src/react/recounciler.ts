import {
    createFiberFromText,
    createFiberFromTypeAndProps,
    Fiber, HostText,
    PerformedWork,
    Placement,
    prepareToUseHooks,
    ReactElement
} from "./DomRenderer";

export const updateFunctionalComponent = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    if (current === null) {
        workInProgress.flags |= Placement;
    }
    const component = workInProgress.type;
    const props = workInProgress.pendingProps;
    const children = renderWithHooks(current, workInProgress, component, props);

    workInProgress.flags |= PerformedWork;
    reconcileChildren(current, workInProgress, children);
    return workInProgress.child;
}

export const updateHostComponent = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    const nextProps = workInProgress.pendingProps;
    const nextChildren = nextProps.children;

    reconcileChildren(current, workInProgress, nextChildren);
    return workInProgress.child;
}

export const updateHostText = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    // Nothing to do here. Let's do the completion step.
    return null;
}

export const updateHostRoot = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    const nextProps = workInProgress.pendingProps;
    const component = nextProps.children;
    const children = renderWithHooks(current, workInProgress, component, nextProps);

    reconcileChildren(current, workInProgress, children);
    return workInProgress.child;
}

const reconcileChildren = (current: Fiber | null, workInProgress: Fiber, nextChildren: any) => {
    if (current === null) {
        workInProgress.child = reconcileChildFibers(workInProgress, null, nextChildren);
    } else {
        workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren);
    }
}

const reconcileChildFibers = (returnFiber: Fiber, currentFirstChild: Fiber | null, newChild: any): Fiber | null => {
    if (typeof newChild === "object") {
        if (newChild.$$typeof) {
            return reconcileSingleElement(returnFiber, currentFirstChild, newChild);
        }

        if (Array.isArray(newChild)) {
            return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
        }
    }

    if (typeof newChild === "string" || typeof newChild === "number") {
        return reconcileSingleTextNode(returnFiber, currentFirstChild, newChild);
    }

    return null;
}

const reconcileSingleTextNode = (returnFiber: Fiber, currentFirstChild: Fiber | null, textContent: string | number): Fiber => {
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
        // TODO Reuse existing one
    }

    const newFiber = createFiberFromText(textContent);
    newFiber.return = returnFiber;
    newFiber.flags |= Placement; // Technical this is part of placeSingleChild() but anyways ...
    return newFiber;
}

const reconcileSingleElement = (returnFiber: Fiber, currentFirstChild: Fiber | null, element: ReactElement): Fiber => {
    const newFiber = createFiberFromTypeAndProps(element.type, element.key, element.props);
    newFiber.return = returnFiber;
    newFiber.flags |= Placement; // Technical this is part of placeSingleChild() but anyways ...
    return newFiber;
}

const reconcileChildrenArray = (returnFiber: Fiber, currentFirstChild: Fiber | null, newChildren: any[]): Fiber => {
    // TODO Check for known keys using set/ sort if keys have different order
    // TODO Delete child if required
    // TODO mapRemainingChildren
    const oldFiber = currentFirstChild;
    let firstChild = currentFirstChild;

    if (oldFiber === null) {
        let prevFiber: Fiber | null = null;
        for (let i = 0; i < newChildren.length; ++i) {
            const newFiber = createChild(returnFiber, newChildren[i]);
            if (prevFiber === null) {
                firstChild = prevFiber = newFiber;
            } else {
                prevFiber.sibling = prevFiber = newFiber;
            }
        }
    }

    if (firstChild === null) {
        throw Error("Oh no :(");
    }

    return firstChild;
}

const createChild = (returnFiber: Fiber, newChild: any): Fiber => {
    if (typeof newChild === 'string' || typeof newChild === 'number') {
        const created = createFiberFromText(newChild);
        created.return = returnFiber;
        return created;
    }

    if (typeof newChild === "object") {
        if (newChild.$$typeof) {
            const childAsElement = newChild as ReactElement;
            const newFiber = createFiberFromTypeAndProps(childAsElement.type, childAsElement.key, childAsElement.props);
            newFiber.return = returnFiber;
            return newFiber;
        }

        if (Array.isArray(newChild)) {
            throw Error("Array wtf :O");
        }
    }

    throw Error("Unknown Type wtf :O");
}

const renderWithHooks = (current: Fiber | null, workInProgress: Fiber, Component: (any) => any, props: any): any => {
    prepareToUseHooks(workInProgress);

    const children = Component(props);

    return children;
}
