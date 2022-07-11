import {EffectQueueState, Fiber, FunctionalComponent} from "../Fiber";
import {HasEffect, Passive} from "../hooks/Hooks";

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