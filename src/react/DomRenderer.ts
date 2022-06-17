type Fiber = {
    type: any,
    return: Fiber | null,
    child: Fiber | null,
    sibling: Fiber | null
    pendingProps: any | null,
    memoizedProps: any | null,
    state: State | null,
    key: string | null,
    tag: number | null;
}

type State = {
    state: any,
    next: State | null,
}

const FunctionalComponent = 0;
const HostRoot = 1;
const HostComponent = 2;
const HostText = 3;

let rootElement: HTMLElement;
let rootFiber: Fiber;

export const createRoot = (root: HTMLElement) => {
    rootElement = root;
}

export const render = (startComponent: () => JSX.Element) => {
    rootFiber = createRootFiber();
    rootFiber.child = generateFiberTree(startComponent());
    rootFiber.child.return = rootFiber;

    /**
     * TODO
     * Generate new fiber tree and create diff
     * Store hook data in fiber?
     * Apply diff back to DOM
     */
}

const generateFiberTree = (jsx: JSX.Element): Fiber => {
    const key = jsx.key?.toString() || null;
    const fiber = createFiberFromTypeAndProps(jsx.type, key, jsx.props);

    if (jsx.type) {
        if (typeof jsx.type === "function") {
            fiber.tag = FunctionalComponent;
            const childJsx = jsx.type(jsx.props);
            fiber.child = generateFiberTree(childJsx);
            fiber.child.return = fiber;
        } else {
            fiber.tag = HostComponent;
            if (jsx.props?.children) {
                if (Array.isArray(jsx.props.children)) {
                    const siblings: Fiber[] = jsx.props.children.map((c) => generateFiberTree(c));
                    const firstSibling = siblings[0];
                    fiber.child = firstSibling;
                    firstSibling.return = fiber;
                    siblings.reduce((prev, current, _) => {
                        prev.sibling = current;
                        current.return = fiber;
                        return current;
                    });
                } else {
                    const childFiber = generateFiberTree(jsx.props.children);
                    fiber.child = childFiber;
                    childFiber.return = fiber;
                }
            }
        }
    } else {
        fiber.tag = HostText;
        fiber.memoizedProps = {
            children: jsx
        }
    }

    return fiber;
}

const createFiberFromTypeAndProps = (type: any, key: string | null, pendingProps: any): Fiber => {
    return {
        type: type,
        pendingProps: pendingProps,
        key: key,
        child: null,
        memoizedProps: null,
        state: null,
        sibling: null,
        return: null,
        tag: null,
    };
}

const createRootFiber = (): Fiber => {
    return {
        type: null,
        pendingProps: null,
        key: null,
        child: null,
        memoizedProps: null,
        state: null,
        sibling: null,
        return: null,
        tag: HostRoot,
    };
}


