import {prepareToUseHooks} from "../hooks/Hooks";
import {
    createFiberFromText, createFiberFromTypeAndProps, createWorkInProgress,
    Fiber,
    FunctionalComponent,
    HostComponent,
    HostRoot,
    HostState,
    HostText,
    Placement, ReactElement
} from "../Fiber";
import {completeUnitOfWork} from "./CompleteWork";

export const beginWork = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    if (current !== null) {
        const oldProps = current.memoizedProps;
        const newProps = workInProgress.pendingProps;

        // Updated by state changes
        // Remember: A update is always scheduled on the current fiber (prev committed work)
        if (!current.updates && oldProps === newProps) {
            return attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress);
        }
    }

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


export const performUnitOfWork = (unitOfWork: Fiber): Fiber | null => {
    const current = unitOfWork.alternate;
    let next = beginWork(current, unitOfWork);

    // Props are now fully rendered/updated
    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
        next = completeUnitOfWork(unitOfWork);
    }
    return next;
}


export const updateFunctionalComponent = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    if (current === null) {
        workInProgress.flags |= Placement;
    }
    const component = workInProgress.type;
    const props = workInProgress.pendingProps;
    const children = renderWithHooks(current, workInProgress, component, props);

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
        const nextState = workInProgress.updateQueue as HostState;
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
            return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild));
        }

        if (Array.isArray(newChild)) {
            return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
        }
    }

    if (typeof newChild === "string" || typeof newChild === "number") {
        return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, newChild));
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
                existing.return = returnFiber;
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
    return newFiber;
}

/**
 * Updates existing Fibers by iterating over the new jsx children. Match is done via key.
 * Existing fibers that have not been matched will be deleted.
 * It will also create a new Fiber if none alternate exists (Double buffering)
 * @param returnFiber
 * @param currentFirstChild
 * @param newChildren
 */
const reconcileChildrenArray = (returnFiber: Fiber, currentFirstChild: Fiber | null, newChildren: any[]): Fiber | null => {
    let oldFiber = currentFirstChild;

    let index = 0;
    let nextOldFiber: Fiber | null = null;
    let previousNewFiber: Fiber | null = null;
    let resultingFirstChild: Fiber | null = null;

    // Check new children against existing fibers using key and try to update
    for (; oldFiber !== null && index < newChildren.length; ++index) {
        nextOldFiber = oldFiber.sibling;

        const newFiber = updateSlot(returnFiber, oldFiber, newChildren[index]);

        // Key did not match
        if (newFiber === null) {
            // Break out and check against remaining child's using key map
            break;
        }

        if (previousNewFiber === null) {
            resultingFirstChild = newFiber;
        } else {
            previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
    }

    if (index === newChildren.length) {
        // All new children have been processed, the rest can be deleted
        deleteRemainingChildren(returnFiber, oldFiber);
        return resultingFirstChild;
    }

    if (oldFiber === null) {
        // No more existing children, only insertions
        for (; index < newChildren.length; ++index) {
            const newFiber = createChild(returnFiber, newChildren[index]);

            placeSingleChild(newFiber);

            if (previousNewFiber === null) {
                resultingFirstChild = newFiber;
            } else {
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
        }
        return resultingFirstChild;
    }

    // Generate remaining children's map: key -> fiber.
    const existingChildren = new Map();
    let existingChild: Fiber | null = oldFiber;
    while (existingChild !== null) {
        if (existingChild.key !== null) {
            existingChildren.set(existingChild.key, existingChild);
        } else {
            throw Error("Key is null and index path is not supported");
        }
        existingChild = existingChild.sibling;
    }

    // Update matching fibers
    for (; index < newChildren.length; ++index) {
        const newFiber = updateFromMap(existingChildren, returnFiber, newChildren[index]);

        if (newFiber !== null) {
            // Remove from map, otherwise it's handled as deletion
            existingChildren.delete(newFiber.key);
        }

        if (previousNewFiber === null) {
            resultingFirstChild = newFiber;
        } else {
            previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
    }

    // Delete the leftovers from the map
    existingChildren.forEach((value) => {
        deleteChild(returnFiber, value);
    });

    return resultingFirstChild;
}

const updateFromMap = (existingChildren: Map<string | Fiber, Fiber>, returnFiber: Fiber, newChild: ReactElement | any) => {
    if (typeof newChild === "string" || typeof newChild === "number") {
        throw Error("Text Node via Index not implemented");
    }

    if (typeof newChild === "object") {
        if (newChild.$$typeof) {
            const matchedFiber = existingChildren.get(newChild.key) || null;
            return updateElement(returnFiber, matchedFiber, newChild);
        }
    }

    throw Error("Not implemented!");
}

const deleteRemainingChildren = (returnFiber: Fiber, currentFirstChild: Fiber | null) => {
    let childToDelete: Fiber | null = currentFirstChild;
    while (childToDelete !== null) {
        deleteChild(returnFiber, childToDelete);
        childToDelete = childToDelete.sibling;
    }
}

const deleteChild = (returnFiber: Fiber, childToDelete: Fiber) => {
    if (returnFiber.deletions === null) {
        returnFiber.deletions = [childToDelete]; // TODO Add child deletion flag?
    } else {
        returnFiber.deletions.push(childToDelete);
    }
};


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

    while (currentChild.sibling !== null) {
        currentChild = currentChild.sibling;
        newChild = newChild.sibling = createWorkInProgress(currentChild, currentChild.pendingProps);
        newChild.return = workInProgress;
    }
    newChild.sibling = null;
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
        existing.return = returnFiber;
        existing.sibling = null;
        return existing;
    }
}

const placeSingleChild = (newFiber: Fiber) => {
    if (newFiber.alternate === null) {
        newFiber.flags |= Placement;
    }
    return newFiber;
}
