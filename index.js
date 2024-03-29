class initAsyncQueue {
    #arrayOfGroupedPromises;
    #arrPromises;
    #nbPromGroup;

    constructor(nbPromGroup = 3) {
        this.#nbPromGroup = nbPromGroup;
        this.#arrPromises = [];
    }

    /**
     * Quand on set un array de functions de promises, l'init de la queue se fait auto.
     * @param {() => Promise<*>[]} arrayOfPromises
     */
    set loadArrPromisesAndExecGen(arrayOfPromises) {
        this.#arrPromises = arrayOfPromises;
        this.initGenerator();
    }

    /**
     * Agrége en pile les promises && init le gérérator
     * @returns {void}
     */
    async initGenerator() {
        if (!this.#arrPromises.length) return;

        this.#arrayOfGroupedPromises = this.agregatePromises(this.#arrPromises, this.#nbPromGroup);
        this.gen = this.generator(this.#arrayOfGroupedPromises);
        this.gen.next();

    };

    /**
     * @param {() => Promise<*>[]} arrayOfPromises
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

            if (resultsRejected.length) {
                const errorsArr = resultsRejected.map(({status, reason}) => new Error(`Status: ${status}, reasonError: ${reason}`));
                throw new AggregateError(errorsArr, `${resultsRejected.length} erreur(s) dans la pile index ${index - 1}`);
            }
        } catch (err) {
            console.error(`${err.errors.join(" + ")} ==> ${err.message}`);
        } finally {
            console.info(results);
            this.gen.next();
        }
    }

    /**
     * Groupe les Promises en groupe de n Promises with nbPromisesInStack
     * @param {() => Promise<*>[]} arrFuncsProms
     * @param {number} nbPromisesInStack
     * @returns {() => Promise<*>[][]} arrOfArrPromsGrouped
     */
    agregatePromises(arrFuncsProms, nbPromisesInStack) {
        const arrFuncsPromsCopy = [ ...arrFuncsProms ];
        const arrOfArrPromsGrouped = [];
        let grouped;

        const recursiveGrouping = (nbPromisesInStack) => {
            if (arrFuncsPromsCopy.length > nbPromisesInStack) {
                grouped = arrFuncsPromsCopy.splice(0, nbPromisesInStack);
                arrOfArrPromsGrouped.push(grouped);
                recursiveGrouping(nbPromisesInStack);
            } else {
                grouped = [ ...arrFuncsPromsCopy ];
                arrOfArrPromsGrouped.push(grouped);
            }
        };
        recursiveGrouping(nbPromisesInStack);

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
initAsyncQueueInstance.loadArrPromisesAndExecGen = (arrPromises);