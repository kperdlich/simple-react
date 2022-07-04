import {
    EffectQueueState,
    Fiber,
    FunctionalComponent,
    HostComponent,
    HostText,
    Placement,
    RootFiber,
    Update
} from "./DomRenderer";
import {setValueForProperty} from "./DOMComponent";
import {HasEffect} from "./Hooks";

export const commitRoot = (workInProgressRoot: Fiber, root: RootFiber) => {
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

export const commitPassiveMountEffects = (finishedWork: Fiber | null) => {
    let nextEffect = finishedWork;
    while (nextEffect !== null) {
        const child = nextEffect.child;

        if (child !== null) {
            nextEffect = child;
        } else {
            nextEffect = commitPassiveMountEffects_complete(nextEffect);
        }
    }
}

const commitPassiveMountEffects_complete = (fiberWithEffect: Fiber | null): Fiber | null => {
    let nextEffect = fiberWithEffect;
    while (nextEffect !== null) {
        switch (nextEffect.tag) {
            case FunctionalComponent:
                commitHookEffectListMount(nextEffect);
                break;
        }

        const sibling = nextEffect.sibling;
        if (sibling !== null) {
            nextEffect = sibling;
            return nextEffect;
        }
        nextEffect = nextEffect.return;
    }
    return null;
}

const commitHookEffectListMount = (finishedWork: Fiber) => {
    const updateQueue = (finishedWork.updateQueue as EffectQueueState);
    const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
        const firstEffect = lastEffect.next!; // Assume non-null as it is a circular queue
        let effect = firstEffect;

        do {
            if (effect.tag & HasEffect) {
                const destroy = effect.create();
                if (destroy !== undefined) {
                    effect.destroy = destroy;
                }
            }
            effect = effect.next!;
        } while (effect !== firstEffect);
    }
};

export const commitPassiveUnmountEffects = (firstChild: Fiber | null) => {
    let nextEffect = firstChild;

    while (nextEffect !== null) {
        const child = nextEffect.child;

        // TODO Detach deletions?

        if (child !== null) {
            nextEffect = child;
        } else {
            // Child path complete
            nextEffect = commitPassiveUnmountEffects_complete(nextEffect);
        }
    }
}
/**
 * Triggers hook effect and iterates over siblings and finally parents
 * @param effect
 */
const commitPassiveUnmountEffects_complete = (effect: Fiber | null): Fiber | null => {
    let nextEffect = effect;
    while (nextEffect !== null) {
        switch (nextEffect.tag) {
            case FunctionalComponent:
                commitHookEffectListUnmount(nextEffect);
                break;
        }

        const sibling = nextEffect.sibling;
        if (sibling !== null) {
            nextEffect = sibling;
            return nextEffect;
        }
        nextEffect = nextEffect.return;
    }

    return null;
}

/**
 * Iterate over circular update queue add call destroy if flag "HasEffect" is set
 * @param finishedWork - Fiber to process update queue
 */
const commitHookEffectListUnmount = (finishedWork: Fiber) => {
    const updateQueue = (finishedWork.updateQueue as EffectQueueState);
    const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
        const firstEffect = lastEffect.next!; // Assume non-null as it is a circular queue
        let effect = firstEffect;

        do {
            if (effect.tag & HasEffect) {
                const destroy = effect.destroy;
                if (destroy !== null) {
                    try {
                        destroy();
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
            effect = effect.next!;
        } while (effect !== firstEffect);
    }
}
