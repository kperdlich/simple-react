import {
    createFiberFromText,
    createFiberFromTypeAndProps,
    Fiber, HostState, HostText, NoFlags,
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
    if (workInProgress.updateQueue) {
        const nextState = workInProgress.updateQueue;
        workInProgress.memoizedState = nextState;
        workInProgress.updateQueue = null;

        const nextChildren = nextState.element;
        reconcileChildren(current, workInProgress, nextChildren);
    }

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
        // TODO deleteRemainingChildren
        const existing = createWorkInProgress(currentFirstChild, textContent);
        existing.sibling = null;
        existing.return = returnFiber;
        return existing;
    }

    const newFiber = createFiberFromText(textContent);
    newFiber.return = returnFiber;
    newFiber.flags |= Placement; // Technical this is part of placeSingleChild() but anyways ...
    return newFiber;
}

const reconcileSingleElement = (returnFiber: Fiber, currentFirstChild: Fiber | null, element: ReactElement): Fiber => {
    const elementKey = element.key;
    const elementType = element.type;
    let child = currentFirstChild;

    while (child !== null) {
        if (child.key === elementKey) {
            if (elementType === child.type) {
                const existing = createWorkInProgress(child, element.props);
                existing.sibling = null;
                return existing
            } else {
                // TODO deleteRemainingChildren
                throw Error("Not Implemented");
            }
        } else {
            // TODO deleteChild
            throw Error("Not Implemented");
        }
        child = child!.sibling;
    } // Didn't match


    const newFiber = createFiberFromTypeAndProps(element.type, element.key, element.props);
    newFiber.return = returnFiber;
    newFiber.flags |= Placement; // Technical this is part of placeSingleChild() but anyways ...
    return newFiber;
}

const reconcileChildrenArray = (returnFiber: Fiber, currentFirstChild: Fiber | null, newChildren: any[]): Fiber | null => {
    // TODO Check for known keys using set/ sort if keys have different order
    // TODO Delete child if required
    // TODO mapRemainingChildren
    let oldFiber = currentFirstChild;
    let firstChild = currentFirstChild;

    if (oldFiber !== null) {
        let nextOldFiber: Fiber | null = null;
        let previousNewFiber: Fiber | null = null;

        for (let i = 0; oldFiber !== null && i < newChildren.length; ++i) {
            nextOldFiber = oldFiber.sibling;

            const newFiber = updateSlot(returnFiber, oldFiber, newChildren[i]);

            if (previousNewFiber === null) {
                firstChild = newFiber;
            } else {
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
            oldFiber = nextOldFiber;
        }
    } else {
        // Fast path, only insertions
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

export const attemptEarlyBailoutIfNoScheduledUpdate = (current: Fiber, workInProgress: Fiber): Fiber | null => {
    // Actually following code is part of called function bailoutOnAlreadyFinishedWork

    // Only bail out if there is no work scheduled on children
    if (!workInProgress.childUpdates) {
        return null;
    }

    // Children have work, lets clone them
    cloneChildFibers(current, workInProgress);
    return workInProgress.child;
}

const cloneChildFibers = (current: Fiber, workInProgress: Fiber) => {
    if (workInProgress.child !== current.child) {
        throw Error("Something went wrong :(");
    }

    if (workInProgress.child === null) {
        return;
    }

    let currentChild = workInProgress.child;
    let newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
    workInProgress.child = newChild;
    newChild.return = workInProgress;

    while(currentChild.sibling !== null) {
        currentChild = currentChild.sibling;
        newChild = newChild.sibling = createWorkInProgress(currentChild, currentChild.pendingProps);
        newChild.return = workInProgress;
    }
    newChild.sibling = null;
}

const createWorkInProgress = (current: Fiber, pendingProps: any): Fiber => {
    let workInProgress = current.alternate;

    if (workInProgress === null) {
        // We use double buffering pooling because we know that we'll only ever need two versions of the tree
        workInProgress = {
            type: current.type,
            pendingProps: pendingProps,
            key: current.key,
            childUpdates: current.childUpdates,
            updates: current.updates,
            child: current.child,
            memoizedProps: current.memoizedProps,
            memoizedState: current.memoizedState,
            sibling: current.sibling,
            return: null,
            tag: current.tag,
            alternate: current,
            flags: current.flags,
            stateNode: current.stateNode,
            updateQueue: null
        };

        current.alternate = workInProgress;

    } else {
        // TODO Copy Tag?
        workInProgress.pendingProps = pendingProps;
        workInProgress.type = current.type;
        workInProgress.flags = current.flags; // TODO correct?
        workInProgress.childUpdates = current.childUpdates;
        workInProgress.updates = current.updates;
        workInProgress.child = current.child;
        workInProgress.memoizedState = current.memoizedState;
        workInProgress.memoizedProps = current.memoizedProps;
        workInProgress.sibling = current.sibling;
    }

    return workInProgress;
}

const updateSlot = (returnFiber: Fiber, oldFiber: Fiber | null, newChild: any): Fiber | null => {
    const key = oldFiber !== null ? oldFiber.key : null;
    if (typeof newChild === "string" || typeof newChild === "number") {
        // TODO Text
        if (key !== null) {
            return null;
        }
        return updateTextNode(returnFiber, oldFiber, newChild);
    }

    if (typeof newChild === "object") {
        if (newChild.$$typeof) {
            if (newChild.key === key) {
                return updateElement(returnFiber, oldFiber, newChild);
            } else {
                return null;
            }
        }
    }

    return null;
}

const updateElement = (returnFiber: Fiber, current: Fiber | null, element: any): Fiber => {
    if (current !== null) {
        if (current.type === element.type) {
            const existing = createWorkInProgress(current, element.props);
            existing.sibling = null;
            existing.return = returnFiber;
            return existing;
        }
    }

    const created = createFiberFromTypeAndProps(element.type, element.key, element.props);
    created.return = returnFiber;
    return created;
}

const updateTextNode = (returnFiber: Fiber, current: Fiber | null, textContent: string | number): Fiber => {
    if (current === null || current.tag !== HostText) {
        // Insert
        const created = createFiberFromText(textContent);
        created.return = returnFiber;
        return created;
    } else {
        // Update
        const existing = createWorkInProgress(current, textContent)
        existing.sibling = null;
        return existing;
    }
}
