class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority, tieBreaker = 0) {
        const existingItem = this.items.find((item) => item.element === element);

        if (existingItem) {
            if (priority > existingItem.priority
                || (priority === existingItem.priority && tieBreaker >= existingItem.tieBreaker)) {
                return;
            }

            existingItem.priority = priority;
            existingItem.tieBreaker = tieBreaker;
        } else {
            this.items.push({ element, priority, tieBreaker });
        }

        this.items.sort((itemA, itemB) => itemA.priority - itemB.priority || itemA.tieBreaker - itemB.tieBreaker);
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
