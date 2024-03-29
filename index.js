class initAsyncQueue {
    #arrayOfGroupedPromises;
    #arrPromises;
    #nbPromGroup;

    constructor(nbPromGroup = 3) {
        this.#nbPromGroup = nbPromGroup;
        this.#arrPromises = [];
    }

    /**
     * Quand on set un array de functions de promises, l'init du gen se fait auto.
     * @param {() => Promise<*>[]} arrayOfPromises
     */
    set loadArrPromises(arrayOfPromises) {
        this.#arrPromises = arrayOfPromises;
        this.initGenerator();
    }

    /**
     * Init le gérérator
     * @returns {void}
     */
    async initGenerator() {
        if (!this.#arrPromises.length) return;

        this.#arrayOfGroupedPromises = this.agregatePromises(this.#arrPromises, this.#nbPromGroup);
        this.gen = this.generator(this.#arrayOfGroupedPromises);
        this.gen.next();

    };

    /**
     * @param {*} arrayOfPromises
     * @param {?number} index
     */
    async *generator(arrayOfPromises, index = 0) {
        while (index < arrayOfPromises.length) {
            yield await this.execute(arrayOfPromises, index++);
        }
    }

    /**
     * @param {() => Promise<*>[][]} arrayOfPromises
     * @param {?number} index
     */
    async execute(arrayOfPromises, index = 0) {
        try {
            var results = await Promise.allSettled(arrayOfPromises[index++].map((prom) => prom()));
            const resultsRejected = results.filter((promise) => promise.status !== "fulfilled" && promise.reason);
            const errors = resultsRejected.map(promise => ({ indexOrErrInStack: index - 1, promise }));

            if (errors.length) {
                const errorsArr = errors.map(({indexOrErrInStack, promise}) => new Error(`Status: ${promise.status}, reasonError: ${promise.reason}, Erreur dans la pile index ${indexOrErrInStack}`));
                throw new AggregateError(errorsArr, "Erreur dans la queue.");
            }
        } catch (err) {
            console.error(`${err.errors.join(" -- ")}`);
        } finally {
            console.info(results);
            this.gen.next();
        }
    }

    /**
     * Groupe les Promises en groupe de n Promises with nbPromGroup
     * @param {() => Promise<*>[]} arrFuncsProms
     * @param {number} nbPromGroup
     * @returns {() => Promise<*>[][]} arrOfArrPromsGrouped
     */
    agregatePromises(arrFuncsProms, nbPromGroup) {
        const arrFuncsPromsCopy = [ ...arrFuncsProms ];
        const arrOfArrPromsGrouped = [];
        let grouped;

        const recursive = (nbPromGroup) => {
            if (arrFuncsPromsCopy.length > nbPromGroup) {
                grouped = arrFuncsPromsCopy.splice(0, nbPromGroup);
                arrOfArrPromsGrouped.push(grouped);
                recursive(nbPromGroup);
            } else {
                grouped = [ ...arrFuncsPromsCopy ];
                arrOfArrPromsGrouped.push(grouped);
            }
        };
        recursive(nbPromGroup);

        return arrOfArrPromsGrouped;
    }
}

/**
 * @param {?number} time
 * @return {Promise<number>}
 */
function setTime(time = 2000) {
    return new Promise((res, rej) => {
        setTimeout(() => {
            const timeNow = new Date().getTime();
            res(timeNow);
        }, time);
    });
}

const arrPromises = [
    () => setTime(1500),
    () => setTime(750),
    () => setTime(500),

    () => setTime(50),
    () => setTime(5),
    () => Promise.reject("Erreur SQL"),

    () => Promise.reject("Erreur 500"),
    () => setTime(1000),
    () => setTime(2),

    () => setTime(2500),
    () => Promise.reject("Erreur 505"),
    () => Promise.reject("Erreur 502"),

    () => Promise.reject("Erreur 502"),
];

const initAsyncQueueInstance = new initAsyncQueue(4);
initAsyncQueueInstance.loadArrPromises = (arrPromises);