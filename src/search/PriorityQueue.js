class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority) {
        const existingItem = this.items.find((item) => item.element === element);

        if (existingItem) {
            if (priority >= existingItem.priority) {
                return;
            }

            existingItem.priority = priority;
        } else {
            this.items.push({ element, priority });
        }

        this.items.sort((itemA, itemB) => itemA.priority - itemB.priority);
    }

    dequeue() {
        const item = this.items.shift();

        if (item) {
            return item.element;
        } else {
            return null;
        }
    }

    peek() {
        if (this.items.length > 0) {
            return this.items[0].element;
        } else {
            return null;
        }
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
