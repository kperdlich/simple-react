import {Fiber, FunctionalComponent, HostComponent, HostText, Update} from "./DomRenderer";
import {appendAllChildren, CHILDREN, createElement, createTextInstance, setInitialDOMProperties} from "./DOMComponent";

export const completeUnitOfWork = (unitOfWork: Fiber): Fiber | null => {
    let completedWork: Fiber | null = unitOfWork;

    do {
        const returnFiber = completedWork.return;
        const siblingFiber = completedWork.sibling;
        const current = completedWork.alternate;

        const nextUnitOfWork = completeWork(current, completedWork);

        if (nextUnitOfWork !== null) {
            return nextUnitOfWork;
        }

        if (siblingFiber !== null) {
            return siblingFiber;
        }

        completedWork = returnFiber;

    } while (completedWork !== null);

    return null;
}

export const completeWork = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    const newProps = workInProgress.pendingProps;
    switch (workInProgress.tag) {
        case FunctionalComponent:
            break;
        case HostComponent:
            const type = workInProgress.type;
            if (current !== null && workInProgress.stateNode !== null) {
                // Update DOM Element
                const oldProps = current.memoizedProps;
                // Check for bailout
                if (oldProps !== newProps) {
                    const updatePayload = diffProperties(workInProgress.stateNode as HTMLElement, workInProgress.type, oldProps, newProps);
                    workInProgress.updateQueue = updatePayload;
                    if (updatePayload) {
                        markUpdate(workInProgress);
                    }
                }
            } else {
                // Create DOM Element
                const instance = createElement(type, newProps);
                appendAllChildren(instance, workInProgress);
                workInProgress.stateNode = instance;
                setInitialDOMProperties(workInProgress.tag, instance, newProps);
            }
            return null;
        case HostText:
            const newText = newProps;
            if (current !== null && workInProgress.stateNode !== null) {
                const oldText = current.memoizedProps;
                if (newText !== oldText) {
                    markUpdate(workInProgress);
                }
            } else {
                workInProgress.stateNode = createTextInstance(
                    newText,
                    workInProgress
                );
            }
            return null;
    }
    return null;

}

const diffProperties = (domElement: HTMLElement, type: string, oldProps: any, newProps: any): any[] | null => {
    let updatePayload: any[] | null = null;

    // Check for deleted props
    for (const propKey in oldProps) {
        if (newProps.hasOwnProperty(propKey)) {
            continue;
        }
        if (propKey !== CHILDREN) { // JSX Children don't have an impact on the DOM Element
            (updatePayload = updatePayload || []).push(propKey, null);
        }
    }

    // New/Updated Props
    for (const propKey in newProps) {
        const newProp = newProps[propKey];
        const oldProp = oldProps !== null ? oldProps[propKey] : null;

        if (newProp === oldProp) {
            continue;
        }

        // React uses children prop to inline text in e.g. spans, but we ignore that optimization
        if (propKey !== CHILDREN) {
            (updatePayload = updatePayload || []).push(propKey, newProp);
        }
    }

    return updatePayload;
}

const markUpdate = (workInProgress: Fiber) => {
    workInProgress.flags |= Update;
}
