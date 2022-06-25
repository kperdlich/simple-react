import {Fiber, HostComponent, HostText} from "./DomRenderer";

export const commitRoot = (workInProgressRoot: Fiber, container: HTMLElement) => {
    // TODO Trigger commit effects recursive
    insertOrAppendPlacementNodeIntoContainer(workInProgressRoot, container);
}

export const insertOrAppendPlacementNodeIntoContainer = (node: Fiber, parent: HTMLElement) => {
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
