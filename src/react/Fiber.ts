import {NoFlags} from "./hooks/Hooks";

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

export const createRootFiber = (root: HTMLElement): RootFiber => {
    return {
        containerInfo: root,
        current: null,
    };
}

export const createWorkInProgress = (current: Fiber, pendingProps: any): Fiber => {
    let workInProgress = current.alternate;

    if (workInProgress === null) {
        // We use double buffering pooling because we know that we'll only ever need two versions of the tree
        workInProgress = {
            type: current.type,
            pendingProps: pendingProps,
            key: current.key,
            deletions: null,
            childUpdates: current.childUpdates,
            updates: current.updates,
            child: current.child,
            memoizedProps: current.memoizedProps,
            memoizedState: current.memoizedState,
            sibling: current.sibling,
            return: null,
            tag: current.tag,
            alternate: current,
            flags: NoFlags,
            stateNode: current.stateNode,
            updateQueue: current.updateQueue
        };

        current.alternate = workInProgress;

    } else {
        // TODO Copy Tag?
        workInProgress.pendingProps = pendingProps;
        workInProgress.type = current.type;
        workInProgress.flags = NoFlags; // Flags are outdated
        workInProgress.deletions = null;
        workInProgress.childUpdates = current.childUpdates;
        workInProgress.updates = current.updates;
        workInProgress.child = current.child;
        workInProgress.memoizedState = current.memoizedState;
        workInProgress.memoizedProps = current.memoizedProps;
        workInProgress.sibling = current.sibling;
        workInProgress.updateQueue = current.updateQueue;
    }

    return workInProgress;
}