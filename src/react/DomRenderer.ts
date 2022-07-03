import {
    attemptEarlyBailoutIfNoScheduledUpdate,
    updateFunctionalComponent,
    updateHostComponent,
    updateHostRoot,
    updateHostText
} from "./recounciler";
import {completeUnitOfWork} from "./CompleteWork";
import {commitRoot} from "./CommitPass";

export type RootFiber = {
    containerInfo: HTMLElement;
    current: Fiber | null;
    finishedWork: Fiber | null;
}

export type HostState = {
    element: any;
}

export type Fiber = {
    type: any,
    return: Fiber | null,
    child: Fiber | null,
    sibling: Fiber | null
    childUpdates: boolean, // childLane
    updates: boolean, // lanes
    pendingProps: any | null,
    memoizedProps: any | null,
    memoizedState: Hook | HostState | null,
    key: string | null,
    tag: number | null;
    stateNode: HTMLElement | Text | null;
    updateQueue: HostState | null | any[],
    flags: number;
    alternate: Fiber | null,
}

export type ReactElement = {
    $$typeof: any,
    type: any,
    key: any,
    ref: any,
    props: any,
};

export const NoFlags = 0b000000000000;
export const PerformedWork = 0b00000000001;
export const Placement = 0b00000000010
export const Update = 0b000000000100;
export const Deletion = 0b000000001000;

type Hook = {
    state: any,
    next: Hook | null,
    queue: HookAction | null,
}

type HookAction = {
    action: any,
    hasEagerState: boolean,
    next: HookAction | null,
}

export const FunctionalComponent = 0;
export const HostRoot = 3;
export const HostComponent = 5;
export const HostText = 6;

let rootFiber: RootFiber;

let currentFiber: Fiber;
let firstCurrentFiberHook: Hook | null = null;
let currentHook: Hook | null = null;

let nextUnitOfWork: Fiber | null = null;

export const createRoot = (root: HTMLElement) => {
    rootFiber = createRootFiber(root);
}

export const render = (startComponent: () => JSX.Element) => {
    const host = createFiberFromTypeAndProps(null, null, null);
    host.tag = HostRoot;
    host.updateQueue = {element: {$$typeof: "Symbol(react.element)", type: startComponent, props: {}, key: null}}

    const hostAlternate = createFiberFromTypeAndProps(null, null, null);
    hostAlternate.tag = HostRoot;
    hostAlternate.updates = true; // Force Update to prevent initial render bailout

    host.alternate = hostAlternate;
    hostAlternate.alternate = host;

    rootFiber.current = host;

    rerender(host);

    hostAlternate.updates = false;
}

const beginWork = (current: Fiber | null, workInProgress: Fiber): Fiber | null => {
    // TODO Reset lanes on workInProgress

    if (current !== null) {
        const oldProps = current.memoizedProps;
        const newProps = workInProgress.pendingProps;

        // Updated by state changes
        if (!current.updates && oldProps === newProps) {
            return attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress);
        }
    }

    switch (workInProgress.tag) {
        case FunctionalComponent:
            return updateFunctionalComponent(current, workInProgress);
        case HostRoot:
            return updateHostRoot(current, workInProgress);
        case HostComponent:
            return updateHostComponent(current, workInProgress);
        case HostText:
            return updateHostText(current, workInProgress);
        default:
            throw Error("Not implemented!");
    }
}


const performUnitOfWork = (unitOfWork: Fiber): Fiber | null => {
    const current = unitOfWork.alternate;
    let next = beginWork(current, unitOfWork);

    // Props are now fully rendered/updated
    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
        next = completeUnitOfWork(unitOfWork);
    }
    return next;
}

const rerender = (work: Fiber) => {
    nextUnitOfWork = work;
    while (nextUnitOfWork !== null) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }

    if (rootFiber.current === null) {
        throw Error("rootFiber.current === null");
    }

    commitRoot(rootFiber.current, rootFiber);
    if (rootFiber.current.alternate === null) {
        throw Error("rootFiber.current.alternate === null");
    }

    // Swap Buffers
    if (rootFiber.finishedWork === null) {
        // First render
        rootFiber.current.alternate.child = rootFiber.current.child;
    } else {
        // Rerender
        const newFinishedWork = rootFiber.current;
        const oldWork = rootFiber.finishedWork;

        rootFiber.finishedWork = newFinishedWork;
        rootFiber.current = oldWork;
    }
}

export const createFiberFromText = (content: string | number): Fiber => {
    return {
        type: null,
        pendingProps: content,
        key: null,
        child: null,
        childUpdates: false,
        updates: false,
        memoizedProps: null,
        memoizedState: null,
        sibling: null,
        return: null,
        tag: HostText,
        alternate: null,
        flags: NoFlags,
        stateNode: null,
        updateQueue: null,
    };
}

export const createFiberFromTypeAndProps = (type: any, key: string | null, pendingProps: any): Fiber => {
    // By default, the tag is functional component. React uses intermediate component (Legacy to class components)
    let tag = FunctionalComponent;
    if (typeof type === "string") {
        tag = HostComponent;
    }
    return {
        type: type,
        pendingProps: pendingProps,
        key: key,
        childUpdates: false,
        updates: false,
        child: null,
        memoizedProps: null,
        memoizedState: null,
        sibling: null,
        return: null,
        tag: tag,
        alternate: null,
        flags: NoFlags,
        stateNode: null,
        updateQueue: null,
    };
}

const createRootFiber = (root: HTMLElement): RootFiber => {
    return {
        containerInfo: root,
        current: null,
        finishedWork: null,
    };
}

const scheduleUpdate = () => {
    if (rootFiber.current === null) {
        throw Error("rootFiber.current === null");
    }
    rerender(rootFiber.current);
};

export const prepareToUseHooks = (fiber: Fiber) => {
    currentFiber = fiber;
    firstCurrentFiberHook = currentFiber.memoizedState as Hook;
    currentHook = null;
}

const resolveOrCreateHook = <T>(initialValue: T): Hook => {
    if (firstCurrentFiberHook === null && currentHook === null) {
        // Initial rendering, first hook
        const newHook: Hook = {state: initialValue, next: null, queue: null};
        currentFiber.memoizedState = newHook;
        firstCurrentFiberHook = currentFiber.memoizedState;
        currentHook = firstCurrentFiberHook;
    } else if (firstCurrentFiberHook && currentHook && currentHook.next === null) {
        // Initial rendering, greater first hook
        const newHook: Hook = {state: initialValue, next: null, queue: null};
        currentHook.next = newHook;
        currentHook = newHook;
    } else if (firstCurrentFiberHook && !currentHook) {
        currentHook = firstCurrentFiberHook;
    } else if (currentHook && currentHook.next) {
        currentHook = currentHook.next;
    } else {
        throw Error("Hooks are messed up :(");
    }

    return updateState(currentHook);
}

export const useState = <T>(initialValue: T): [T, (value: T | ((current: T) => T)) => void] => {
    const hook = resolveOrCreateHook(initialValue);

    const setState = (newValue: T | ((current: T) => T)) => {
        const hookAction: HookAction = {
            action: newValue,
            hasEagerState: typeof newValue !== "function",
            next: null,
        };
        enqueueHookUpdate(hook, hookAction);
        markUpdateLaneFromFiberToRoot(currentFiber);
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

const markUpdateLaneFromFiberToRoot = (fiber: Fiber) => {
    fiber.updates = true;
    let parent = fiber.return;
    while (parent !== null) {
        parent.childUpdates = true;
        parent = parent.return;
    }
}
