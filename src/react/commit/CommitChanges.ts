import {setValueForProperty} from "../dom/DOMComponent";
import {Fiber, FunctionalComponent, HostComponent, HostRoot, HostText, Placement, RootFiber, Update} from "../Fiber";

export const commitRoot = ({workInProgressRoot, root}: { workInProgressRoot: Fiber, root: RootFiber }) => {
    commitMutationEffectsOnFiber(workInProgressRoot, root);
}

const commitMutationEffectsOnFiber = (finishedWork: Fiber, root: RootFiber) => {
    const flags = finishedWork.flags;

    switch (finishedWork.tag) {
        case HostComponent:
            recursivelyTraverseMutationEffects(root, finishedWork);
            if (finishedWork.flags & Placement) {
                commitPlacement(finishedWork);
            }
            if (flags & Update) {
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
                const textInstance = finishedWork.stateNode as Text;
                const newText = finishedWork.memoizedProps;
                if (textInstance === null) {
                    throw Error("textInstance === undefined");
                }
                textInstance.nodeValue = newText;
            }
            return;
        case FunctionalComponent:
            recursivelyTraverseMutationEffects(root, finishedWork);
            if (finishedWork.flags & Placement) {
                commitPlacement(finishedWork);
            }
            return;
        default:
            recursivelyTraverseMutationEffects(root, finishedWork);
            break;
    }
}

const commitPlacement = (finishedWork: Fiber) => {
    const parent = finishedWork.return!;
    switch (parent.tag) {
        case HostComponent:
            insertOrAppendPlacementNodeIntoContainer(finishedWork, parent.stateNode as HTMLElement);
            break;
        case HostRoot:
            insertOrAppendPlacementNodeIntoContainer(finishedWork, (parent.stateNode as RootFiber).containerInfo);
            break;
        default:
            break; // We should throw an error but sometimes the placement flags are messed up
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
        case FunctionalComponent:
            // Drill down until we find all child elements
            commitDeletionEffectsOnFiber(parentFiber, deletedFiber.child!);
            return;
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
        parent.appendChild(stateNode as HTMLElement);
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

