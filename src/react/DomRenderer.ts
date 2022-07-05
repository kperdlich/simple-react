import {
    attemptEarlyBailoutIfNoScheduledUpdate,
    updateFunctionalComponent,
    updateHostComponent,
    updateHostRoot,
    updateHostText
} from "./recounciler";
import {completeUnitOfWork} from "./CompleteWork";
import {commitPassiveMountEffects, commitPassiveUnmountEffects, commitRoot} from "./CommitPass";
import {NoFlags} from "./Hooks";

export type RootFiber = {
    containerInfo: HTMLElement;
    current: Fiber | null;
}

export type HostState = {
    element: ReactElement;
}

export type EffectQueueState = {
    lastEffect: EffectState | null;
}

export type EffectState = {
    tag: number;
    create: () => (() => void) | undefined;
    deps: any[] | null;
    destroy: (() => void) | null;
    next: EffectState | null;
}

export type Hook = {
    state: any | EffectState,
    next: Hook | null,
    queue: HookAction | null,
}

export type HookAction = {
    action: any,
    hasEagerState: boolean,
    next: HookAction | null,
}

export type Fiber = {
    type: any,
    return: Fiber | null,
    child: Fiber | null,
    deletions: Fiber[] | null,
    sibling: Fiber | null
    childUpdates: boolean, // childLane
    updates: boolean, // lanes
    pendingProps: any | null,
    memoizedProps: any | null,
    memoizedState: Hook | HostState | null,
    key: string | null,
    tag: number | null;
    stateNode: HTMLElement | Text | RootFiber | null;
    updateQueue: HostState | EffectQueueState | any[] | null,
    flags: number;
    alternate: Fiber | null,
}

export type ReactElement = {
    $$typeof: any,
    type: any,
    key: any | null,
    ref: any | null,
    props: any | null,
};

export const PerformedWork = 0b00000000001;
export const Placement = 0b00000000010
export const Update = 0b000000000100;
export const Deletion = 0b000000001000;

export const FunctionalComponent = 0;
export const HostRoot = 3;
export const HostComponent = 5;
export const HostText = 6;

let rootFiber: RootFiber;

let currentFiber: Fiber;

let nextUnitOfWork: Fiber | null = null;

export const createRoot = (root: HTMLElement) => {
    rootFiber = createRootFiber(root);
}

export const render = (startComponent: () => JSX.Element) => {
    const host = createFiberFromTypeAndProps(null, null, null);
    host.tag = HostRoot;
    const element: ReactElement = {
        $$typeof: "Symbol(react.element)",
        type: startComponent,
        props: {},
        key: null,
        ref: null
    };
    host.updateQueue = {element: element};

    const hostAlternate = createFiberFromTypeAndProps(null, null, null);
    hostAlternate.tag = HostRoot;
    hostAlternate.updates = true; // Force Update to prevent initial render bailout

    host.alternate = hostAlternate;
    hostAlternate.alternate = host;

    rootFiber.current = hostAlternate;
    hostAlternate.stateNode = rootFiber;
    host.stateNode = rootFiber;

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

    swapBuffers();

    if (rootFiber.current === null) {
        throw Error("rootFiber.current === null");
    }

    commitRoot(rootFiber.current, rootFiber);
    if (rootFiber.current.alternate === null) {
        throw Error("rootFiber.current.alternate === null");
    }
    commitPassiveUnmountEffects(rootFiber.current);
    commitPassiveMountEffects(rootFiber.current);

    rootFiber.current.alternate.child = rootFiber.current.child; // Points WIP to current first child
}

const swapBuffers = () => {
    const newFinishedWork = rootFiber.current!.alternate;
    rootFiber.current = newFinishedWork;
}

export const createFiberFromText = (content: string | number): Fiber => {
    return {
        type: null,
        pendingProps: content,
        key: null,
        deletions: null,
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
        deletions: null,
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
    };
}

export const scheduleUpdate = () => {
    if (rootFiber.current === null || rootFiber.current.alternate === null) {
        throw Error("rootFiber.current === null");
    }
    rerender(rootFiber.current.alternate);
};



export const setCurrentFiber = (fiber: Fiber) => {
    currentFiber = fiber;
}

export const getCurrentFiber = () => currentFiber;

export const markUpdateLaneFromFiberToRoot = (fiber: Fiber) => {
    fiber.updates = true;

    if (fiber.alternate !== null) {
        fiber.alternate.updates = true;
    }

    let parent = fiber.return;
    while (parent !== null) {
        parent.childUpdates = true;
        if (parent.alternate !== null) {
            parent.alternate.childUpdates = true;
        }
        parent = parent.return;
    }
}
