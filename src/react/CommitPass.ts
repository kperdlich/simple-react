import {Fiber, HostComponent, HostText, Placement, RootFiber, Update} from "./DomRenderer";

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
    let child = parentFiber.child;

    while (child !== null) {
        commitMutationEffectsOnFiber(child, root);
        child = child.sibling;
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
