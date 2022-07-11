import {HasEffect, Passive} from "../hooks/Hooks";
import {EffectQueueState, Fiber, FunctionalComponent} from "../Fiber";

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
 * Iterate over circular update queue add call destroy if flags match
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