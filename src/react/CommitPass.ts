import {Fiber, HostComponent, HostText, Placement, RootFiber, Update} from "./DomRenderer";
import {setValueForProperty} from "./DOMComponent";

export const commitRoot = (workInProgressRoot: Fiber, root: RootFiber) => {
    // TODO Trigger commit effects recursive
    commitMutationEffectsOnFiber(workInProgressRoot, root);
}

const commitMutationEffectsOnFiber = (finishedWork: Fiber, root: RootFiber) => {
    const flags = finishedWork.flags;

    switch (finishedWork.tag) {
        case HostComponent:
            recursivelyTraverseMutationEffects(root, finishedWork);
            if (flags & Placement) {
                insertOrAppendPlacementNodeIntoContainer(finishedWork, root.containerInfo);
            } else if (flags & Update) {
                const newProps = finishedWork.memoizedProps;
                const oldProps = finishedWork.alternate ? finishedWork.alternate.memoizedProps : newProps; // Will bail out later
                const type = finishedWork.type;
                const updatePayload = finishedWork.updateQueue;
                finishedWork.updateQueue = null;
                if (updatePayload) {
                    updateDOMProperties(finishedWork.stateNode as HTMLElement, updatePayload as any, type, oldProps, newProps);
                }
            }
            return;
        case HostText:
            recursivelyTraverseMutationEffects(root, finishedWork);
            if (flags & Update) {
                const textInstance = finishedWork.stateNode;
                const newText = finishedWork.memoizedProps;
                if (textInstance === null) {
                    throw Error("textInstance === undefined");
                }
                textInstance.nodeValue = newText;
            }
            return;
        default:
            recursivelyTraverseMutationEffects(root, finishedWork);
            break;
    }
}

const recursivelyTraverseMutationEffects = (root: RootFiber, parentFiber: Fiber) => {
    if (parentFiber.deletions !== null) {
        for (const childToDelete of parentFiber.deletions) {
            commitDeletionEffectsOnFiber(parentFiber, childToDelete);
        }
    }

    let child = parentFiber.child;
    while (child !== null) {
        commitMutationEffectsOnFiber(child, root);
        child = child.sibling;
    }
}

const commitDeletionEffectsOnFiber = (parentFiber: Fiber, deletedFiber: Fiber) => {
    switch (deletedFiber.tag) {
        case HostComponent:
        case HostText:
            (parentFiber.stateNode as HTMLElement).removeChild(deletedFiber.stateNode as Node);
            return;
    }
}

const insertOrAppendPlacementNodeIntoContainer = (node: Fiber, parent: HTMLElement) => {
    const tag = node.tag;
    const isHost = tag === HostComponent || tag === HostText;

    if (isHost) {
        const stateNode = node.stateNode;
        if (stateNode === null) {
            throw Error("insertOrAppendPlacementNodeIntoContainer: stateNode === null");
        }
        parent.appendChild(stateNode);
    } else {
        const child = node.child;
        if (child !== null) {
            insertOrAppendPlacementNodeIntoContainer(child, parent);
            let sibling = child.sibling;

            while (sibling !== null) {
                insertOrAppendPlacementNodeIntoContainer(sibling, parent);
                sibling = sibling.sibling;
            }
        }
    }
}

const updateDOMProperties = (domElement: HTMLElement, updatePayload: any[], type: string, oldProps: any, newProps: any) => {
    for (let i = 0; i < updatePayload.length; i += 2) {
        const propKey = updatePayload[i];
        const propValue = updatePayload[i + 1];

        setValueForProperty(domElement, propKey, propValue);
    }
}
