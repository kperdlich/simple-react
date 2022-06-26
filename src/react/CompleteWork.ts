import {Fiber, FunctionalComponent, HostComponent, HostText, Update} from "./DomRenderer";
import {appendAllChildren, createElement, createTextInstance, setInitialDOMProperties} from "./DOMComponent";

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
                // Update DOM Instance
            } else {
                // TODO Create & Append DOM Instance
                // TODO Set State node
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

const markUpdate = (workInProgress: Fiber) => {
    workInProgress.flags |= Update;
}
