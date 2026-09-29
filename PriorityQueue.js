class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority) {
        this.items.push({ element, priority });
        this.items.sort((itemA, itemB) => itemA.priority - itemB.priority);
    }

    dequeue() {
        const item = this.items.shift();
        return item ? item.element : null;
    }

    peek() {
        return this.items.length > 0 ? this.items[0].element : null;
    }

    isEmpty() {
        return this.items.length === 0;
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }

    contains(element) {
        return this.items.some((item) => item.element === element);
    }

    toArray() {
        return this.items.map((item) => item.element);
    }
}
