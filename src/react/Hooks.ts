import {
    currentFiber, EffectQueueState, EffectState, Fiber,
    Hook,
    HookAction,
    markUpdateLaneFromFiberToRoot,
    scheduleUpdate, setCurrentFiber
} from "./DomRenderer";

export const NoFlags = 0b0000;
export const HasEffect = 0b0001; // Represents whether effect should fire.

let firstCurrentFiberHook: Hook | null = null;
let currentHook: Hook | null = null;

/**
 * Pushes effect into circular fiber update queue.
 * @param effect - Effect to push
 */
const pushEffect = (effect: EffectState): EffectState => {
    if (currentFiber.updateQueue === null) {
        // Create queue and add effect
        currentFiber.updateQueue = { lastEffect: null };
        currentFiber.updateQueue.lastEffect = effect.next = effect;
    } else {
        const updateQueue = currentFiber.updateQueue as EffectQueueState;
        if (updateQueue.lastEffect === null) {
            // Simply add effect as last/first Effect
            updateQueue.lastEffect = effect.next = effect;
        } else {
            // Add Effect to the end of the queue.
            const firstEffect = updateQueue.lastEffect.next;
            updateQueue.lastEffect.next = effect;
            effect.next = firstEffect;
            updateQueue.lastEffect = effect;
        }
    }
    return effect;
}
/**
 * Checks if inputs are equal using Object.is
 * @param nextDeps
 * @param prevDeps
 */
const areHookInputsEqual = (nextDeps: any[] | null, prevDeps: any[] | null): boolean => {
    if (nextDeps === null && prevDeps === null) {
        return true;
    }

    if ((nextDeps && !prevDeps) || (!nextDeps && prevDeps) || nextDeps!.length !== prevDeps!.length) {
        throw Error("Dependency list has changed across rerender!");
    }

    for (let i = 0; i < nextDeps!.length; ++i) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
        if (!Object.is(nextDeps![i], prevDeps![i])) {
            return false;
        }
    }

    return true;
}

export const useEffect = (action: () => (() => void) | undefined, deps?: any[]) => {
    const newDeps = deps === undefined ? null : deps;
    const hook = resolveOrCreateHook();
    if (hook.state === null) {
        // Initial Creation
        const newEffect: EffectState = {create: action, deps: newDeps, destroy: null, next: null, tag: HasEffect};
        hook.state = pushEffect(newEffect);
        return;
    }

    const newEffect = {create: action, deps: newDeps, destroy: null, next: null, tag: NoFlags};
    const oldDeps = (hook.state as EffectState).deps;

    if (newDeps !== null) {
        for (let i = 0; i < newDeps.length; ++i) {
            if (areHookInputsEqual(newDeps, oldDeps)) {
                // We always push the effects into the queue - during commit it will only be executed depending on the flags
                hook.state = pushEffect(newEffect);
                return;
            }
        }
    }
    // There has been a change/effect, apply.
    newEffect.tag |= HasEffect;
    hook.state = pushEffect(newEffect);
}

export const prepareToUseHooks = (fiber: Fiber) => {
    setCurrentFiber(fiber);
    firstCurrentFiberHook = currentFiber.memoizedState as Hook;
    currentHook = null;
}

export const resolveOrCreateHook = <T>(initialState?: T): Hook => {
    const initState = initialState === undefined ? null: initialState;
    if (firstCurrentFiberHook === null && currentHook === null) {
        // Initial rendering, first hook
        const newHook: Hook = {state: initState, next: null, queue: null};
        currentFiber.memoizedState = newHook;
        firstCurrentFiberHook = currentFiber.memoizedState;
        currentHook = firstCurrentFiberHook;
    } else if (firstCurrentFiberHook && currentHook && currentHook.next === null) {
        // Initial rendering, greater first hook
        const newHook: Hook = {state: initState, next: null, queue: null};
        currentHook.next = newHook;
        currentHook = newHook;
    } else if (firstCurrentFiberHook && !currentHook) {
        currentHook = firstCurrentFiberHook;
    } else if (currentHook && currentHook.next) {
        currentHook = currentHook.next;
    } else {
        throw Error("Hooks are messed up :(");
    }

    return currentHook;
}


export const useState = <T>(initialValue: T): [T, (value: T | ((current: T) => T)) => void] => {
    const hook = resolveOrCreateHook(initialValue);
    updateState(hook);
    const hookFiber = currentFiber;

    const setState = (newValue: T | ((current: T) => T)) => {
        const hookAction: HookAction = {
            action: newValue,
            hasEagerState: typeof newValue !== "function",
            next: null,
        };
        enqueueHookUpdate(hook, hookAction);
        markUpdateLaneFromFiberToRoot(hookFiber);
        scheduleUpdate();
    }

    return [hook.state as T, setState];
}

const enqueueHookUpdate = (hook: Hook, update: HookAction) => {
    if (hook.queue === null) {
        hook.queue = update;
    } else {
        // Add to end of pending actions list
        let lastUpdate = hook.queue;
        while (lastUpdate.next !== null) {
            lastUpdate = lastUpdate.next;
        }
        lastUpdate.next = update;
    }
}

const updateState = (hook: Hook): Hook => {
    if (hook.queue === null) return hook;

    // Apply all pending actions sequentially
    let currentAction: HookAction | null = hook.queue;
    let newState = hook.state;
    do {
        if (currentAction.hasEagerState) {
            newState = currentAction.action;
        } else {
            newState = currentAction.action(newState);
        }
        currentAction = currentAction.next;
    } while (currentAction !== null);

    hook.state = newState;
    hook.queue = null;
    return hook;
}