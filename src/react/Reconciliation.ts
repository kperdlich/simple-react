import {
    performUnitOfWork,
} from "./render/BeginWork";
import {commitRoot} from "./commit/CommitChanges";
import {commitPassiveMountEffects, commitPassiveUnmountEffects} from "./commit/CommitEffects";
import {
    createFiberFromTypeAndProps, createRootFiber,
    Fiber,
    HostRoot,
    ReactElement,
    RootFiber
} from "./Fiber";

let rootFiber: RootFiber;
let currentFiber: Fiber;
let nextUnitOfWork: Fiber | null = null;

let isUpdateScheduled = false;
const scheduleTimeoutMs = 5;

interface Root {
    readonly render: (children: JSX.Element) => void;
}

export const createRoot = (root: HTMLElement): Root => {
    rootFiber = createRootFiber(root);
    return {render};
}

const render = (children: JSX.Element) => {
    const host = createFiberFromTypeAndProps(null, null, null);
    host.tag = HostRoot;
    host.updateQueue = {element: children as ReactElement};

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

const workLoop = (work: Fiber) => {
    nextUnitOfWork = work;
    while (nextUnitOfWork !== null) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }
}

const rerender = (work: Fiber) => {
    const startTime = performance.now()

    workLoop(work);

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

    const endTime = performance.now()
    console.log(`Render took ${endTime - startTime} milliseconds`);
}


/**
 * RootFiber current points the current.alternate
 */
const swapBuffers = () => {
    const newFinishedWork = rootFiber.current!.alternate;
    rootFiber.current = newFinishedWork;
}

export const scheduleUpdate = () => {
    if (isUpdateScheduled) return;

    isUpdateScheduled = true
    setTimeout(() => {
        if (rootFiber.current === null || rootFiber.current.alternate === null) {
            throw Error("rootFiber.current === null");
        }
        rerender(rootFiber.current.alternate);
        isUpdateScheduled = false;
    }, scheduleTimeoutMs);
};


export const setCurrentFiber = (fiber: Fiber) => {
    currentFiber = fiber;
}

export const getCurrentFiber = () => currentFiber;