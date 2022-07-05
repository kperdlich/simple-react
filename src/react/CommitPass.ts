import {
    EffectQueueState,
    Fiber,
    FunctionalComponent,
    HostComponent, HostRoot,
    HostText,
    Placement,
    RootFiber,
    Update
} from "./DomRenderer";
import {setValueForProperty} from "./DOMComponent";
import {HasEffect, NoFlags, Passive} from "./Hooks";

export const commitRoot = (workInProgressRoot: Fiber, root: RootFiber) => {
    commitMutationEffectsOnFiber(workInProgressRoot, root);
}

const commitMutationEffectsOnFiber = (finishedWork: Fiber, root: RootFiber) => {
    const flags = finishedWork.flags;

    switch (finishedWork.tag) {
        case HostComponent:
            recursivelyTraverseMutationEffects(root, finishedWork);
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
            throw Error("Invalid host parent.");
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
                commitHookEffectListMount(Passive | HasEffect, nextEffect);
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

const commitHookEffectListMount = (flags: number, finishedWork: Fiber) => {
    const updateQueue = (finishedWork.updateQueue as EffectQueueState);
    const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
        const firstEffect = lastEffect.next!; // Assume non-null as it is a circular queue
        let effect = firstEffect;

        do {
            if ((effect.tag & flags) === flags) {
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

        const deletions = nextEffect.deletions;
        if (deletions) {
            for (let i = 0; i < deletions.length; i++) {
                const fiberToDelete = deletions[i];
                commitPassiveUnmountEffectsInsideOfDeletedTree_begin(fiberToDelete, nextEffect);
            }

            // Disconnect child and sibling pointers from alternate
            const previousFiber = nextEffect.alternate;
            if (previousFiber !== null) {
                let detachedChild = previousFiber.child;

                if (detachedChild !== null) {
                    previousFiber.child = null;

                    do {
                        const detachedSibling = detachedChild.sibling;
                        detachedChild.sibling = null;
                        detachedChild = detachedSibling;
                    } while (detachedChild !== null);
                }
            }
        }

        if (child !== null) {
            nextEffect = child;
        } else {
            // Child path complete
            nextEffect = commitPassiveUnmountEffects_complete(nextEffect);
        }
    }
}
/**
 * Iterates over all children of deleted subtree and calls unmount
 * @param deletedSubtreeRoot
 * @param nearestMountedAncestor
 */
const commitPassiveUnmountEffectsInsideOfDeletedTree_begin = (deletedSubtreeRoot: Fiber, nearestMountedAncestor: Fiber) => {
    let nextEffect: Fiber | null = deletedSubtreeRoot;

    while (nextEffect !== null) {
        switch (nextEffect.tag) {
            case FunctionalComponent: // Only functional components have effects!
                commitHookEffectListUnmount(Passive, nextEffect);
                break;
        }

        let child = nextEffect.child;
        if (child !== null) {
            nextEffect = child;
        } else {
            nextEffect = commitPassiveUnmountEffectsInsideOfDeletedTree_complete(nextEffect, deletedSubtreeRoot);
        }
    }
}

const commitPassiveUnmountEffectsInsideOfDeletedTree_complete = (currentFiber: Fiber | null, deletedSubtreeRoot: Fiber): Fiber | null => {
    let nextEffect = currentFiber;
    while (nextEffect !== null) {
        const fiber = nextEffect;
        const fiberSibling = fiber.sibling;
        const fiberReturn = fiber.return;
        detachFiberAfterEffects(fiber);

        if (fiber === deletedSubtreeRoot) {
            return null;
        }

        if (fiberSibling) {
            nextEffect = fiberSibling;
            return nextEffect;
        }

        nextEffect = fiberReturn;
    }
    return null;
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
                commitHookEffectListUnmount(Passive | HasEffect, nextEffect);
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
 * @param flags: Flags that are required to call destroy
 * @param finishedWork - Fiber to process update queue
 *
 */
const commitHookEffectListUnmount = (flags: number, finishedWork: Fiber) => {
    const updateQueue = (finishedWork.updateQueue as EffectQueueState);
    const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
        const firstEffect = lastEffect.next!; // Assume non-null as it is a circular queue
        let effect = firstEffect;

        do {
            if ((effect.tag & flags) === flags) {
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

const detachFiberAfterEffects = (fiber: Fiber) => {
    const alternate = fiber.alternate;
    if (alternate !== null) {
        fiber.alternate = null;
        detachFiberAfterEffects(alternate);
    }

    fiber.child = null;
    fiber.deletions = null;
    fiber.sibling = null;
    fiber.stateNode = null;
    fiber.return = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.updateQueue = null;
}